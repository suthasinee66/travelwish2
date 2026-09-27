-- Separate learned preference profile for restaurants.
-- Safe to run after 20260927_adaptive_recommendation.sql.

create table if not exists public.user_restaurant_learned_preferences (
  profile_id uuid primary key,
  behavior_vector double precision[] not null
    default array_fill(0::double precision, array[18]),
  explicit_vector double precision[] not null
    default array_fill(0::double precision, array[18]),
  interaction_count integer not null default 0,
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_restaurant_behavior_vector_size
    check (array_length(behavior_vector, 1) = 18),
  constraint user_restaurant_explicit_vector_size
    check (array_length(explicit_vector, 1) = 18)
);

alter table public.user_restaurant_learned_preferences
  enable row level security;

drop policy if exists "Users manage own restaurant learned preferences"
  on public.user_restaurant_learned_preferences;

create policy "Users manage own restaurant learned preferences"
  on public.user_restaurant_learned_preferences
  for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
