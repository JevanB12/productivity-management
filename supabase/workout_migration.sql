-- Add weekly workout plan (Mon–Sun) to existing calendar row
-- Run in Supabase SQL Editor after schema.sql / routine_migration.sql

alter table public.study_calendars
add column if not exists weekly_workouts jsonb not null default '{}'::jsonb;
