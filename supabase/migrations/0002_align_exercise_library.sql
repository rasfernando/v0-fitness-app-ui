-- =============================================================================
-- 0002 — Align exercise library with the WorkoutCalendar's hardcoded list
-- =============================================================================
-- Run this AFTER 0001_initial_schema.sql.
--
-- Why: the WorkoutCalendar component (components/fitness/workout-calendar.tsx)
-- has its own hardcoded list of 18 exercises that the PT picks from when
-- scheduling a single exercise. The "schedule single exercise" mutation
-- looks the exercise up in the DB by name. If the names don't match exactly,
-- scheduling fails.
--
-- Long-term fix: load the calendar's exercise library from the DB so they
-- can't drift. Tracked, but out of scope for this pass.
--
-- This migration:
--   1. Renames a few existing rows so they match the calendar's wording
--   2. Inserts the 8 missing exercises
--
-- Idempotent-ish: each rename uses a WHERE that won't match if already
-- renamed, and the inserts use ON CONFLICT DO NOTHING.
-- =============================================================================

-- 1. Renames to match calendar wording
update exercises set name = 'Pull-Up'      where lower(name) = 'pull-ups'      and created_by is null;
update exercises set name = 'Bicep Curl'   where lower(name) = 'bicep curls'   and created_by is null;
update exercises set name = 'Dumbbell Lunge', muscle_group = 'Quads, Glutes'
  where lower(name) = 'walking lunges' and created_by is null;

-- 2. Add missing exercises that the calendar references but the DB lacks.
-- Using fixed UUIDs for traceability. ON CONFLICT relies on the unique index
-- on lower(name) WHERE created_by is null from migration 0001.
insert into exercises (id, name, category, muscle_group, uses_weight, uses_reps, image_url) values
  ('a0000002-0000-0000-0000-000000000001', 'Incline DB Press',  'Chest',     'Upper Pectorals',   true,  true,  null),
  ('a0000002-0000-0000-0000-000000000002', 'Cable Row',         'Back',      'Mid Back',          true,  true,  null),
  ('a0000002-0000-0000-0000-000000000003', 'Lateral Raise',     'Shoulders', 'Side Deltoids',     true,  true,  null),
  ('a0000002-0000-0000-0000-000000000004', 'Tricep Pushdown',   'Arms',      'Triceps',           true,  true,  null),
  ('a0000002-0000-0000-0000-000000000005', 'Cable Crunch',      'Core',      'Abs',               true,  true,  null),
  ('a0000002-0000-0000-0000-000000000006', 'Leg Press',         'Legs',      'Quads',             true,  true,  null),
  ('a0000002-0000-0000-0000-000000000007', 'Romanian Deadlift', 'Legs',      'Hamstrings',        true,  true,  null),
  ('a0000002-0000-0000-0000-000000000008', 'Face Pull',         'Shoulders', 'Rear Delts',        true,  true,  null),
  ('a0000002-0000-0000-0000-000000000009', 'Hip Thrust',        'Legs',      'Glutes',            true,  true,  null),
  ('a0000002-0000-0000-0000-00000000000a', 'Push-Up',           'Chest',     'Pectorals/Triceps', false, true,  null)
on conflict do nothing;
