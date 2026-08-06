-- Public share links for spouse-ready project reports (token lookup via service role)

alter table public.projects
  add column if not exists share_token uuid unique,
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_enabled_at timestamptz;

create index if not exists projects_share_token_idx
  on public.projects (share_token)
  where share_token is not null and share_enabled = true;

-- Additional permit / interconnection guides for SEO (additive)
insert into public.permit_jurisdictions (id, slug, name, region) values
  ('a0000000-0000-4000-8000-000000000004', 'los-angeles', 'City of Los Angeles', 'Los Angeles County, CA'),
  ('a0000000-0000-4000-8000-000000000005', 'sce-interconnection', 'SCE Interconnection', 'Southern California'),
  ('a0000000-0000-4000-8000-000000000006', 'san-diego', 'City of San Diego', 'San Diego County, CA')
on conflict (slug) do nothing;

insert into public.permit_steps (jurisdiction_id, sort_order, title, body, link_url, link_label)
select v.jurisdiction_id, v.sort_order, v.title, v.body, v.link_url, v.link_label
from (values
  (
    'a0000000-0000-4000-8000-000000000004'::uuid,
    1,
    'Confirm LADBS solar permit path',
    'Most residential rooftop PV systems in the City of Los Angeles go through LADBS. Confirm whether your project qualifies for streamlined / express solar permitting versus standard plan check.',
    'https://www.ladbs.org/',
    'LADBS'
  ),
  (
    'a0000000-0000-4000-8000-000000000004'::uuid,
    2,
    'Submit plans & electrical one-line',
    'Provide site plan, array layout, structural attachment details, and a one-line diagram. Fire access pathways and Rapid Shutdown labeling are common correction items.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000004'::uuid,
    3,
    'Inspections before utility PTO',
    'Pass final inspection before requesting Permission to Operate from your utility (often SCE or LADWP depending on the parcel).',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000005'::uuid,
    1,
    'Submit SCE interconnection application',
    'Apply for interconnection with Southern California Edison for your inverter/system size. Keep equipment documentation ready (spec sheets, UL listings).',
    'https://www.sce.com/',
    'SCE'
  ),
  (
    'a0000000-0000-4000-8000-000000000005'::uuid,
    2,
    'Net Billing Tariff expectations',
    'Under California Net Billing, export credits are not classic 1:1 retail NEM. Ask your installer what self-consumption assumptions drive the savings chart.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000005'::uuid,
    3,
    'Permission to Operate',
    'Energize export only after SCE issues PTO and local final inspection is complete.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000006'::uuid,
    1,
    'City of San Diego solar building permit',
    'File a residential PV permit with the City Development Services Department. Expedited pathways often exist for standard rooftop systems — confirm current checklist online.',
    'https://www.sandiego.gov/development-services',
    'San Diego DSD'
  ),
  (
    'a0000000-0000-4000-8000-000000000006'::uuid,
    2,
    'Fire setbacks & structural notes',
    'Account for roof access pathways and structural attachment details. Coastal or older roofs may trigger extra review.',
    null,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000006'::uuid,
    3,
    'Inspection then SDG&E interconnection',
    'After final inspection, complete SDG&E interconnection / PTO steps before exporting.',
    null,
    null
  )
) as v(jurisdiction_id, sort_order, title, body, link_url, link_label)
where exists (
  select 1 from public.permit_jurisdictions j where j.id = v.jurisdiction_id
)
and not exists (
  select 1
  from public.permit_steps s
  where s.jurisdiction_id = v.jurisdiction_id
    and s.sort_order = v.sort_order
);
