-- Allow projects to set current monthly bill ($) and usage (kWh)

alter table public.projects
  add column if not exists monthly_bill_usd numeric,
  add column if not exists monthly_usage_kwh numeric,
  add column if not exists rate_usd_per_kwh numeric not null default 0.35;

comment on column public.projects.monthly_bill_usd is
  'User-entered current monthly electric bill in USD; null uses heuristic base.';
comment on column public.projects.monthly_usage_kwh is
  'User-entered current monthly usage in kWh; null derives from bill / rate.';
comment on column public.projects.rate_usd_per_kwh is
  'Blended residential rate used to sync $ <-> kWh.';
