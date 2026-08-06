-- Public SEO location pages (counties + cities) with lazily generated AI content

create table public.geo_pages (
  slug text primary key,
  kind text not null check (kind in ('county', 'city')),
  name text not null,
  state text not null,
  state_name text not null default '',
  population integer not null default 0,
  lat double precision,
  lng double precision,
  fips text,
  headline text,
  summary text,
  sections jsonb,
  faqs jsonb,
  model text,
  provider text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index geo_pages_kind_population_idx
  on public.geo_pages (kind, population desc);

create index geo_pages_state_idx on public.geo_pages (state);

alter table public.geo_pages enable row level security;

create policy "Anyone can read geo pages"
  on public.geo_pages for select
  using (true);

-- Writes are service-role only (no insert/update policies for anon/authenticated)

create trigger geo_pages_set_updated_at
  before update on public.geo_pages
  for each row execute function public.set_updated_at();
