-- =============================================================================
-- Fitness App — Initial Schema (v1)
-- =============================================================================
-- Paste this whole file into the Supabase SQL Editor and run it.
-- It is idempotent-ish: safe to run on a fresh project, will error on re-run
-- (which is what you want — migrations should be applied once).
--
-- What this gives you:
--   • profiles (linked to auth.users, but we fake auth for now)
--   • pt_clients (PT ↔ client relationships)
--   • exercises (global library + per-PT custom)
--   • workouts + workout_exercises (templates)
--   • scheduled_workouts (PT assigns workout to client on a date)
--   • workout_sessions + exercise_sets (what the client actually did)
--   • RLS policies written but disabled — turn on when you add real auth
--   • Seed data: 1 PT, 2 clients, 10 exercises, 2 workouts, some schedule
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type user_role as enum ('pt', 'client');
create type difficulty_level as enum ('beginner', 'intermediate', 'advanced');
create type relationship_status as enum ('active', 'paused', 'ended');
create type scheduled_status as enum ('scheduled', 'completed', 'missed', 'skipped');


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
-- One row per user. Linked 1:1 to auth.users by id. For now we insert rows
-- manually; later, a trigger on auth.users will create these automatically.
create table profiles (
  id            uuid primary key default uuid_generate_v4(),
  role          user_role not null,
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

create index profiles_role_idx on profiles(role);


-- -----------------------------------------------------------------------------
-- 4. pt_clients
-- -----------------------------------------------------------------------------
-- Expresses "PT X coaches Client Y". The source of truth for visibility:
-- PT can only see/edit data for clients they have an active row with here.
create table pt_clients (
  id          uuid primary key default uuid_generate_v4(),
  pt_id       uuid not null references profiles(id) on delete restrict,
  client_id   uuid not null references profiles(id) on delete cascade,
  status      relationship_status not null default 'active',
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A client can only be coached by the same PT once at a time.
  -- (Re-engagement creates a new row after the old one is 'ended'.)
  unique (pt_id, client_id, status)
);

create trigger pt_clients_set_updated_at
  before update on pt_clients
  for each row execute function set_updated_at();

create index pt_clients_pt_id_idx     on pt_clients(pt_id);
create index pt_clients_client_id_idx on pt_clients(client_id);

-- Defensive: a profile's role should match the column it's used in.
-- Enforced via a trigger because CHECK can't reference other tables.
create or replace function validate_pt_client_roles()
returns trigger
language plpgsql
as $$
declare
  pt_role     user_role;
  client_role user_role;
begin
  select role into pt_role     from profiles where id = new.pt_id;
  select role into client_role from profiles where id = new.client_id;

  if pt_role is null or client_role is null then
    raise exception 'pt_id or client_id does not exist in profiles';
  end if;
  if pt_role <> 'pt' then
    raise exception 'pt_id must reference a profile with role=pt (got %)', pt_role;
  end if;
  if client_role <> 'client' then
    raise exception 'client_id must reference a profile with role=client (got %)', client_role;
  end if;
  if new.pt_id = new.client_id then
    raise exception 'pt_id and client_id cannot be the same profile';
  end if;
  return new;
end;
$$;

create trigger pt_clients_validate_roles
  before insert or update on pt_clients
  for each row execute function validate_pt_client_roles();


-- -----------------------------------------------------------------------------
-- 5. exercises
-- -----------------------------------------------------------------------------
-- Hybrid library: created_by NULL = global/system, otherwise = PT's custom.
-- PTs query: where created_by is null or created_by = me.
create table exercises (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text not null,            -- e.g. 'Legs', 'Chest', 'Core'
  muscle_group  text,                      -- optional more specific tag
  description   text,
  image_url     text,
  video_url     text,
  uses_weight   boolean not null default true,
  uses_reps     boolean not null default true,   -- false for time-based (planks etc.)
  created_by    uuid references profiles(id) on delete cascade,  -- null = global
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger exercises_set_updated_at
  before update on exercises
  for each row execute function set_updated_at();

create index exercises_created_by_idx on exercises(created_by);
create index exercises_category_idx   on exercises(category);

-- Global exercises must have unique names; per-PT custom can duplicate
-- a global name ("my version of squat") without clashing.
create unique index exercises_global_name_unique
  on exercises(lower(name))
  where created_by is null;


-- -----------------------------------------------------------------------------
-- 6. workouts (templates)
-- -----------------------------------------------------------------------------
create table workouts (
  id                          uuid primary key default uuid_generate_v4(),
  pt_id                       uuid not null references profiles(id) on delete cascade,
  title                       text not null,
  description                 text,
  category                    text not null,
  difficulty                  difficulty_level not null default 'intermediate',
  estimated_duration_minutes  integer check (estimated_duration_minutes > 0),
  estimated_calories          integer check (estimated_calories >= 0),
  image_url                   text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger workouts_set_updated_at
  before update on workouts
  for each row execute function set_updated_at();

create index workouts_pt_id_idx on workouts(pt_id);


-- -----------------------------------------------------------------------------
-- 7. workout_exercises (the prescription)
-- -----------------------------------------------------------------------------
create table workout_exercises (
  id             uuid primary key default uuid_generate_v4(),
  workout_id     uuid not null references workouts(id) on delete cascade,
  exercise_id    uuid not null references exercises(id) on delete restrict,
  position       integer not null check (position >= 0),
  sets           integer not null check (sets > 0),
  prescription   text not null,            -- "8-12 reps", "AMRAP", "30s", "to failure" — display string
  weight_kg      numeric(6,2) check (weight_kg >= 0),  -- nullable: PT may leave blank
  rest_seconds   integer not null default 60 check (rest_seconds >= 0),
  notes          text,
  created_at     timestamptz not null default now(),

  -- Position must be unique within a workout (stable ordering).
  unique (workout_id, position)
);

create index workout_exercises_workout_id_idx  on workout_exercises(workout_id);
create index workout_exercises_exercise_id_idx on workout_exercises(exercise_id);


-- -----------------------------------------------------------------------------
-- 8. scheduled_workouts (PT assigns workout to client on a date)
-- -----------------------------------------------------------------------------
create table scheduled_workouts (
  id                 uuid primary key default uuid_generate_v4(),
  client_id          uuid not null references profiles(id) on delete cascade,
  assigned_by_pt_id  uuid not null references profiles(id) on delete restrict,
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

create index scheduled_workouts_client_date_idx on scheduled_workouts(client_id, scheduled_date);
create index scheduled_workouts_pt_id_idx       on scheduled_workouts(assigned_by_pt_id);


-- -----------------------------------------------------------------------------
-- 9. workout_sessions (what the client actually did)
-- -----------------------------------------------------------------------------
create table workout_sessions (
  id                     uuid primary key default uuid_generate_v4(),
  scheduled_workout_id   uuid not null references scheduled_workouts(id) on delete cascade,
  client_id              uuid not null references profiles(id) on delete cascade,
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

create index workout_sessions_client_id_idx  on workout_sessions(client_id);
create index workout_sessions_scheduled_idx  on workout_sessions(scheduled_workout_id);


-- -----------------------------------------------------------------------------
-- 10. exercise_sets (per-set logged performance — this is the progress data)
-- -----------------------------------------------------------------------------
create table exercise_sets (
  id                    uuid primary key default uuid_generate_v4(),
  session_id            uuid not null references workout_sessions(id) on delete cascade,
  workout_exercise_id   uuid not null references workout_exercises(id) on delete restrict,
  set_number            integer not null check (set_number > 0),
  reps_completed        integer check (reps_completed >= 0),
  weight_kg_used        numeric(6,2) check (weight_kg_used >= 0),
  rpe                   integer check (rpe between 1 and 10),
  completed_at          timestamptz not null default now(),

  unique (session_id, workout_exercise_id, set_number)
);

create index exercise_sets_session_id_idx           on exercise_sets(session_id);
create index exercise_sets_workout_exercise_id_idx  on exercise_sets(workout_exercise_id);


-- =============================================================================
-- SEED DATA
-- =============================================================================
-- Fake users: 1 PT, 2 clients. Hardcode these IDs in the frontend during
-- dev — pretend you're logged in as one of them via a "dev user switcher".
--
-- When you wire up real auth: delete these rows, create real users via the
-- Supabase Auth UI or signup flow, and a trigger (not included yet) will
-- create profile rows automatically.
-- -----------------------------------------------------------------------------

-- Fixed UUIDs so the frontend can reference them directly during dev.
-- (Generated once — do not change, or your frontend dev switcher will break.)
insert into profiles (id, role, username, display_name, bio) values
  ('11111111-1111-1111-1111-111111111111', 'pt',     'coach_sam',   'Sam Carter',    'Strength & conditioning coach. 10 years experience.'),
  ('22222222-2222-2222-2222-222222222222', 'client', 'alex_j',      'Alex Johnson',  NULL),
  ('33333333-3333-3333-3333-333333333333', 'client', 'jordan_m',    'Jordan Miller', NULL);

-- PT ↔ client relationships
insert into pt_clients (pt_id, client_id) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');

-- Global exercise library (created_by = null)
insert into exercises (id, name, category, muscle_group, uses_weight, uses_reps, image_url) values
  ('a0000001-0000-0000-0000-000000000001', 'Barbell Squat',    'Legs',      'Quads',       true,  true,  'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000002', 'Bench Press',      'Chest',     'Chest',       true,  true,  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000003', 'Deadlift',         'Back',      'Posterior',   true,  true,  'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000004', 'Pull-ups',         'Back',      'Lats',        false, true,  'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000005', 'Overhead Press',   'Shoulders', 'Delts',       true,  true,  'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000006', 'Walking Lunges',   'Legs',      'Quads/Glutes',true,  true,  'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000007', 'Bicep Curls',      'Arms',      'Biceps',      true,  true,  'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000008', 'Tricep Dips',      'Arms',      'Triceps',     false, true,  'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400&q=80'),
  ('a0000001-0000-0000-0000-000000000009', 'Plank',            'Core',      'Core',        false, false, NULL),
  ('a0000001-0000-0000-0000-00000000000a', 'Russian Twists',   'Core',      'Obliques',    false, true,  NULL);

-- Two workout templates created by the PT
insert into workouts (id, pt_id, title, description, category, difficulty, estimated_duration_minutes, estimated_calories) values
  ('b0000001-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Upper Body Power',
   'Compound-focused upper body session. Emphasis on progressive overload.',
   'Strength', 'intermediate', 45, 380),
  ('b0000001-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Core Crusher',
   'Quick core finisher — pair with any session or run standalone.',
   'Strength', 'beginner', 20, 200);

-- Exercises inside "Upper Body Power"
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 0, 4, '6-8',   120),  -- Bench
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 1, 4, '8-10',  90),   -- Pull-ups
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005', 2, 3, '8-10',  90),   -- OHP
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 3, 3, '10-12', 60);   -- Curls

-- Exercises inside "Core Crusher"
insert into workout_exercises (workout_id, exercise_id, position, sets, prescription, rest_seconds) values
  ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000009', 0, 3, '45s',  45),    -- Plank (reps field stores duration for time-based)
  ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-00000000000a', 1, 3, '20',   45);    -- Russian twists

-- A couple of scheduled workouts for Alex (client 1)
-- Using CURRENT_DATE + offsets so the seed stays useful regardless of when you run it.
insert into scheduled_workouts (client_id, assigned_by_pt_id, workout_id, scheduled_date, status) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'b0000001-0000-0000-0000-000000000001', current_date,           'scheduled'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'b0000001-0000-0000-0000-000000000002', current_date + 2,       'scheduled'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'b0000001-0000-0000-0000-000000000001', current_date - 3,       'completed');

-- And one for Jordan (client 2)
insert into scheduled_workouts (client_id, assigned_by_pt_id, workout_id, scheduled_date, status) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'b0000001-0000-0000-0000-000000000002', current_date + 1,       'scheduled');


-- =============================================================================
-- ROW LEVEL SECURITY — WRITTEN BUT DISABLED
-- =============================================================================
-- These policies are the right shape for when you wire up Supabase Auth.
-- DO NOT enable them yet — they will lock out your fake-auth frontend.
--
-- When you're ready:
--   1. Add a trigger on auth.users to auto-insert profiles rows
--   2. Uncomment the `alter table ... enable row level security` lines below
--   3. Uncomment each policy block
--   4. Delete the seeded profiles and create real users via signup
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
-- -----------------------------------------------------------------------------

/*

-- Enable RLS
alter table profiles           enable row level security;
alter table pt_clients         enable row level security;
alter table exercises          enable row level security;
alter table workouts           enable row level security;
alter table workout_exercises  enable row level security;
alter table scheduled_workouts enable row level security;
alter table workout_sessions   enable row level security;
alter table exercise_sets      enable row level security;

-- profiles: you can see your own profile, and profiles of people you have a
-- pt_clients relationship with (either direction).
create policy "read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "read related profiles"
  on profiles for select
  using (
    exists (
      select 1 from pt_clients
      where (pt_id = auth.uid() and client_id = profiles.id)
         or (client_id = auth.uid() and pt_id = profiles.id)
    )
  );

create policy "update own profile"
  on profiles for update
  using (id = auth.uid());

-- pt_clients: PTs manage their own rows; clients can read rows they're in.
create policy "pt manages own relationships"
  on pt_clients for all
  using (pt_id = auth.uid())
  with check (pt_id = auth.uid());

create policy "client reads own relationships"
  on pt_clients for select
  using (client_id = auth.uid());

-- exercises: everyone reads global; PTs manage their own custom.
create policy "read global exercises"
  on exercises for select
  using (created_by is null);

create policy "pt manages own exercises"
  on exercises for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- workouts: PT owns. Clients can read workouts that have been scheduled for them.
create policy "pt manages own workouts"
  on workouts for all
  using (pt_id = auth.uid())
  with check (pt_id = auth.uid());

create policy "client reads scheduled workouts"
  on workouts for select
  using (
    exists (
      select 1 from scheduled_workouts sw
      where sw.workout_id = workouts.id and sw.client_id = auth.uid()
    )
  );

-- workout_exercises: follow the workout's visibility.
create policy "read workout_exercises via workout"
  on workout_exercises for select
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and (
          w.pt_id = auth.uid()
          or exists (
            select 1 from scheduled_workouts sw
            where sw.workout_id = w.id and sw.client_id = auth.uid()
          )
        )
    )
  );

create policy "pt manages workout_exercises"
  on workout_exercises for all
  using (
    exists (select 1 from workouts w where w.id = workout_exercises.workout_id and w.pt_id = auth.uid())
  )
  with check (
    exists (select 1 from workouts w where w.id = workout_exercises.workout_id and w.pt_id = auth.uid())
  );

-- scheduled_workouts: PT manages; client reads own.
create policy "pt manages scheduled_workouts"
  on scheduled_workouts for all
  using (assigned_by_pt_id = auth.uid())
  with check (assigned_by_pt_id = auth.uid());

create policy "client reads own scheduled_workouts"
  on scheduled_workouts for select
  using (client_id = auth.uid());

create policy "client updates own scheduled_workouts status"
  on scheduled_workouts for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- workout_sessions: client owns; PT reads for their clients.
create policy "client manages own sessions"
  on workout_sessions for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "pt reads client sessions"
  on workout_sessions for select
  using (
    exists (
      select 1 from pt_clients
      where pt_clients.client_id = workout_sessions.client_id
        and pt_clients.pt_id = auth.uid()
    )
  );

-- exercise_sets: follow session visibility.
create policy "read exercise_sets via session"
  on exercise_sets for select
  using (
    exists (
      select 1 from workout_sessions s
      where s.id = exercise_sets.session_id
        and (
          s.client_id = auth.uid()
          or exists (
            select 1 from pt_clients pc
            where pc.client_id = s.client_id and pc.pt_id = auth.uid()
          )
        )
    )
  );

create policy "client writes own exercise_sets"
  on exercise_sets for all
  using (
    exists (select 1 from workout_sessions s where s.id = exercise_sets.session_id and s.client_id = auth.uid())
  )
  with check (
    exists (select 1 from workout_sessions s where s.id = exercise_sets.session_id and s.client_id = auth.uid())
  );

*/
