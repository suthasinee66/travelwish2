alter table public.trip_items
  drop constraint if exists trip_items_time_constraint_check;

alter table public.trip_items
  drop column if exists time_constraint,
  drop column if exists fixed_start_time;
