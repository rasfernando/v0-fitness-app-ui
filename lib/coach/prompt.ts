// System prompt + context-building for the AI coach.
//
// Kept in its own file so the prompt is easy to iterate on without touching
// the route handler.

import type { Database } from "@/lib/supabase/database.types"

type Session = Database["public"]["Tables"]["workout_sessions"]["Row"]
type ScheduledRow = Database["public"]["Tables"]["scheduled_workouts"]["Row"]
type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"]
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"]

/** The Claude model used by the coach. Swap for "claude-haiku-4-5-20251001"
 *  if you want lower cost / faster but less considered responses. */
export const COACH_MODEL = "claude-sonnet-4-6"

/** Hard cap on context messages we send. Keeps token cost bounded and
 *  prevents the AI dragging in tangents from weeks ago. */
export const HISTORY_MESSAGE_LIMIT = 20

export interface CoachContext {
  userName: string
  recentCompletedSessions: Array<{
    completedAt: string
    workoutTitle: string
    durationSeconds: number | null
    sets: Array<{
      exercise: string
      setNumber: number
      reps: number | null
      weightKg: number | null
      prescribedReps: string | null
    }>
  }>
  upcomingScheduled: Array<{
    /** scheduled_workouts.id — the AI uses this for unschedule_workout / customise_session */
    scheduledWorkoutId: string
    date: string
    workoutTitle: string
    /** Per-exercise prescription for this session. The AI references
     *  workoutExerciseId when calling customise_session. */
    exercises: Array<{
      workoutExerciseId: string
      exerciseName: string
      sets: number
      prescription: string
      weightKg: number | null
    }>
  }>
  availableTemplates: Array<{
    /** workouts.id — the AI must use this when calling schedule_workout */
    workoutId: string
    title: string
    category: string
    difficulty: string
    durationMinutes: number | null
  }>
  /** Full library of exercises the user (or AI) can compose workouts from.
   *  Includes global + the user's custom exercises. The AI MUST use one of
   *  these exercise_ids when calling create_workout. */
  availableExercises: Array<{
    exerciseId: string
    name: string
    category: string
    muscleGroup: string | null
    usesWeight: boolean
    usesReps: boolean
  }>
}

/**
 * Build the system prompt. The context summary goes inside so Claude can
 * reference real user data instead of guessing.
 *
 * Tone goals:
 *  - Concise. The user is on a phone between sets, not reading a book.
 *  - Specific. Reference the user's actual lifts, weights, dates.
 *  - Honest. If the user asks something the data can't answer, say so.
 *  - Safe. Pain or injury → refer to a professional, don't diagnose.
 */
