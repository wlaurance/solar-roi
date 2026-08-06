-- SolarFlow schema: profiles, projects, permits + RLS

create extension if not exists "pgcrypto";

-- Profiles (mirrors auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text not null,
  city text not null default '',
  state text not null default 'CA',
  zip text not null default '',
  lat double precision,
  lng double precision,
  solar boolean not null default true,
  battery boolean not null default true,
  hvac boolean not null default false,
  water boolean not null default false,
  system_kw_base numeric not null default 8.5,
  selected_panel_config_index integer not null default 0,
  solar_insights jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "Users can select own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Permit jurisdictions + steps (public read)
create table public.permit_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null default ''
);

create table public.permit_steps (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.permit_jurisdictions (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  body text not null default '',
  link_url text,
  link_label text
);

create index permit_steps_jurisdiction_idx on public.permit_steps (jurisdiction_id, sort_order);

alter table public.permit_jurisdictions enable row level security;
alter table public.permit_steps enable row level security;

create policy "Permit jurisdictions are publicly readable"
  on public.permit_jurisdictions for select
  using (true);

create policy "Permit steps are publicly readable"
  on public.permit_steps for select
  using (true);

-- Seed Contra Costa / Walnut Creek / PG&E
insert into public.permit_jurisdictions (id, slug, name, region) values
  ('a0000000-0000-4000-8000-000000000001', 'contra-costa', 'Contra Costa County', 'Bay Area, CA'),
  ('a0000000-0000-4000-8000-000000000002', 'walnut-creek', 'City of Walnut Creek', 'Contra Costa County, CA'),
  ('a0000000-0000-4000-8000-000000000003', 'pge', 'PG&E Interconnection', 'Northern California');

insert into public.permit_steps (jurisdiction_id, sort_order, title, body, link_url, link_label) values
  (
    'a0000000-0000-4000-8000-000000000001',
    1,
    'Confirm jurisdiction',
    'Verify whether the property is in unincorporated Contra Costa County or within city limits (Walnut Creek, Concord, etc.). County permits apply only to unincorporated parcels.',
    'https://www.contracosta.ca.gov/5418/Building-Inspection',
    'County Building Inspection'
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    2,
    'Submit building permit application',
    'File a residential solar PV building permit with plans showing array layout, structural attachment details, and one-line electrical diagram. Expedited review is often available for standard rooftop systems under 10–15 kW.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    3,
    'Plan check & corrections',
    'Respond to any plan-check comments (fire setbacks, grounding, Rapid Shutdown labeling). Once approved, pay fees and schedule inspections.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    4,
    'Rough / final inspection',
    'After installation, request final building inspection. Keep the approved permit package on-site for the inspector.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    1,
    'Walnut Creek solar permit',
    'Most rooftop residential solar systems in Walnut Creek qualify for an expedited building permit. Apply through the City online portal with a site plan and electrical one-line.',
    'https://www.walnut-creek.org/departments/community-development/building',
    'WC Building Division'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    2,
    'Fire setbacks & access pathways',
    'Ensure pathways meet California Residential Code / local fire amendments (typically roof-edge and ridge clearances). South-facing arrays at 2225 Stewart Ave should respect ridge and eave clearances.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    3,
    'Schedule inspections',
    'After install, schedule final electrical/building inspection online. Pass inspection before requesting PG&E Permission to Operate (PTO).',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    1,
    'Apply for interconnection (Rule 21)',
    'Submit a PG&E interconnection application for your inverter/system size. For residential NEM / Net Billing Tariff (successor to NEM 2.0 / NEM 3.0 era), use the standard online application.',
    'https://www.pge.com/en/account/service-requests/building-and-renovation/interconnection.html',
    'PG&E Interconnection'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    2,
    'Net Billing Tariff awareness',
    'California''s Net Billing Tariff (often referred to with NEM 3.0 messaging) credits exports at avoided-cost-based rates. Pairing solar with battery storage typically improves self-consumption and bill savings versus export-heavy designs.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    3,
    'Permission to Operate (PTO)',
    'After city/county final inspection and PG&E review, receive Permission to Operate. Do not energize export until PTO is granted.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    4,
    'Final meter / billing setup',
    'Confirm your rate schedule and that the bi-directional meter (or equivalent metering) is correctly reflecting generation and usage.',
    null,
    null
  );
