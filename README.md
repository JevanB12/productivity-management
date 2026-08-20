# Productivity Management

### Personal Project
A personal productivity web app for planning days, managing routines, and keeping everyday notes in one place.

Built to organise study, workouts, goals, and misc notes without juggling separate apps — with cloud sync so plans stay available across devices when signed in.

---

## Overview

This project is a signed-in web application for day-to-day personal organisation. It combines calendar-style task planning with recurring routines, a weekly workout plan, goal tracking, guitar practice notes, and a general notes space for shopping lists or anything else.

The focus is practical personal use: simple screens, clear lists, and reliable save/sync rather than a large multi-user product.

---

## Features

### Calendar
- Day-by-day task planning
- Work / other task categories
- Backlog support for unscheduled items

### Daily routine
- Repeating time blocks for every day
- Sleep, meals, study, exercise, and similar schedule pieces

### Workouts
- Fixed Monday–Sunday workout plan
- Exercises with sets, reps, weight, and notes
- Full-week view so the whole plan is visible at once

### Goals
- Goals grouped by topic (e.g. lifts, study, habits)
- Optional notes and done/not-done tracking

### Guitar notes
- Song, chord, riff, and practice notes
- Expandable entries for longer chord/tab text

### General notes
- Freeform notes for shopping lists, ideas, reminders — anything

### Accounts & sync
- Email/password and Google sign-in
- Local caching with cloud sync when connected

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Plain CSS with shared design tokens |
| **Auth & cloud** | Supabase Auth + Postgres (JSON columns, RLS) |
| **Local cache** | Browser `localStorage` |

### Architecture notes
- In-app page switching (calendar, routine, workouts, goals, guitar, notes)
- Feature hooks for load / save / sync
- Per-user rows protected with Supabase Row Level Security
- Dual-write pattern: always save locally, debounce cloud updates when configured

---

## Project Context

This is a **personal productivity project**, not coursework.  
It was built for day-to-day organisation (planning, training, goals, and notes) with a focus on a clean UI and cloud-backed persistence.
