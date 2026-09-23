alter table public.accommodation
  add column if not exists google_place_id text null,
  add column if not exists rating numeric null,
  add column if not exists user_ratings_total integer null,
  add column if not exists data_source text not null default 'dataset'::text,
  add column if not exists source_url text null,
  add column if not exists booking_provider text null,
  add column if not exists discovered_by_ai boolean not null default false,
  add column if not exists ai_model text null,
  add column if not exists ai_discovered_at timestamp with time zone null;

create index if not exists accommodation_google_place_id_idx
  on public.accommodation using btree (google_place_id)
  tablespace pg_default;

create index if not exists accommodation_data_source_idx
  on public.accommodation using btree (data_source)
  tablespace pg_default;