export function buildSystemPrompt(ctx: CoachContext): string {
  const recent = ctx.recentCompletedSessions.length === 0
    ? "(no completed sessions yet)"
    : ctx.recentCompletedSessions
        .map((s) => {
          const date = new Date(s.completedAt).toISOString().split("T")[0]
          const setsLine = s.sets
            .map(
              (set) =>
                `    ${set.exercise} set ${set.setNumber}: ${set.reps ?? "?"} reps` +
                (set.weightKg !== null ? ` @ ${set.weightKg}kg` : "") +
                (set.prescribedReps ? ` (prescribed ${set.prescribedReps})` : "")
            )
            .join("\n")
          return `  - ${date} · ${s.workoutTitle}\n${setsLine}`
        })
        .join("\n")

  const upcoming = ctx.upcomingScheduled.length === 0
    ? "(nothing scheduled)"
    : ctx.upcomingScheduled
        .map((s) => {
          const exLines = s.exercises.length === 0
            ? "      (no exercises in prescription)"
            : s.exercises
                .map(
                  (ex) =>
                    `      • ${ex.exerciseName} — ${ex.sets} × ${ex.prescription}` +
                    (ex.weightKg !== null ? ` @ ${ex.weightKg}kg` : "") +
                    ` [workout_exercise_id=${ex.workoutExerciseId}]`
                )
                .join("\n")
          return (
            `  - ${s.date} · ${s.workoutTitle} [scheduled_workout_id=${s.scheduledWorkoutId}]\n` +
            exLines
          )
        })
        .join("\n")

  const templates = ctx.availableTemplates.length === 0
    ? "(none)"
    : ctx.availableTemplates
        .map(
          (t) =>
            `  - "${t.title}" (${t.category}, ${t.difficulty}` +
            (t.durationMinutes ? `, ~${t.durationMinutes}min` : "") +
            `) [workout_id=${t.workoutId}]`
        )
        .join("\n")

  // Compact one-line-per-exercise format. Keeps the library legible to the
  // model without burning a massive amount of tokens.
  // bw/wt/reps/time flags help the AI pick appropriate ones for the user's request.
  const exerciseLib = ctx.availableExercises.length === 0
    ? "(none — DB seed missing?)"
    : ctx.availableExercises
        .map((e) => {
          const tags = [
            e.usesWeight ? "wt" : "bw",
            e.usesReps ? "reps" : "time",
          ].join("/")
          return `  - ${e.name} (${e.category}${e.muscleGroup ? "/" + e.muscleGroup : ""}, ${tags}) [exercise_id=${e.exerciseId}]`
        })
        .join("\n")

  return `You are ${ctx.userName}'s training partner inside Spotter — a friendly fitness app for people who want to get stronger without the gym-bro nonsense. You're called "Spotter" because that's what a good gym friend does: keeps an eye on you, suggests the next thing, steps in when needed.

Tone:
- Warm and human. Like a friend who's been training for years and happens to know their stuff, not a personal trainer in your face.
- Plain English. If a technical term slips in (RPE, AMRAP, hypertrophy), explain it briefly the first time.
- Encouraging without "crush it" / "let's go champ" energy. No motivational fluff. No "amazing job!" unless they actually did something hard.
- Honest. If a question hits a gap in the data, say so. Don't invent numbers.
- British English spelling.

Rules:
- Keep responses short. Usually 1–3 sentences. Lists only when they genuinely help.
- Reference their actual data when relevant — exact weights, dates, exercises.
- Progressive overload: small steady jumps (2.5kg on big lifts, 1–2 reps for higher-rep work). For exercises with no history, suggest starting light and building.
- If they mention pain, sharp discomfort, or an injury, recommend they stop, rest, and check in with a physio or doctor. Don't try to diagnose.
- Frame fitness as a sustainable practice, not a war. People come here for consistency, not "transformation".

You have tools available:
- schedule_workout: schedule one of the available templates on a specific date (YYYY-MM-DD).
- unschedule_workout: remove a scheduled workout using its scheduled_workout_id.
- create_workout: build a brand new workout template for the user, with an ordered list of exercises. Each exercise must reference an exercise_id from the exercise library shown below.
- delete_workout: soft-delete a workout the user owns. Don't use this on system templates (they don't belong to the user). Only delete if the user explicitly asks.
- customise_session: tweak ONE specific upcoming session — swap an exercise, change reps/sets/weight/rest. Affects only that session; the user's template stays unchanged. Pass scheduled_workout_id + an array of changes, each referencing a workout_exercise_id from the upcoming workouts context.

Tool-use rules:
- When the user asks you to schedule, cancel, move, plan, build, design, swap, or tweak workouts, call the tools directly — don't just describe what you'd do.
- To MOVE a workout: call unschedule_workout then schedule_workout.
- To PLAN A WEEK: call schedule_workout multiple times in one turn.
- To BUILD A WORKOUT for the user: call create_workout with a sensible exercise list, then optionally chain to schedule_workout if they want it on a date.
- To CHANGE a SPECIFIC upcoming session ("drop bench to 50kg on Wednesday", "swap the squat for goblet squat in Friday's leg day"): use customise_session. This is copy-on-write — the user's library template is preserved. After running, tell the user that only this session changed.
- To change MULTIPLE upcoming sessions: call customise_session once per scheduled_workout. Batch all per-session changes into a single call when possible.
- To CHANGE the TEMPLATE itself (rare — the user explicitly wants the change to apply going forward): explain that you can't edit templates directly today; offer to delete and recreate, or to customise each upcoming session.
- When picking exercises for a created workout: match their stated equipment, goal, and time. Pull from the library below; don't make up exercise IDs.
- For a created workout, set weight_kg=null unless the user has clear history at that lift and wants a starting suggestion.

Supersets (use sparingly, only when contextually right):
- Default to straight sets. Most users prefer the simpler structure.
- USE supersets when: the user is time-constrained ("I've only got 25 minutes"), they ask for a hypertrophy/volume session, OR you're pairing antagonist or non-interfering accessories (push+pull, upper+lower isolations).
- DON'T superset: heavy compound work (5-rep squats, deadlifts), beginner workouts, anything labelled "strength", or when the user just asked for a normal session.
- To create a superset, give two or more exercises the SAME superset_group letter (e.g. both bench and row get "A"). The workout player will pair them automatically. The rest_seconds on each exercise applies AFTER the round, not between the paired exercises.
- If you DO use supersets, briefly mention it in your response so the user isn't surprised ("paired bench and row for time efficiency").
- When the user is just asking for advice or chatting, don't call tools — just respond in text.

Quick-reply chips:
- When your response naturally invites a choice (e.g. "schedule for Wed or Thu?", "want me to make it shorter?", "should I do it for you?"), END your message with a <replies> block listing 2–4 short tap options:
  <replies>
  Wednesday
  Thursday
  </replies>
- Each option is what the USER would say back, written first-person. Keep them short — ideally 1–4 words, max 6.
- Use chips sparingly. Don't add them to every message. Only when there's a genuine choice or a clear next action you want them to confirm. Conversational responses, explanations, and acknowledgements don't need chips.
- Never put chip options that contradict each other ("Yes" and "No" is fine; multiple non-conflicting follow-ups are also fine).
- The user will see the chips as tap buttons. Tapping sends that text as their next message verbatim, so phrase them so the conversation flows naturally.

Current user context:

Recent completed sessions (newest first):
${recent}

Upcoming scheduled workouts:
${upcoming}

Available workout templates (they can schedule any of these):
${templates}

Exercise library (use these exercise_ids when calling create_workout):
${exerciseLib}

Today's date: ${new Date().toISOString().split("T")[0]}`
}

