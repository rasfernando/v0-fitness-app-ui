# Fitness App

A single-user fitness app — log workouts, track progress, and chat with an
AI coach that has full context on your training history.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + auth, RLS on)
- Anthropic Claude (server-side) for the AI coach
- TypeScript

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Supabase backend

If you're using the project provisioned in the conversation that built this
README, the database is already set up. Otherwise:

1. Create a new Supabase project at <https://supabase.com>.
2. Open the SQL editor and run `supabase/migrations/0001_initial_schema_squashed.sql`.
3. Confirm in the Table Editor that 9 tables exist (`profiles`, `exercises`,
   `workouts`, `workout_exercises`, `scheduled_workouts`, `workout_sessions`,
   `exercise_sets`, `coach_messages`, `notifications`) and that the
   `workouts` table has 8 seeded global rows.

### 3. Set environment variables

`.env.local` needs three values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase Settings → API>
ANTHROPIC_API_KEY=<sk-ant-... from https://console.anthropic.com>
```

The Anthropic key is server-only — never expose it client-side. The
`/api/coach/chat` route reads it from `process.env`. Make sure it's set in
your Vercel project's environment variables before deploying.

### 4. Run

```bash
pnpm dev
```

Sign up at <http://localhost:3000>. The `handle_new_user` Postgres trigger
creates your `profiles` row from the signup metadata.

## What's wired up

### Functional

- Real Supabase auth (email + password) + RLS enforced everywhere
- Dashboard scheduled-workouts list and calendar
- Workout library (8 global starter templates + your own)
- Workout player: prescription loads, per-set logging is durable, session
  completion flips the schedule entry to "completed"
- Quick Log: ad-hoc workouts appear in calendar + progress
- Progress: completed sessions, weekly stats, streak, main-lift trend
- **AI coach chat** — streaming Claude responses with **tool use**.
  The coach can act on your schedule and library directly:
  - *"Schedule lower body for Wednesday"* → schedules it
  - *"Build me a 30-minute upper body session with dumbbells"* → creates
    a new workout template in your library
  - *"Plan my next 4 weeks"* → chained `create_workout` and
    `schedule_workout` calls
  - *"Delete that bicep workout I made last week"* → soft-deletes it

  Available tools: `schedule_workout`, `unschedule_workout`,
  `create_workout`, `delete_workout`, `customise_session`. The exercise
  library (your global catalogue + your own custom exercises) is in the
  prompt context so the AI picks real exercise_ids when creating
  workouts. Each upcoming scheduled workout also includes its
  per-exercise prescription with workout_exercise_ids, so the AI can
  point `customise_session` changes at specific exercises. Server-side
  at `/api/coach/chat`.

  Try: *"swap the bench in Wednesday's session for incline dumbbell
  press"*, *"drop my deadlift weight on Friday to 100kg, my back's
  tight"*, *"make all my squat sessions next week 3 × 8 instead of 5 × 5"*.
- **Pre-session adaptive suggestions** — on the dashboard, the next
  scheduled workout gets a "Coach's plan" card with per-exercise proposed
  weights, reps, and a one-line "why". Uses Claude tool use for
  guaranteed-shape JSON. Cached in localStorage for 24h; auto-invalidates
  when the coach mutates the schedule. Server-side at
  `/api/coach/suggest-session`.
- **Library screen** — browse the workouts you (or your coach) have
  built. Expand a workout to see its exercises; tap **Schedule** to add
  it to your calendar with a date picker, or **Delete** to remove it.
  Accessible from the Coach screen header and from a card on the
  Dashboard. Auto-refreshes when the AI creates or deletes workouts.

### Coming in Phase 8 (or later)

- **UI workout builder** — drag-and-drop creation without going through
  the chat. De-prioritised since the AI builds and customises workouts
  well and the Library lets you manage them.
- **Template-level editing** — `customise_session` only modifies a
  single scheduled occurrence. To change a template forever, you currently
  delete and recreate. A `modify_template` tool would close this gap.
- **Suggestion in the workout player** — pre-fill the weight input with
  the coach's suggested value when you start a set.
- **Prompt caching** — the exercise library is static per turn but
  currently re-sent every time. Anthropic supports `cache_control:
  { type: "ephemeral" }` for system blocks; applying it to the exercise
  library would drop per-turn cost by ~80% after the first call.
- **Undelete** — soft-deleted workouts are recoverable in SQL but
  invisible in the UI. A "recently deleted" section on the Library would
  cover the user-error case.

## AI coach details

- Model: **Claude Sonnet 4.6** (`claude-sonnet-4-6`) for both chat and
  session suggestions. Swap for Haiku by editing the `COACH_MODEL`
  constant in `lib/coach/prompt.ts` — ~10× cheaper, faster, but more
  generic.
- **Chat context window:** last 20 chat messages + 8 most recent completed
  sessions (with every set logged) + upcoming scheduled workouts +
  visible templates + the full exercise library (~76 rows with IDs, so
  the AI can `create_workout`). Per-turn cost: ~$0.005–$0.020 on Sonnet.
  Prompt caching would bring this down materially after the first turn
  — see the Phase 6 list.
- **Suggestion context window:** today's prescription + last 2 comparable
  sessions per exercise (joined by `exercise_id`, so any workout that
  contained that lift counts). Per-call cost: ~$0.01 on Sonnet.
- **Suggestion caching:** `localStorage` keyed by `scheduled_workout_id`,
  24h TTL. Regenerate button forces a refresh. There's no server-side
  cache yet — that's a future tidy-up if cost becomes a concern.
- **Suggestion shape:** Claude is forced to call the `propose_session`
  tool, which has a JSON schema. The route maps the tool output onto
  `CoachSuggestion` (`lib/coach/suggestion-types.ts`) and re-keys by
  `workoutExerciseId` so the UI doesn't break if the model reorders.
- Auth: the browser sends its Supabase access token in the Authorization
  header. Both routes validate via `auth.getUser()` and use it to build
  a Supabase client scoped to that user — RLS still applies, even
  server-side.
- Prompts live in `lib/coach/prompt.ts` (chat) and inline in
  `app/api/coach/suggest-session/route.ts` (suggestion). Iterate there if
  the coach's tone or guidance feels off.

### Tool use (Phase 4 + 5 + 7)

- **Tool definitions** live in `lib/coach/tools.ts`. Each tool has an
  Anthropic schema (sent to Claude) and a server-side executor that runs
  against the user's RLS-scoped Supabase client — so the coach physically
  cannot mutate another user's rows.
- **Available tools:**
  - `schedule_workout(workout_id, scheduled_date)`
  - `unschedule_workout(scheduled_workout_id)`
  - `create_workout(title, category, difficulty, exercises[])` — exercises
    are validated against the user's visible library before insert; if
    one is invalid the whole call fails clean and the parent workout row
    is soft-deleted to avoid orphans.
  - `delete_workout(workout_id)` — soft delete. Blocked for global
    system templates (user_id IS NULL).
  - `customise_session(scheduled_workout_id, changes[])` — swap an
    exercise, or change sets/reps/weight/rest/notes on one or more
    exercises within a SINGLE upcoming session. Copy-on-write: if the
    underlying workout is a shared template, has logged sets, or is
    referenced by multiple scheduled sessions, the executor clones the
    workout (marked `is_adhoc=true`, hidden from the library list),
    applies the changes to the clone, and re-points just this
    `scheduled_workouts` row at the clone. If the workout is already a
    private ad-hoc copy with no history and no other scheduled sessions,
    it's mutated in place to avoid orphan copies. The user's template
    always stays pristine.
- **Tool execution loop:** the route streams Claude's response, collects
  any `tool_use` blocks, executes them sequentially, sends `tool_result`
  blocks back, and streams the continuation. Capped at 3 rounds so a
  hallucinating model can't burn money in a loop.
- **Mutation marker:** after a turn that actually changed the DB, the
  server appends ` MUTATED ` to the stream. The chat hook strips this
  from the displayed message and calls `invalidate("scheduled_workouts")`
  from `lib/data-invalidation.ts`, which forces `useScheduledWorkouts`
  and `useCoachSuggestion` to refetch. That's how the dashboard reflects
  the change automatically without a manual refresh.
- **Failure handling:** tool executors never throw — they catch and
  return an error string back to Claude as the tool result. Claude then
  tells the user what went wrong in natural language. Beats a 500.

## Schema

`supabase/migrations/0001_initial_schema_squashed.sql` is the single source
of truth. Tables:

- `profiles` — one row per auth.user, created by trigger on signup
- `exercises` — global library (`created_by IS NULL`) + per-user custom
- `workouts` — workout templates; `user_id IS NULL` = global system template
- `workout_exercises` — the prescription (sets/reps/rest per exercise)
- `scheduled_workouts` — you assign a workout to yourself on a date
- `workout_sessions` — a record of actually doing a workout
- `exercise_sets` — per-set logged performance (the progress data)
- `coach_messages` — AI coach conversation history
- `notifications` — in-app notifications

RLS is on for all nine tables. "Own rows only" is the default policy;
`workouts`/`exercises` rows with NULL ownership are globally readable as
system templates.

## Known things to fix before production

- `next.config.mjs` has `ignoreBuildErrors: true` — typecheck currently
  passes cleanly, but the flag still masks future bugs. Remove it.
- `WorkoutCalendar` has a 3-status type but the DB has 4 (`skipped` is
  missing). Coerced to `missed` at the boundary today.
- Images on the dashboard and exercises are hotlinked from Unsplash —
  fragile and licensing is unclear for commercial use. Move to Supabase
  Storage.
- `lib/supabase/database.types.ts` is hand-edited for the squashed schema.
  Regenerate from your live project with
  `npx supabase gen types typescript --project-id <id>` after any further
  schema change.
- No rate limiting on `/api/coach/chat` or `/api/coach/suggest-session`.
  Single-user is fine; before opening to others, add per-user limits or
  you'll wear a bill.
