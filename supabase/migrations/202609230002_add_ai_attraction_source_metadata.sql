alter table public.attraction
add column if not exists data_source text not null default 'dataset',
add column if not exists discovered_by_ai boolean not null default false,
add column if not exists ai_model text null,
add column if not exists ai_discovered_at timestamptz null;

update public.attraction
set
  data_source = coalesce(data_source, 'dataset'),
  discovered_by_ai = coalesce(discovered_by_ai, false)
where
  data_source is null
  or discovered_by_ai is null;
