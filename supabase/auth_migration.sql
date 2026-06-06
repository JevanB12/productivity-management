-- Run in Supabase SQL Editor after the original schema.sql
-- https://supabase.com/dashboard/project/mjiictmhhwbkzflvioam/sql/new

drop policy if exists "study_calendars_anon_all" on public.study_calendars;

-- Old sync_id rows are not tied to auth users; remove before adding FK
delete from public.study_calendars;

alter table public.study_calendars rename column sync_id to user_id;

alter table public.study_calendars
  drop constraint if exists study_calendars_user_id_fkey;

alter table public.study_calendars
  add constraint study_calendars_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

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
