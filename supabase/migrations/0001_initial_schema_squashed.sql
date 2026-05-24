-- =============================================================================
-- Fitness App — Consolidated Initial Schema (single-user model)
-- =============================================================================
-- This is the squashed version of migrations 0001–0005. It represents the
-- final single-user schema with RLS enabled and seed data. Apply this once
-- against a fresh Supabase project. The older numbered migrations are kept
-- in the folder for reference but should NOT be applied alongside this one.
--
-- What it gives you:
--   • profiles (1:1 with auth.users; trigger creates row on signup)
--   • exercises (~70 global; user can add their own)
--   • workouts + workout_exercises (8 global starter templates)
--   • scheduled_workouts (user → date → workout)
--   • workout_sessions + exercise_sets (per-set logged performance)
--   • coach_messages (AI coach chat history)
--   • notifications (in-app notifications)
--   • RLS policies enforce "your own rows only" everywhere
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type difficulty_level    as enum ('beginner', 'intermediate', 'advanced');
create type scheduled_status    as enum ('scheduled', 'completed', 'missed', 'skipped');
create type notification_type   as enum (
  'workout_assigned',   -- legacy: kept for backward-compat with existing client code
  'workout_logged',
  'workout_message',
  'coach_message',
  'coach_suggestion'
);


-- -----------------------------------------------------------------------------
-- 2. updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. profiles
-- -----------------------------------------------------------------------------
-- One row per auth.users entry. Created automatically by the handle_new_user
-- trigger below (see section 12).
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. exercises
-- -----------------------------------------------------------------------------
-- created_by NULL = global system library, otherwise = the user's own custom.
create table exercises (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text not null,
  muscle_group  text,
  description   text,
  image_url     text,
  video_url     text,
  uses_weight   boolean not null default true,
  uses_reps     boolean not null default true,
  created_by    uuid references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger exercises_set_updated_at
  before update on exercises
  for each row execute function set_updated_at();

create index exercises_created_by_idx on exercises(created_by);
create index exercises_category_idx   on exercises(category);

-- Global exercises must have unique names; per-user custom can duplicate
-- a global name without clashing.
create unique index exercises_global_name_unique
  on exercises(lower(name))
  where created_by is null;


-- -----------------------------------------------------------------------------
-- 5. workouts (templates)
-- -----------------------------------------------------------------------------
-- user_id NULL = global system starter template, readable by everyone.
-- is_adhoc = a one-off shell created by Quick Log; hidden from the library.
-- is_global = redundant convenience flag (user_id IS NULL is the source of truth).
-- deleted_at = soft delete (exercise_sets FK has on-delete-restrict, so hard
-- delete fails for any workout that's been performed).
create table workouts (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid references profiles(id) on delete cascade,
  title                       text not null,
  description                 text,
  category                    text not null,
  difficulty                  difficulty_level not null default 'intermediate',
  estimated_duration_minutes  integer check (estimated_duration_minutes > 0),
  estimated_calories          integer check (estimated_calories >= 0),
  image_url                   text,
  is_adhoc                    boolean not null default false,
  is_global                   boolean not null default false,
  deleted_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger workouts_set_updated_at
  before update on workouts
  for each row execute function set_updated_at();

create index workouts_user_id_idx on workouts(user_id);


-- -----------------------------------------------------------------------------
-- 6. workout_exercises (the prescription)
-- -----------------------------------------------------------------------------
create table workout_exercises (
  id             uuid primary key default uuid_generate_v4(),
  workout_id     uuid not null references workouts(id) on delete cascade,
  exercise_id    uuid not null references exercises(id) on delete restrict,
  position       integer not null check (position >= 0),
  sets           integer not null check (sets > 0),
  prescription   text not null,
  weight_kg      numeric(6,2) check (weight_kg >= 0),
  rest_seconds   integer not null default 60 check (rest_seconds >= 0),
  notes          text,
  superset_group text,                    -- e.g. "A", "B" — same letter = a circuit
  created_at     timestamptz not null default now(),

  unique (workout_id, position)
);

create index workout_exercises_workout_id_idx  on workout_exercises(workout_id);
create index workout_exercises_exercise_id_idx on workout_exercises(exercise_id);


-- -----------------------------------------------------------------------------
-- 7. scheduled_workouts
-- -----------------------------------------------------------------------------
create table scheduled_workouts (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references profiles(id) on delete cascade,
  workout_id         uuid not null references workouts(id) on delete restrict,
  scheduled_date     date not null,
  status             scheduled_status not null default 'scheduled',
  notes_for_client   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger scheduled_workouts_set_updated_at
  before update on scheduled_workouts
  for each row execute function set_updated_at();

create index scheduled_workouts_user_date_idx on scheduled_workouts(user_id, scheduled_date);


-- -----------------------------------------------------------------------------
-- 8. workout_sessions
-- -----------------------------------------------------------------------------
create table workout_sessions (
  id                     uuid primary key default uuid_generate_v4(),
  scheduled_workout_id   uuid not null references scheduled_workouts(id) on delete cascade,
  user_id                uuid not null references profiles(id) on delete cascade,
  started_at             timestamptz not null default now(),
  completed_at           timestamptz,
  duration_seconds       integer check (duration_seconds >= 0),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger workout_sessions_set_updated_at
  before update on workout_sessions
  for each row execute function set_updated_at();

create index workout_sessions_user_id_idx    on workout_sessions(user_id);
create index workout_sessions_scheduled_idx  on workout_sessions(scheduled_workout_id);


-- -----------------------------------------------------------------------------
-- 9. exercise_sets (per-set logged performance — this IS the progress data)
-- -----------------------------------------------------------------------------
-- prescribed_reps / prescribed_weight_kg snapshot the prescription at the
-- moment the set was logged, so historical views stay accurate even if the
-- template is later edited.
create table exercise_sets (
  id                    uuid primary key default uuid_generate_v4(),
  session_id            uuid not null references workout_sessions(id) on delete cascade,
  workout_exercise_id   uuid not null references workout_exercises(id) on delete restrict,
  set_number            integer not null check (set_number > 0),
  reps_completed        integer check (reps_completed >= 0),
  weight_kg_used        numeric(6,2) check (weight_kg_used >= 0),
  rpe                   integer check (rpe between 1 and 10),
  prescribed_reps       text,
  prescribed_weight_kg  numeric(6,2),
  completed_at          timestamptz not null default now(),

  unique (session_id, workout_exercise_id, set_number)
);

create index exercise_sets_session_id_idx           on exercise_sets(session_id);
create index exercise_sets_workout_exercise_id_idx on exercise_sets(workout_exercise_id);


-- -----------------------------------------------------------------------------
-- 10. coach_messages (AI coach chat history)
-- -----------------------------------------------------------------------------
create table coach_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index coach_messages_user_created_idx
  on coach_messages(user_id, created_at desc);


-- -----------------------------------------------------------------------------
-- 11. notifications (in-app)
-- -----------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  data        jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, created_at desc);


-- -----------------------------------------------------------------------------
-- 12. handle_new_user trigger — auto-create a profile row on signup
-- -----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- =============================================================================
-- 13. Row Level Security
-- =============================================================================
alter table profiles            enable row level security;
alter table exercises           enable row level security;
alter table workouts            enable row level security;
alter table workout_exercises   enable row level security;
alter table scheduled_workouts  enable row level security;
alter table workout_sessions    enable row level security;
alter table exercise_sets       enable row level security;
alter table coach_messages      enable row level security;
alter table notifications       enable row level security;

-- profiles: own only
create policy "select_own_profile" on profiles
  for select using (id = auth.uid());
create policy "insert_own_profile" on profiles
  for insert with check (id = auth.uid());
create policy "update_own_profile" on profiles
  for update using (id = auth.uid());

-- exercises: global readable, own custom manageable
create policy "read_exercises" on exercises
  for select using (created_by is null or created_by = auth.uid());
create policy "insert_own_exercises" on exercises
  for insert with check (created_by = auth.uid());
create policy "update_own_exercises" on exercises
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "delete_own_exercises" on exercises
  for delete using (created_by = auth.uid());

-- workouts: global readable, own manageable
create policy "read_workouts" on workouts
  for select using (user_id is null or user_id = auth.uid());
create policy "insert_own_workouts" on workouts
  for insert with check (user_id = auth.uid());
create policy "update_own_workouts" on workouts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete_own_workouts" on workouts
  for delete using (user_id = auth.uid());

-- workout_exercises: piggy-back on parent workout visibility
create policy "read_workout_exercises" on workout_exercises
  for select using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and (w.user_id is null or w.user_id = auth.uid())
    )
  );
create policy "manage_workout_exercises" on workout_exercises
  for all using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

-- scheduled_workouts: own only
create policy "manage_own_scheduled" on scheduled_workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_sessions: own only
create policy "manage_own_sessions" on workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercise_sets: own (via session ownership)
create policy "manage_own_sets" on exercise_sets
  for all using (
    exists (
      select 1 from workout_sessions s
      where s.id = exercise_sets.session_id
        and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workout_sessions s
      where s.id = exercise_sets.session_id
        and s.user_id = auth.uid()
    )
  );

-- coach_messages: own only
create policy "manage_own_coach_messages" on coach_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: own only
create policy "manage_own_notifications" on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =============================================================================
-- 14. Seed: global exercise library (created_by NULL = visible to all)
-- =============================================================================

insert into exercises (id, name, category, muscle_group, uses_weight, uses_reps, image_url) values
  -- Original 10 (from migration 0001 — names already updated to match calendar)
  ('a0000001-0000-0000-0000-000000000001', 'Barbell Squat',           'Legs',      'Quads',             true,  true,  null),
  ('a0000001-0000-0000-0000-000000000002', 'Bench Press',             'Chest',     'Chest',             true,  true,  null),
  ('a0000001-0000-0000-0000-000000000003', 'Deadlift',                'Back',      'Posterior',         true,  true,  null),
  ('a0000001-0000-0000-0000-000000000004', 'Pull-Up',                 'Back',      'Lats',              false, true,  null),
  ('a0000001-0000-0000-0000-000000000005', 'Overhead Press',          'Shoulders', 'Delts',             true,  true,  null),
  ('a0000001-0000-0000-0000-000000000006', 'Dumbbell Lunge',          'Legs',      'Quads, Glutes',     true,  true,  null),
  ('a0000001-0000-0000-0000-000000000007', 'Bicep Curl',              'Arms',      'Biceps',            true,  true,  null),
  ('a0000001-0000-0000-0000-000000000008', 'Tricep Dips',             'Arms',      'Triceps',           false, true,  null),
  ('a0000001-0000-0000-0000-000000000009', 'Plank',                   'Core',      'Core',              false, false, null),
  ('a0000001-0000-0000-0000-00000000000a', 'Russian Twists',          'Core',      'Obliques',          false, true,  null),

  -- Migration 0002 extras (calendar wording fixes)
  ('a0000002-0000-0000-0000-000000000001', 'Incline DB Press',        'Chest',     'Upper Pectorals',   true,  true,  null),
  ('a0000002-0000-0000-0000-000000000002', 'Cable Row',               'Back',      'Mid Back',          true,  true,  null),
  ('a0000002-0000-0000-0000-000000000003', 'Lateral Raise',           'Shoulders', 'Side Deltoids',     true,  true,  null),
  ('a0000002-0000-0000-0000-000000000004', 'Tricep Pushdown',         'Arms',      'Triceps',           true,  true,  null),
  ('a0000002-0000-0000-0000-000000000005', 'Cable Crunch',            'Core',      'Abs',               true,  true,  null),
  ('a0000002-0000-0000-0000-000000000006', 'Leg Press',               'Legs',      'Quads',             true,  true,  null),
  ('a0000002-0000-0000-0000-000000000007', 'Romanian Deadlift',       'Legs',      'Hamstrings, Glutes',true,  true,  null),
  ('a0000002-0000-0000-0000-000000000008', 'Face Pull',               'Shoulders', 'Rear Delts',        true,  true,  null),
  ('a0000002-0000-0000-0000-000000000009', 'Hip Thrust',              'Legs',      'Glutes',            true,  true,  null),
  ('a0000002-0000-0000-0000-00000000000a', 'Push-Up',                 'Chest',     'Pectorals/Triceps', false, true,  null),

  -- Migration 0003 broad library
  ('a0000003-0000-0000-0000-000000000001', 'Barbell Back Squat',           'Legs',      'Quads, Glutes',       true,  true,  null),
  ('a0000003-0000-0000-0000-000000000002', 'Front Squat',                  'Legs',      'Quads',               true,  true,  null),
  ('a0000003-0000-0000-0000-000000000003', 'Goblet Squat',                 'Legs',      'Quads, Glutes',       true,  true,  null),
  ('a0000003-0000-0000-0000-000000000005', 'Hack Squat',                   'Legs',      'Quads',               true,  true,  null),
  ('a0000003-0000-0000-0000-000000000010', 'Conventional Deadlift',        'Back',      'Posterior Chain',     true,  true,  null),
  ('a0000003-0000-0000-0000-000000000012', 'Sumo Deadlift',                'Back',      'Posterior Chain',     true,  true,  null),
  ('a0000003-0000-0000-0000-000000000013', 'Single-Leg Romanian Deadlift', 'Legs',      'Hamstrings, Glutes',  true,  true,  null),
  ('a0000003-0000-0000-0000-000000000014', 'Kettlebell Swing',             'Legs',      'Posterior Chain',     true,  true,  null),
  ('a0000003-0000-0000-0000-000000000015', 'Good Morning',                 'Legs',      'Hamstrings, Lower Back', true, true, null),
  ('a0000003-0000-0000-0000-000000000020', 'Walking Lunge',                'Legs',      'Quads, Glutes',       true,  true,  null),
  ('a0000003-0000-0000-0000-000000000021', 'Reverse Lunge',                'Legs',      'Quads, Glutes',       true,  true,  null),
  ('a0000003-0000-0000-0000-000000000022', 'Bulgarian Split Squat',        'Legs',      'Quads, Glutes',       true,  true,  null),
  ('a0000003-0000-0000-0000-000000000023', 'Step-Up',                      'Legs',      'Quads, Glutes',       true,  true,  null),
  ('a0000003-0000-0000-0000-000000000030', 'Leg Extension',                'Legs',      'Quads',               true,  true,  null),
  ('a0000003-0000-0000-0000-000000000031', 'Leg Curl',                     'Legs',      'Hamstrings',          true,  true,  null),
  ('a0000003-0000-0000-0000-000000000033', 'Glute Bridge',                 'Legs',      'Glutes',              true,  true,  null),
  ('a0000003-0000-0000-0000-000000000034', 'Calf Raise',                   'Legs',      'Calves',              true,  true,  null),
  ('a0000003-0000-0000-0000-000000000040', 'Barbell Bench Press',          'Chest',     'Chest',               true,  true,  null),
  ('a0000003-0000-0000-0000-000000000041', 'Incline Bench Press',          'Chest',     'Upper Chest',         true,  true,  null),
  ('a0000003-0000-0000-0000-000000000042', 'Dumbbell Bench Press',         'Chest',     'Chest',               true,  true,  null),
  ('a0000003-0000-0000-0000-000000000044', 'Dumbbell Fly',                 'Chest',     'Chest',               true,  true,  null),
  ('a0000003-0000-0000-0000-000000000050', 'Barbell Row',                  'Back',      'Mid Back, Lats',      true,  true,  null),
  ('a0000003-0000-0000-0000-000000000051', 'Dumbbell Row',                 'Back',      'Mid Back, Lats',      true,  true,  null),
  ('a0000003-0000-0000-0000-000000000052', 'Seated Cable Row',             'Back',      'Mid Back',            true,  true,  null),
  ('a0000003-0000-0000-0000-000000000053', 'T-Bar Row',                    'Back',      'Mid Back',            true,  true,  null),
  ('a0000003-0000-0000-0000-000000000054', 'Inverted Row',                 'Back',      'Mid Back',            false, true,  null),
  ('a0000003-0000-0000-0000-000000000060', 'Dumbbell Shoulder Press',      'Shoulders', 'Deltoids',            true,  true,  null),
  ('a0000003-0000-0000-0000-000000000061', 'Arnold Press',                 'Shoulders', 'Deltoids',            true,  true,  null),
  ('a0000003-0000-0000-0000-000000000062', 'Push Press',                   'Shoulders', 'Deltoids, Triceps',   true,  true,  null),
  ('a0000003-0000-0000-0000-000000000070', 'Chin-Up',                      'Back',      'Lats, Biceps',        true,  true,  null),
  ('a0000003-0000-0000-0000-000000000071', 'Lat Pulldown',                 'Back',      'Lats',                true,  true,  null),
  ('a0000003-0000-0000-0000-000000000072', 'Single-Arm Lat Pulldown',      'Back',      'Lats',                true,  true,  null),
  ('a0000003-0000-0000-0000-000000000080', 'Rear Delt Fly',                'Shoulders', 'Rear Delts',          true,  true,  null),
  ('a0000003-0000-0000-0000-000000000082', 'Upright Row',                  'Shoulders', 'Deltoids',            true,  true,  null),
  ('a0000003-0000-0000-0000-000000000090', 'Barbell Curl',                 'Arms',      'Biceps',              true,  true,  null),
  ('a0000003-0000-0000-0000-000000000091', 'Dumbbell Curl',                'Arms',      'Biceps',              true,  true,  null),
  ('a0000003-0000-0000-0000-000000000092', 'Hammer Curl',                  'Arms',      'Biceps, Forearms',    true,  true,  null),
  ('a0000003-0000-0000-0000-000000000093', 'Preacher Curl',                'Arms',      'Biceps',              true,  true,  null),
  ('a0000003-0000-0000-0000-0000000000a0', 'Skull Crusher',                'Arms',      'Triceps',             true,  true,  null),
  ('a0000003-0000-0000-0000-0000000000a2', 'Close-Grip Bench Press',       'Arms',      'Triceps, Chest',      true,  true,  null),
  ('a0000003-0000-0000-0000-0000000000b0', 'Side Plank',                   'Core',      'Obliques',            false, false, null),
  ('a0000003-0000-0000-0000-0000000000b1', 'Dead Bug',                     'Core',      'Core',                false, true,  null),
  ('a0000003-0000-0000-0000-0000000000b2', 'Bird Dog',                     'Core',      'Core, Lower Back',    false, true,  null),
  ('a0000003-0000-0000-0000-0000000000b3', 'Ab Wheel Rollout',             'Core',      'Core',                false, true,  null),
  ('a0000003-0000-0000-0000-0000000000b4', 'Hanging Leg Raise',            'Core',      'Lower Abs',           false, true,  null),
  ('a0000003-0000-0000-0000-0000000000c0', 'Farmer''s Carry',              'Full Body', 'Full Body',           true,  false, null),
  ('a0000003-0000-0000-0000-0000000000c1', 'Suitcase Carry',               'Full Body', 'Core, Grip',          true,  false, null),
  ('a0000003-0000-0000-0000-0000000000c2', 'Turkish Get-Up',               'Full Body', 'Full Body',           true,  true,  null),
  ('a0000003-0000-0000-0000-0000000000d0', 'Assault Bike',                 'Cardio',    'Full Body',           false, false, null),
  ('a0000003-0000-0000-0000-0000000000d1', 'Rowing Machine',               'Cardio',    'Full Body',           false, false, null),
  ('a0000003-0000-0000-0000-0000000000d2', 'Battle Ropes',                 'Cardio',    'Full Body',           false, false, null),
  ('a0000003-0000-0000-0000-0000000000d3', 'Burpees',                      'Cardio',    'Full Body',           false, true,  null),
  ('a0000003-0000-0000-0000-0000000000e0', 'World''s Greatest Stretch',    'Mobility',  'Full Body',           false, true,  null),
  ('a0000003-0000-0000-0000-0000000000e1', 'Cat-Cow',                      'Mobility',  'Spine',               false, true,  null),
  ('a0000003-0000-0000-0000-0000000000e2', '90/90 Hip Rotation',           'Mobility',  'Hips',                false, true,  null),
  ('a0000003-0000-0000-0000-0000000000e3', 'Thoracic Spine Rotation',      'Mobility',  'Upper Back',          false, true,  null);


-- =============================================================================
-- 15. Seed: 8 global workout templates (user_id NULL = system templates)
-- =============================================================================

insert into workouts (id, user_id, title, description, category, difficulty, estimated_duration_minutes, estimated_calories, is_global) values
  ('b0000002-0000-0000-0000-000000000001', null,
   'Full Body Foundations',
   'A beginner-friendly full-body session focused on foundational compound movements. Good for a return-from-break week.',
   'Strength', 'beginner', 45, 350, true),

  ('b0000002-0000-0000-0000-000000000002', null,
   'Upper Body Power',
   'Strength-focused upper body day. Heavy compounds, lower reps, longer rest. Progressive overload is the goal.',
   'Strength', 'intermediate', 50, 400, true),

  ('b0000002-0000-0000-0000-000000000003', null,
   'Lower Body Power',
   'Strength-focused lower body day. Heavy squat and hinge patterns, then accessory work for stability and balance.',
   'Strength', 'intermediate', 55, 450, true),

  ('b0000002-0000-0000-0000-000000000004', null,
   'Push Day (Hypertrophy)',
   'Volume-focused chest, shoulders and triceps session. Moderate weights, higher reps, shorter rest between sets.',
   'Strength', 'intermediate', 60, 450, true),

  ('b0000002-0000-0000-0000-000000000005', null,
   'Pull Day (Hypertrophy)',
   'Volume-focused back and biceps session. Mix of vertical and horizontal pulling, plus rear delt and arm work.',
   'Strength', 'intermediate', 60, 450, true),

  ('b0000002-0000-0000-0000-000000000006', null,
   'Leg Day (Volume)',
   'Higher-volume leg session with unilateral work. Builds on the power day by adding time under tension and balance.',
   'Strength', 'intermediate', 60, 500, true),

  ('b0000002-0000-0000-0000-000000000007', null,
   'Core & Conditioning',
   'Short, high-intensity core and cardio session. Good as a standalone or tacked onto the end of another workout.',
   'Strength', 'beginner', 30, 250, true),

  ('b0000002-0000-0000-0000-000000000008', null,
   'Mobility & Recovery',
   'Low-intensity mobility flow for rest days, warm-ups, or post-session cooldowns. No equipment needed.',
   'Mobility', 'beginner', 20, 80, true);


-- ── workout_exercises (looked up by name to keep the seed readable) ─────

-- 1. Full Body Foundations
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Goblet Squat'      and created_by is null), 0, 3, '10-12', 60),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Push-Up'           and created_by is null), 1, 3, '8-12',  60),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Dumbbell Row'      and created_by is null), 2, 3, '10',    60),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Romanian Deadlift' and created_by is null), 3, 3, '10',    75),
  ('b0000002-0000-0000-0000-000000000001', (select id from exercises where name = 'Plank'             and created_by is null), 4, 3, '30s',   45);

