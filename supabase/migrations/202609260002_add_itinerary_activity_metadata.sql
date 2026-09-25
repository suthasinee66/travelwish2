alter table public.trip_items
  add column if not exists period text null,
  add column if not exists duration_minutes integer null,
  add column if not exists activities text[] null,
  add column if not exists activity_summary text null,
  add column if not exists notes text null,
  add column if not exists time_constraint text null default 'flexible',
  add column if not exists fixed_start_time text null;

alter table public.trip_items
  drop constraint if exists trip_items_time_constraint_check;

alter table public.trip_items
  add constraint trip_items_time_constraint_check
  check (
    time_constraint is null
    or time_constraint in ('flexible', 'fixed')
  );

alter table public.trip_items
  drop constraint if exists trip_items_duration_minutes_check;

alter table public.trip_items
  add constraint trip_items_duration_minutes_check
  check (
    duration_minutes is null
    or (
      duration_minutes >= 1
      and duration_minutes <= 1440
    )
  );

comment on column public.trip_items.period is
  'Loose itinerary period such as Morning, Lunch, Afternoon, Evening, Dinner.';

comment on column public.trip_items.duration_minutes is
  'Estimated time spent at this itinerary stop in minutes. Not a fixed clock time.';

comment on column public.trip_items.activities is
  'Reusable activity suggestions generated when the itinerary is first created.';

comment on column public.trip_items.activity_summary is
  'Short reusable activity summary for cards and offline exports.';

comment on column public.trip_items.notes is
  'Reusable notes that are not tied to a specific route order or clock time.';

comment on column public.trip_items.time_constraint is
  'flexible by default; fixed only for a real confirmed time constraint.';

comment on column public.trip_items.fixed_start_time is
  'Optional confirmed fixed start time. Null for normal flexible itinerary stops.';
