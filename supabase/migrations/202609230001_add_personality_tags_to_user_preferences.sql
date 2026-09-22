alter table public.user_preferences
add column if not exists personality_tags text[] not null default '{}';

comment on column public.user_preferences.personality_tags is
'Optional deep-personalization travel behavior and lifestyle tags selected in personal survey.';
