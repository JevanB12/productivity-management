-- Add daily routine storage to existing calendar row
-- Run in Supabase SQL Editor after schema.sql

alter table public.study_calendars
add column if not exists daily_routine jsonb not null default '[]'::jsonb;
