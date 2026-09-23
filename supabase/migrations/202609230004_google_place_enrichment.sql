-- Preserve useful Google Places enrichment for entities verified by TravelWish.
-- Existing dataset fields remain the source of truth when Google does not provide a value.

alter table public.accommodation
  add column if not exists google_maps_uri text null,
  add column if not exists google_primary_type text null,
  add column if not exists google_types text[] null,
  add column if not exists google_business_status text null,
  add column if not exists google_opening_hours jsonb null,
  add column if not exists google_address_components jsonb null,
  add column if not exists google_price_level text null,
  add column if not exists google_editorial_summary text null,
  add column if not exists google_photo_names text[] null,
  add column if not exists google_place_data jsonb null,
  add column if not exists google_last_synced_at timestamp with time zone null;

alter table public.attraction
  add column if not exists google_maps_uri text null,
  add column if not exists google_primary_type text null,
  add column if not exists google_types text[] null,
  add column if not exists google_business_status text null,
  add column if not exists google_opening_hours jsonb null,
  add column if not exists google_address_components jsonb null,
  add column if not exists google_price_level text null,
  add column if not exists google_editorial_summary text null,
  add column if not exists google_photo_names text[] null,
  add column if not exists google_place_data jsonb null,
  add column if not exists google_last_synced_at timestamp with time zone null;

alter table public.restaurant
  add column if not exists google_maps_uri text null,
  add column if not exists google_primary_type text null,
  add column if not exists google_types text[] null,
  add column if not exists google_business_status text null,
  add column if not exists google_opening_hours jsonb null,
  add column if not exists google_address_components jsonb null,
  add column if not exists google_price_level text null,
  add column if not exists google_editorial_summary text null,
  add column if not exists google_photo_names text[] null,
  add column if not exists google_place_data jsonb null,
  add column if not exists google_last_synced_at timestamp with time zone null;

create index if not exists accommodation_google_last_synced_at_idx
  on public.accommodation (google_last_synced_at);

create index if not exists attraction_google_last_synced_at_idx
  on public.attraction (google_last_synced_at);

create index if not exists restaurant_google_last_synced_at_idx
  on public.restaurant (google_last_synced_at);