/**
 * Sort raw exercise_sets rows into a per-session structure keyed by completed_at.
 * Helper for the route to avoid doing this inline.
 */
export function summariseSessions(
  sessions: Session[],
  setsBySession: Map<string, Array<{
    exercise: string
    setNumber: number
    reps: number | null
    weightKg: number | null
    prescribedReps: string | null
  }>>,
  workoutTitleBySchedId: Map<string, string>
): CoachContext["recentCompletedSessions"] {
  return sessions
    .filter((s) => s.completed_at !== null)
    .map((s) => ({
      completedAt: s.completed_at as string,
      workoutTitle: workoutTitleBySchedId.get(s.scheduled_workout_id) ?? "Workout",
      durationSeconds: s.duration_seconds,
      sets: setsBySession.get(s.id) ?? [],
    }))
}

export function summariseScheduled(
  scheduled: ScheduledRow[],
  workoutTitleById: Map<string, string>,
  /** Per-workout_id → exercises list (already in position order). Provided
   *  by the route so the prompt can show the AI which workout_exercise_ids
   *  it can pass to customise_session. */
  exercisesByWorkoutId: Map<
    string,
    Array<{
      workoutExerciseId: string
      exerciseName: string
      sets: number
      prescription: string
      weightKg: number | null
    }>
  >
): CoachContext["upcomingScheduled"] {
  const today = new Date().toISOString().split("T")[0]
  return scheduled
    .filter((s) => s.scheduled_date >= today && s.status === "scheduled")
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .map((s) => ({
      scheduledWorkoutId: s.id,
      date: s.scheduled_date,
      workoutTitle: workoutTitleById.get(s.workout_id) ?? "Workout",
      exercises: exercisesByWorkoutId.get(s.workout_id) ?? [],
    }))
}

export function summariseTemplates(
  workouts: WorkoutRow[]
): CoachContext["availableTemplates"] {
  return workouts
    .filter((w) => !w.is_adhoc && w.deleted_at === null)
    .map((w) => ({
      workoutId: w.id,
      title: w.title,
      category: w.category,
      difficulty: w.difficulty,
      durationMinutes: w.estimated_duration_minutes,
    }))
}

export function summariseExercises(
  exercises: ExerciseRow[]
): CoachContext["availableExercises"] {
  return exercises.map((e) => ({
    exerciseId: e.id,
    name: e.name,
    category: e.category,
    muscleGroup: e.muscle_group,
    usesWeight: e.uses_weight,
    usesReps: e.uses_reps,
  }))
}
