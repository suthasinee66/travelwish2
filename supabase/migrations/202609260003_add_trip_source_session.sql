alter table public.trips
  add column if not exists source_session_id uuid null;

alter table public.trips
  drop constraint if exists trips_source_session_id_fkey;

alter table public.trips
  add constraint trips_source_session_id_fkey
  foreign key (source_session_id)
  references public.chat_sessions (id)
  on delete set null;

create index if not exists trips_source_session_id_idx
  on public.trips (source_session_id);

comment on column public.trips.source_session_id is
  'Chat session that produced the planner used for this saved trip. Used to recover chat_messages.content and planner_json for export.';
