-- Per-project energy cost inflation (% per year)

alter table public.projects
  add column if not exists energy_inflation_pct numeric not null default 5;

comment on column public.projects.energy_inflation_pct is
  'Annual energy / utility bill inflation rate as a percent (e.g. 5 = 5%/yr).';
