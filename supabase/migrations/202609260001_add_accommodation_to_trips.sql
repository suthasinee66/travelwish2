alter table public.trips
add column if not exists accommodation jsonb null;

comment on column public.trips.accommodation is
'Selected accommodation snapshot for the saved trip. Stores id, name, address, coordinates, images, source, booking metadata and lock state.';
