alter table public.restaurant
add column if not exists google_place_id text;

create index if not exists restaurant_google_place_id_idx
on public.restaurant (google_place_id);
