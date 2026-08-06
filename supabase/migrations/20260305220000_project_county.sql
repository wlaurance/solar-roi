-- Persist geocoded county + cached LLM county resource links

alter table public.projects
  add column if not exists county text,
  add column if not exists county_links jsonb;

comment on column public.projects.county is
  'County / administrative_area_level_2 from Google Geocoding';
comment on column public.projects.county_links is
  'Cached Gemini/OpenRouter lookup of official county solar & building links';
