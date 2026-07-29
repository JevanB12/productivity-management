-- Add goals storage to existing calendar row
-- Run in Supabase SQL Editor after schema.sql / other migrations

alter table public.study_calendars
add column if not exists goals jsonb not null default '[]'::jsonb;
