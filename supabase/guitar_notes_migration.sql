-- Add guitar notes storage to existing calendar row
-- Run in Supabase SQL Editor after schema.sql / other migrations

alter table public.study_calendars
add column if not exists guitar_notes jsonb not null default '[]'::jsonb;