-- 2. Upper Body Power
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Barbell Bench Press' and created_by is null), 0, 4, '5',     150),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Barbell Row'         and created_by is null), 1, 4, '5',     120),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Overhead Press'      and created_by is null), 2, 3, '6',     120),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Chin-Up'             and created_by is null), 3, 3, 'AMRAP', 120),
  ('b0000002-0000-0000-0000-000000000002', (select id from exercises where name = 'Barbell Curl'        and created_by is null), 4, 3, '8',     75);

-- 3. Lower Body Power
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Barbell Back Squat'    and created_by is null), 0, 4, '5',  180),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Romanian Deadlift'     and created_by is null), 1, 4, '6',  150),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Bulgarian Split Squat' and created_by is null), 2, 3, '8',  90),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Leg Curl'              and created_by is null), 3, 3, '10', 60),
  ('b0000002-0000-0000-0000-000000000003', (select id from exercises where name = 'Calf Raise'            and created_by is null), 4, 4, '12', 45);

-- 4. Push Day (Hypertrophy)
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Incline Bench Press'     and created_by is null), 0, 4, '8',  90),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Dumbbell Shoulder Press' and created_by is null), 1, 3, '10', 75),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Dumbbell Fly'            and created_by is null), 2, 3, '12', 60),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Tricep Pushdown'         and created_by is null), 3, 3, '12', 60),
  ('b0000002-0000-0000-0000-000000000004', (select id from exercises where name = 'Lateral Raise'           and created_by is null), 4, 4, '15', 45);

