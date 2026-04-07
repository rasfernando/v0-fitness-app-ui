# Fitness App

A PT-and-client fitness app. Personal trainers schedule workouts for their
clients; clients work through them and log progress. Currently an MVP wired
to Supabase, with fake auth (a dev user switcher) until real auth is added.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + auth, auth deferred)
- TypeScript

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a Supabase project

1. Go to <https://supabase.com> and create a new project (free tier is fine).
2. Once it's ready, open the **SQL Editor**.
3. Open `supabase/migrations/0001_initial_schema.sql` from this repo, copy the
   whole file, paste it into the SQL editor, and click **Run**.
4. Verify in the Table Editor that you have 8 tables and the `profiles` table
   has 3 rows (Sam Carter, Alex Johnson, Jordan Miller).

### 3. Set environment variables

```bash
cp .env.local.example .env.local
```

Then fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
from your Supabase project's **Settings → API** page.

### 4. Run

```bash
pnpm dev
```

Open <http://localhost:3000>. You'll see a floating "🧪 Sam Carter (pt)"
button in the bottom-right — click it to switch between the seeded users.

## Dev user switcher

While real auth is deferred, the app uses a hardcoded "dev user" picker.
The three seeded users are:

| User           | Role   | What you'll see                          |
| -------------- | ------ | ---------------------------------------- |
| Sam Carter     | PT     | Roster of Alex + Jordan, per-client cal  |
| Alex Johnson   | Client | Dashboard with their scheduled workouts  |
| Jordan Miller  | Client | Dashboard with their scheduled workouts  |

Switching user persists across reloads via localStorage.

When real auth lands, delete `lib/dev-user.tsx`,
`components/dev/dev-user-switcher.tsx`, and the imports in `app/layout.tsx`.
The hooks in `lib/hooks/` will need their `useDevUser()` calls swapped for a
Supabase `useUser()` equivalent — that's it.

## What's wired up vs what's still mocked

### Real (reads from Supabase)

- Client dashboard's scheduled-workouts list and calendar
- PT's client roster
- PT's per-client schedule view (when you tap into a client)
- All schedule counts and stats

### Still mocked / in-memory only

- **PT mutations** — scheduling, removing, adding clients all update local
  React state but DO NOT persist. Refresh the page and changes vanish.
  See the boundary comment at the top of `pt-coach-screen.tsx`.
- **Auth** — entirely fake; the dev user switcher is the whole auth system.
- **Workout library** in PT view — `libraryWorkouts` constant in `pt-coach-screen.tsx`.
- **Exercise library** in PT builder — `exerciseLibrary` constant in `pt-builder-screen.tsx`.
- **Workout detail screen** — uses hardcoded `exerciseData` constant.
- **Workout player** — purely UI, doesn't log actual sets to `exercise_sets`.
- **Dashboard "featured workouts"** — hardcoded array.
- **Profile, Progress, Build screens** — placeholder "coming soon" stubs.
- **The user's name "Sarah" in the dashboard header** — hardcoded.

## Schema

See `supabase/migrations/0001_initial_schema.sql`. Eight tables:

- `profiles` — one per user, role = pt or client
- `pt_clients` — PT ↔ client relationships
- `exercises` — global library + per-PT custom (created_by null = global)
- `workouts` — workout templates owned by a PT
- `workout_exercises` — the prescription (sets/reps/rest per exercise)
- `scheduled_workouts` — PT assigns workout to client on a date
- `workout_sessions` — record of a client actually doing a workout
- `exercise_sets` — per-set logged performance (this is the progress data)

RLS policies are written but commented out at the bottom of the migration —
turn them on when you wire up real auth.

## Known things to fix before production

- `next.config.mjs` has `ignoreBuildErrors: true` — this is a v0 default and
  it actively hides bugs. Remove it and fix whatever surfaces.
- `WorkoutCalendar` has a 3-status type but the DB has 4 (`skipped` is missing).
  Currently coerced to `missed` at the boundary; should be a proper status.
- Images are hotlinked from Unsplash — fragile and licensing is unclear for
  commercial use. Move to your own storage.
- Auth, RLS, real PT mutations, persistence of completed workouts.
- TypeScript types for the Supabase client are hand-written in
  `lib/supabase/database.types.ts` — regenerate from your real project with
  `npx supabase gen types typescript --project-id <id>` once you have one.
