-- ROI: invested-money CAGR + equipment cash/finance loan settings

alter table public.projects
  add column if not exists investment_cagr_pct numeric not null default 5;

alter table public.projects
  add column if not exists payment_mode text not null default 'cash';

alter table public.projects
  add column if not exists loan_down_payment_pct numeric not null default 10;

alter table public.projects
  add column if not exists loan_apr_pct numeric not null default 6.99;

alter table public.projects
  add column if not exists loan_term_years integer not null default 15;

alter table public.projects
  drop constraint if exists projects_payment_mode_check;

alter table public.projects
  add constraint projects_payment_mode_check
  check (payment_mode in ('cash', 'finance'));

comment on column public.projects.investment_cagr_pct is
  'Assumed CAGR (%) for investing the annual bill difference (old − new power bill).';

comment on column public.projects.payment_mode is
  'Equipment payment: cash (full net cost upfront) or finance (down payment + amortizing loan).';

comment on column public.projects.loan_down_payment_pct is
  'Down payment as percent of net system cost when payment_mode = finance.';

comment on column public.projects.loan_apr_pct is
  'Equipment loan APR as a percent (e.g. 6.99 = 6.99%/yr).';

comment on column public.projects.loan_term_years is
  'Equipment loan term in years used for amortization.';
