-- Run once in Supabase SQL Editor. Grant annotator access by inserting
-- their auth.users UUID into public.ground_truth_reviewers (from SQL Editor).
create table if not exists public.ground_truth_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ground_truth_reviewers enable row level security;
drop policy if exists "reviewers can read own membership" on public.ground_truth_reviewers;
create policy "reviewers can read own membership" on public.ground_truth_reviewers
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.ground_truth_annotations (
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  case_id integer not null check (case_id between 1 and 7),
  province text not null check (province in ('กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต')),
  att_id text not null,
  relevant boolean not null,
  reason text,
  updated_at timestamptz not null default now(),
  primary key (reviewer_id, case_id, province, att_id)
);
create index if not exists ground_truth_case_province_idx
  on public.ground_truth_annotations(case_id, province);
alter table public.ground_truth_annotations enable row level security;
drop policy if exists "annotators read own annotations" on public.ground_truth_annotations;
create policy "annotators read own annotations" on public.ground_truth_annotations
  for select to authenticated using (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.ground_truth_reviewers r where r.user_id = (select auth.uid()))
  );
drop policy if exists "annotators insert own annotations" on public.ground_truth_annotations;
create policy "annotators insert own annotations" on public.ground_truth_annotations
  for insert to authenticated with check (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.ground_truth_reviewers r where r.user_id = (select auth.uid()))
  );
drop policy if exists "annotators update own annotations" on public.ground_truth_annotations;
create policy "annotators update own annotations" on public.ground_truth_annotations
  for update to authenticated using (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.ground_truth_reviewers r where r.user_id = (select auth.uid()))
  ) with check (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.ground_truth_reviewers r where r.user_id = (select auth.uid()))
  );
drop policy if exists "annotators delete own annotations" on public.ground_truth_annotations;
create policy "annotators delete own annotations" on public.ground_truth_annotations
  for delete to authenticated using (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.ground_truth_reviewers r where r.user_id = (select auth.uid()))
  );
-- Example of approving an existing account (run in SQL Editor only):
-- insert into public.ground_truth_reviewers(user_id) values ('YOUR_AUTH_USER_UUID');
