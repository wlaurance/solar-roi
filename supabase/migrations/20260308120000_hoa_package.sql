-- HOA solar approval package: entitlements, docs, agent chat, presence, notifications

-- Project HOA package fields
alter table public.projects
  add column if not exists hoa_package_unlocked_at timestamptz,
  add column if not exists hoa_package_status text not null default 'not_started',
  add column if not exists hoa_requirements jsonb,
  add column if not exists hoa_application jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_hoa_package_status_check'
  ) then
    alter table public.projects
      add constraint projects_hoa_package_status_check
      check (
        hoa_package_status in (
          'not_started',
          'gathering_docs',
          'extracting',
          'drafting',
          'awaiting_user',
          'ready',
          'submitted'
        )
      );
  end if;
end $$;

comment on column public.projects.hoa_package_unlocked_at is
  'Set when Stripe payment for HOA package succeeds for this project.';
comment on column public.projects.hoa_requirements is
  'Structured HOA solar requirements extracted by the agent.';
comment on column public.projects.hoa_application is
  'Draft HOA architectural application filled by the agent.';

-- One-time payments (Stripe Checkout)
create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  product_code text not null default 'hoa_package',
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists project_payments_user_id_idx
  on public.project_payments (user_id);
create index if not exists project_payments_project_id_idx
  on public.project_payments (project_id);
create unique index if not exists project_payments_paid_hoa_unique
  on public.project_payments (project_id, product_code)
  where status = 'paid' and product_code = 'hoa_package';

alter table public.project_payments enable row level security;

create policy "Users can select own payments"
  on public.project_payments for select
  using (auth.uid() = user_id);

drop trigger if exists project_payments_set_updated_at on public.project_payments;
create trigger project_payments_set_updated_at
  before update on public.project_payments
  for each row execute function public.set_updated_at();

-- HOA document uploads (rules / examples / templates)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hoa-documents',
  'hoa-documents',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.hoa_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'rules'
    check (kind in ('rules', 'examples', 'templates', 'other')),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null default 'application/pdf',
  byte_size integer,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  extracted_text text,
  extracted_summary text,
  parsed jsonb,
  error_message text,
  model text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists hoa_documents_user_id_idx on public.hoa_documents (user_id);
create index if not exists hoa_documents_project_id_idx on public.hoa_documents (project_id);
create index if not exists hoa_documents_status_idx on public.hoa_documents (status);

alter table public.hoa_documents enable row level security;

create policy "Users can select own hoa documents"
  on public.hoa_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own hoa documents"
  on public.hoa_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own hoa documents"
  on public.hoa_documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own hoa documents"
  on public.hoa_documents for delete
  using (auth.uid() = user_id);

drop trigger if exists hoa_documents_set_updated_at on public.hoa_documents;
create trigger hoa_documents_set_updated_at
  before update on public.hoa_documents
  for each row execute function public.set_updated_at();

create policy "Users can upload own hoa documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hoa-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own hoa documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'hoa-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own hoa document objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hoa-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own hoa document objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hoa-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Agent chat messages (Solar bot)
create table if not exists public.hoa_agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  parts jsonb,
  tool_name text,
  created_at timestamptz not null default now()
);

create index if not exists hoa_agent_messages_project_id_created_idx
  on public.hoa_agent_messages (project_id, created_at);

alter table public.hoa_agent_messages enable row level security;

create policy "Users can select own hoa agent messages"
  on public.hoa_agent_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own hoa agent messages"
  on public.hoa_agent_messages for insert
  with check (auth.uid() = user_id);

-- Browser presence heartbeats
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_path text,
  project_id uuid references public.projects (id) on delete set null,
  client_id text,
  updated_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

create policy "Users can select own presence"
  on public.user_presence for select
  using (auth.uid() = user_id);

create policy "Users can upsert own presence"
  on public.user_presence for insert
  with check (auth.uid() = user_id);

create policy "Users can update own presence"
  on public.user_presence for update
  using (auth.uid() = user_id);

-- Email / notification outbox (agent reply ready when user away)
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null default 'hoa_agent_reply'
    check (kind in ('hoa_agent_reply')),
  channel text not null default 'email'
    check (channel in ('email')),
  to_email text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  error_message text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists notification_outbox_dedupe_pending_idx
  on public.notification_outbox (dedupe_key)
  where status = 'pending' and dedupe_key is not null;

create index if not exists notification_outbox_status_idx
  on public.notification_outbox (status, created_at);

alter table public.notification_outbox enable row level security;

create policy "Users can select own notifications"
  on public.notification_outbox for select
  using (auth.uid() = user_id);

comment on table public.hoa_documents is
  'HOA CC&Rs, design guidelines, example packets, and application templates.';
comment on table public.hoa_agent_messages is
  'Solar bot chat history for HOA package assistance on a project.';
comment on table public.user_presence is
  'Last browser heartbeat for presence-aware agent reply emails.';
comment on table public.notification_outbox is
  'Queued transactional emails (e.g. agent reply ready when user is away).';
