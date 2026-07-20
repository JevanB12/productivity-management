-- Fresh install: run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/mjiictmhhwbkzflvioam/sql/new

create table if not exists public.study_calendars (
  user_id uuid primary key references auth.users (id) on delete cascade,
  by_date jsonb not null default '{}'::jsonb,
  backlog jsonb not null default '[]'::jsonb,
  daily_routine jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_calendars enable row level security;

drop policy if exists "study_calendars_select_own" on public.study_calendars;
drop policy if exists "study_calendars_insert_own" on public.study_calendars;
drop policy if exists "study_calendars_update_own" on public.study_calendars;
drop policy if exists "study_calendars_delete_own" on public.study_calendars;
drop policy if exists "study_calendars_anon_all" on public.study_calendars;

create policy "study_calendars_select_own"
  on public.study_calendars
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "study_calendars_insert_own"
  on public.study_calendars
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "study_calendars_update_own"
  on public.study_calendars
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "study_calendars_delete_own"
  on public.study_calendars
  for delete
  to authenticated
  using (auth.uid() = user_id);
