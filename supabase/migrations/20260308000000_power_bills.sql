-- Power bill uploads: storage + parse jobs

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'power-bills',
  'power-bills',
  false,
  15728640, -- 15 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.power_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  utility_slug text,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null default 'application/pdf',
  byte_size integer,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  extracted_html text,
  regex_candidates jsonb,
  parsed jsonb,
  error_message text,
  model text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists power_bills_user_id_idx on public.power_bills (user_id);
create index if not exists power_bills_project_id_idx on public.power_bills (project_id);
create index if not exists power_bills_status_idx on public.power_bills (status);

alter table public.power_bills enable row level security;

create policy "Users can select own power bills"
  on public.power_bills for select
  using (auth.uid() = user_id);

create policy "Users can insert own power bills"
  on public.power_bills for insert
  with check (auth.uid() = user_id);

create policy "Users can update own power bills"
  on public.power_bills for update
  using (auth.uid() = user_id);

create policy "Users can delete own power bills"
  on public.power_bills for delete
  using (auth.uid() = user_id);

drop trigger if exists power_bills_set_updated_at on public.power_bills;
create trigger power_bills_set_updated_at
  before update on public.power_bills
  for each row execute function public.set_updated_at();

-- Storage: path must start with the authenticated user id
create policy "Users can upload own power bills"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'power-bills'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own power bills"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'power-bills'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own power bill objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'power-bills'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own power bill objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'power-bills'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.power_bills is
  'Uploaded utility bills with async PDF→HTML→LLM parse status and structured results.';
