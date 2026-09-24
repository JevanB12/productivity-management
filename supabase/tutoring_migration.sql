-- Add recurring weekly tutoring slots to the existing calendar row
-- Run in Supabase SQL Editor after schema.sql / workout_migration.sql

alter table public.study_calendars
add column if not exists weekly_tutoring jsonb not null default '{}'::jsonb;