-- 5. Pull Day (Hypertrophy)
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Pull-Up'          and created_by is null), 0, 4, '8',  90),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Seated Cable Row' and created_by is null), 1, 4, '10', 75),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Lat Pulldown'     and created_by is null), 2, 3, '12', 60),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Face Pull'        and created_by is null), 3, 3, '15', 45),
  ('b0000002-0000-0000-0000-000000000005', (select id from exercises where name = 'Hammer Curl'      and created_by is null), 4, 3, '12', 60);

-- 6. Leg Day (Volume)
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Front Squat'    and created_by is null), 0, 4, '8',  120),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Walking Lunge'  and created_by is null), 1, 3, '12', 75),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Leg Press'      and created_by is null), 2, 4, '12', 75),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Hip Thrust'     and created_by is null), 3, 3, '12', 75),
  ('b0000002-0000-0000-0000-000000000006', (select id from exercises where name = 'Leg Extension'  and created_by is null), 4, 3, '15', 45);

-- 7. Core & Conditioning
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Plank'             and created_by is null), 0, 3, '45s',                   30),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Dead Bug'          and created_by is null), 1, 3, '10',                    30),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Hanging Leg Raise' and created_by is null), 2, 3, '12',                    45),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Russian Twists'    and created_by is null), 3, 3, '20',                    30),
  ('b0000002-0000-0000-0000-000000000007', (select id from exercises where name = 'Assault Bike'      and created_by is null), 4, 5, '1 min on / 1 min off', 60);

-- 8. Mobility & Recovery
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = 'World''s Greatest Stretch' and created_by is null), 0, 2, '5 per side',  15),
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = 'Cat-Cow'                   and created_by is null), 1, 2, '10',          15),
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = '90/90 Hip Rotation'        and created_by is null), 2, 2, '8 per side',  15),
  ('b0000002-0000-0000-0000-000000000008', (select id from exercises where name = 'Thoracic Spine Rotation'   and created_by is null), 3, 2, '10 per side', 15);
