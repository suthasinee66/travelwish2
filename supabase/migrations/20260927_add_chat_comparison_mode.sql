alter table public.chat_sessions
add column if not exists comparison_mode boolean not null default false;

create index if not exists chat_sessions_comparison_mode_idx
on public.chat_sessions (comparison_mode);
