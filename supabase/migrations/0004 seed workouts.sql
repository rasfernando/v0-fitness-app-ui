-- =============================================================================
-- 0004 — Seed template workouts
-- =============================================================================
-- Run this AFTER 0003.
--
-- Creates 8 workouts owned by Sam Carter (the seeded PT) and populates their
-- workout_exercises rows. These are starter templates the PT can duplicate,
-- edit, or ignore — they exist so the library isn't empty on first look.
--
-- All exercise_ids are looked up by name via subquery. If any lookup fails,
-- the whole migration rolls back (the inserts reference nulls → violation).
--
-- Idempotent: on conflict do nothing means re-running is safe.
-- =============================================================================

-- ── Workouts: 8 templates, fixed UUIDs for stable reruns ─────────────────
insert into workouts (id, pt_id, title, description, category, difficulty, estimated_duration_minutes, estimated_calories) values

  ('b0000002-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Full Body Foundations',
   'A beginner-friendly full-body session focused on foundational compound movements. Good for new clients or a return-from-break week.',
   'Strength', 'beginner', 45, 350),

  ('b0000002-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Upper Body Power',
   'Strength-focused upper body day. Heavy compounds, lower reps, longer rest. Progressive overload is the goal.',
   'Strength', 'intermediate', 50, 400),

  ('b0000002-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Lower Body Power',
   'Strength-focused lower body day. Heavy squat and hinge patterns, then accessory work for stability and balance.',
   'Strength', 'intermediate', 55, 450),

  ('b0000002-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111',
   'Push Day (Hypertrophy)',
   'Volume-focused chest, shoulders and triceps session. Moderate weights, higher reps, shorter rest between sets.',
   'Strength', 'intermediate', 60, 450),

  ('b0000002-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   'Pull Day (Hypertrophy)',
   'Volume-focused back and biceps session. Mix of vertical and horizontal pulling, plus rear delt and arm work.',
   'Strength', 'intermediate', 60, 450),

  ('b0000002-0000-0000-0000-000000000006',
   '11111111-1111-1111-1111-111111111111',
   'Leg Day (Volume)',
   'Higher-volume leg session with unilateral work. Builds on the power day by adding time under tension and balance.',
   'Strength', 'intermediate', 60, 500),

  ('b0000002-0000-0000-0000-000000000007',
   '11111111-1111-1111-1111-111111111111',
   'Core & Conditioning',
   'Short, high-intensity core and cardio session. Good as a standalone or tacked onto the end of another workout.',
   'Strength', 'beginner', 30, 250),

  ('b0000002-0000-0000-0000-000000000008',
   '11111111-1111-1111-1111-111111111111',
   'Mobility & Recovery',
   'Low-intensity mobility flow for rest days, warm-ups, or post-session cooldowns. No equipment needed.',
   'Mobility', 'beginner', 20, 80)

on conflict (id) do nothing;


-- ── Workout exercises ─────────────────────────────────────────────────────
-- Each insert uses a subquery to look up the exercise by name. If any name
-- doesn't match, the subquery returns NULL and the insert fails — that's
-- intentional, so we catch mismatches loudly.

-- ── 1. Full Body Foundations ────────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Goblet Squat'      and created_by is null), 0, 3, '10-12', 60),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Push-Up'           and created_by is null), 1, 3, '8-12',  60),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Dumbbell Row'      and created_by is null), 2, 3, '10',    60),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Romanian Deadlift' and created_by is null), 3, 3, '10',    75),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Plank'             and created_by is null), 4, 3, '30s',   45)
on conflict do nothing;

-- ── 2. Upper Body Power ─────────────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Barbell Bench Press' and created_by is null), 0, 4, '5',     150),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Barbell Row'         and created_by is null), 1, 4, '5',     120),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Overhead Press'      and created_by is null), 2, 3, '6',     120),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Chin-Up'             and created_by is null), 3, 3, 'AMRAP', 120),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Barbell Curl'        and created_by is null), 4, 3, '8',     75)
on conflict do nothing;

-- ── 3. Lower Body Power ─────────────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Barbell Back Squat'    and created_by is null), 0, 4, '5',  180),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Romanian Deadlift'     and created_by is null), 1, 4, '6',  150),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Bulgarian Split Squat' and created_by is null), 2, 3, '8',  90),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Leg Curl'              and created_by is null), 3, 3, '10', 60),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Calf Raise'            and created_by is null), 4, 4, '12', 45)
on conflict do nothing;

-- ── 4. Push Day (Hypertrophy) ───────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Incline Bench Press'     and created_by is null), 0, 4, '8',  90),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Dumbbell Shoulder Press' and created_by is null), 1, 3, '10', 75),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Dumbbell Fly'            and created_by is null), 2, 3, '12', 60),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Tricep Pushdown'         and created_by is null), 3, 3, '12', 60),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Lateral Raise'           and created_by is null), 4, 4, '15', 45)
on conflict do nothing;

-- ── 5. Pull Day (Hypertrophy) ───────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Pull-Up'          and created_by is null), 0, 4, '8',  90),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Seated Cable Row' and created_by is null), 1, 4, '10', 75),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Lat Pulldown'     and created_by is null), 2, 3, '12', 60),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Face Pull'        and created_by is null), 3, 3, '15', 45),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Hammer Curl'      and created_by is null), 4, 3, '12', 60)
on conflict do nothing;

-- ── 6. Leg Day (Volume) ─────────────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Front Squat'    and created_by is null), 0, 4, '8',  120),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Walking Lunge'  and created_by is null), 1, 3, '12', 75),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Leg Press'      and created_by is null), 2, 4, '12', 75),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Hip Thrust'     and created_by is null), 3, 3, '12', 75),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Leg Extension'  and created_by is null), 4, 3, '15', 45)
on conflict do nothing;

-- ── 7. Core & Conditioning ──────────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Plank'             and created_by is null), 0, 3, '45s',                   30),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Dead Bug'          and created_by is null), 1, 3, '10',                    30),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Hanging Leg Raise' and created_by is null), 2, 3, '12',                    45),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Russian Twists'    and created_by is null), 3, 3, '20',                    30),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Assault Bike'      and created_by is null), 4, 5, '1 min on / 1 min off', 60)
on conflict do nothing;

-- ── 8. Mobility & Recovery ──────────────────────────────────────────────
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = 'World''s Greatest Stretch' and created_by is null), 0, 2, '5 per side',  15),
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = 'Cat-Cow'                   and created_by is null), 1, 2, '10',          15),
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = '90/90 Hip Rotation'        and created_by is null), 2, 2, '8 per side',  15),
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = 'Thoracic Spine Rotation'   and created_by is null), 3, 2, '10 per side', 15)
on conflict do nothing;
