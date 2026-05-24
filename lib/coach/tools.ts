// Coach tools — the actions the AI is allowed to take on the user's data.
//
// Each tool has:
//   • An Anthropic tool definition (name, description, input_schema) that gets
//     sent to Claude.
//   • A server-side executor that runs against the user-scoped Supabase client.
//
// Tools always return a string back to Claude (either a success summary the
// model can quote to the user, or an error message). The string is what
// Claude sees in the tool_result content block.
//
// IMPORTANT: tools never throw — they catch and return error strings. A
// thrown error would abort the streaming loop and leave the user with
// nothing. Returning the error to Claude lets it tell the user what went
// wrong, which is much better UX.

import type Anthropic from "@anthropic-ai/sdk"
import type { createServerSupabaseClient } from "@/lib/supabase/server"

type ServerSupabase = ReturnType<typeof createServerSupabaseClient>

// ─── Tool definitions (what Claude sees) ────────────────────────────────────

export const COACH_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "create_workout",
    description:
      "Create a new workout template owned by the user, with an ordered list of exercises. " +
      "Use this when the user asks you to build, design, or create a workout for them. " +
      "After creating, you'll get back the workout_id — pass it to schedule_workout if the user also wants it scheduled. " +
      "Each exercise must reference a real exercise_id from the user's exercise library. " +
      "Returns success text with the new workout_id, or an error message.",
    input_schema: {
      type: "object",
      required: ["title", "category", "difficulty", "exercises"],
      properties: {
        title: {
          type: "string",
          description:
            "Workout name shown in the user's library. 2–60 chars. Be specific (e.g. 'Sunday Upper Body' not 'My Workout').",
        },
        description: {
          type: "string",
          description: "Optional one-sentence description of what the workout's for.",
        },
        category: {
          type: "string",
          description:
            "Free text but be consistent. Common values: Strength, HIIT, Cardio, Mobility, Hypertrophy.",
        },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "One of beginner / intermediate / advanced.",
        },
        estimated_duration_minutes: {
          type: "integer",
          description: "Optional. Total expected time in minutes including rest.",
        },
        exercises: {
          type: "array",
          minItems: 1,
          description: "Ordered list of exercises in the workout. Order matters — first item is performed first.",
          items: {
            type: "object",
            required: ["exercise_id", "sets", "prescription", "rest_seconds"],
            properties: {
              exercise_id: {
                type: "string",
                description: "Must match one of the exercise_ids in the user's exercise library context.",
              },
              sets: {
                type: "integer",
                minimum: 1,
                description: "Number of working sets.",
              },
              prescription: {
                type: "string",
                description:
                  "Rep/duration target. Free text. Examples: '5', '8-12', 'AMRAP', '30s', '20m'.",
              },
              weight_kg: {
                type: ["number", "null"],
                description:
                  "Optional prescribed weight in kg. Use null for bodyweight, time-based, or 'figure it out by feel' exercises.",
              },
              rest_seconds: {
                type: "integer",
                minimum: 0,
                description: "Rest between sets in seconds. Typical: 60 for hypertrophy, 90–180 for strength. For exercises inside a superset, this is the rest AFTER the round, not between paired exercises.",
              },
              notes: {
                type: "string",
                description: "Optional per-exercise note (form cue, tempo, etc.).",
              },
              superset_group: {
                type: ["string", "null"],
                description:
                  "Optional. Group exercises into a superset by giving them the same letter ('A', 'B', 'C'). Two or more exercises sharing the same letter are performed back-to-back with no rest between them, then the prescribed rest at the end of each round. Use sparingly — see the system prompt guidance. Leave null for straight-set exercises.",
              },
            },
          },
        },
      },
    },
  },
  {
    name: "delete_workout",
    description:
      "Soft-delete a workout template the user owns. Use this only when the user explicitly asks to remove a workout from their library. " +
      "Cannot delete the global system templates (they don't belong to the user). " +
      "Returns confirmation or an error message.",
    input_schema: {
      type: "object",
      required: ["workout_id"],
      properties: {
        workout_id: {
          type: "string",
          description: "The workouts.id of the workout to delete.",
        },
      },
    },
  },
  {
    name: "customise_session",
    description:
      "Modify a SPECIFIC upcoming scheduled workout — swap an exercise, change reps/sets/weight/rest, or both at once. Use this when the user wants to tweak one upcoming session WITHOUT affecting their template or other scheduled occurrences.\n\n" +
      "Semantics: this uses copy-on-write. If the underlying workout is a template (shared) or has logged history, a private ad-hoc copy is made and only the target scheduled_workout is re-pointed at it. The user's library template stays intact.\n\n" +
      "Pass scheduled_workout_id (from upcoming) and an array of per-exercise changes. Each change references a workout_exercise_id from the session's prescription (you'll see these in the upcoming workouts context). Only include the fields you want to change.",
    input_schema: {
      type: "object",
      required: ["scheduled_workout_id", "changes"],
      properties: {
        scheduled_workout_id: {
          type: "string",
          description: "The scheduled_workouts.id of the session to customise.",
        },
        changes: {
          type: "array",
          minItems: 1,
          description: "One or more changes to apply atomically. All changes are applied to a single (possibly new) underlying workout.",
          items: {
            type: "object",
            required: ["workout_exercise_id"],
            properties: {
              workout_exercise_id: {
                type: "string",
                description: "The workout_exercises.id to modify. Must belong to the session being customised.",
              },
              new_exercise_id: {
                type: "string",
                description: "Optional. Swap the underlying exercise. Must reference an exercise_id in the user's library.",
              },
              new_sets: {
                type: "integer",
                minimum: 1,
                description: "Optional. New number of working sets.",
              },
              new_prescription: {
                type: "string",
                description: "Optional. New rep/duration target. Free text: '5', '8-12', 'AMRAP', '30s'.",
              },
              new_weight_kg: {
                type: ["number", "null"],
                description: "Optional. New prescribed weight in kg. Use null to clear an existing weight (e.g. for bodyweight or 'figure it out by feel').",
              },
              new_rest_seconds: {
                type: "integer",
                minimum: 0,
                description: "Optional. New rest between sets in seconds.",
              },
              new_notes: {
                type: ["string", "null"],
                description: "Optional. New per-exercise note. null clears.",
              },
            },
          },
        },
      },
    },
  },
  {
    name: "schedule_workout",
    description:
      "Schedule a workout template on the user's calendar for a specific date. " +
      "Use this when the user asks to add/schedule/plan a workout on a particular day or across the week. " +
      "Pass the workout_id from the available templates context. " +
      "Returns confirmation text on success or an error message.",
    input_schema: {
      type: "object",
      required: ["workout_id", "scheduled_date"],
      properties: {
        workout_id: {
          type: "string",
          description:
            "The workouts.id of the template to schedule. Must match one of the available templates from your context.",
        },
        scheduled_date: {
          type: "string",
          description:
            "Target date in YYYY-MM-DD format (UTC). Must be today or in the future.",
        },
      },
    },
  },
  {
    name: "unschedule_workout",
    description:
      "Remove a scheduled workout from the user's calendar. Use this when the user " +
      "wants to cancel, delete, or move a workout (in which case call this then " +
      "schedule_workout for the new date). " +
      "Pass the scheduled_workout_id from the upcoming scheduled workouts context. " +
      "Returns confirmation on success or an error message.",
    input_schema: {
      type: "object",
      required: ["scheduled_workout_id"],
      properties: {
        scheduled_workout_id: {
          type: "string",
          description:
            "The scheduled_workouts.id of the workout to unschedule.",
        },
      },
    },
  },
]

// ─── Tool input typings ─────────────────────────────────────────────────────

interface ScheduleWorkoutInput {
  workout_id: string
  scheduled_date: string
}

interface UnscheduleWorkoutInput {
  scheduled_workout_id: string
}

interface CreateWorkoutExerciseInput {
  exercise_id: string
  sets: number
  prescription: string
  weight_kg?: number | null
  rest_seconds: number
  notes?: string | null
  superset_group?: string | null
}

interface CreateWorkoutInput {
  title: string
  description?: string | null
  category: string
  difficulty: "beginner" | "intermediate" | "advanced"
  estimated_duration_minutes?: number
  exercises: CreateWorkoutExerciseInput[]
}

interface DeleteWorkoutInput {
  workout_id: string
}

interface CustomiseSessionChange {
  workout_exercise_id: string
  new_exercise_id?: string
  new_sets?: number
  new_prescription?: string
  new_weight_kg?: number | null
  new_rest_seconds?: number
  new_notes?: string | null
}

interface CustomiseSessionInput {
  scheduled_workout_id: string
  changes: CustomiseSessionChange[]
}

// ─── Executor ───────────────────────────────────────────────────────────────

export interface ToolExecutionResult {
  /** Free-text result handed back to Claude in the next turn. */
  text: string
  /** True if at least one mutation actually changed the database (so the
   *  client knows to refetch). */
  mutated: boolean
}

/**
 * Run one tool call against the user-scoped Supabase client.
 * The client comes from createServerSupabaseClient(accessToken) so all calls
 * respect RLS — the AI cannot mutate other users' rows.
 */
export async function executeTool(
  supabase: ServerSupabase,
  toolName: string,
  input: unknown
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case "schedule_workout":
        return await runScheduleWorkout(supabase, input as ScheduleWorkoutInput)
      case "unschedule_workout":
        return await runUnscheduleWorkout(supabase, input as UnscheduleWorkoutInput)
      case "create_workout":
        return await runCreateWorkout(supabase, input as CreateWorkoutInput)
      case "delete_workout":
        return await runDeleteWorkout(supabase, input as DeleteWorkoutInput)
      case "customise_session":
        return await runCustomiseSession(supabase, input as CustomiseSessionInput)
      default:
        return {
          text: `Unknown tool "${toolName}". Tell the user you don't have that capability.`,
          mutated: false,
        }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return {
      text: `Tool error: ${message}`,
      mutated: false,
    }
  }
}

async function runScheduleWorkout(
  supabase: ServerSupabase,
  input: ScheduleWorkoutInput
): Promise<ToolExecutionResult> {
  if (!input.workout_id || !input.scheduled_date) {
    return {
      text:
        "Missing required arguments. schedule_workout needs workout_id and scheduled_date (YYYY-MM-DD).",
      mutated: false,
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduled_date)) {
    return {
      text: `scheduled_date must be in YYYY-MM-DD format. Got "${input.scheduled_date}".`,
      mutated: false,
    }
  }

  // Look up the workout to confirm it exists & is visible (RLS).
  // This also gives us the title so we can include it in the success message.
  const { data: workout, error: lookupErr } = await supabase
    .from("workouts")
    .select("id, title")
    .eq("id", input.workout_id)
    .is("deleted_at", null)
    .maybeSingle()

  if (lookupErr) {
    return { text: `Couldn't look up workout: ${lookupErr.message}`, mutated: false }
  }
  if (!workout) {
    return {
      text:
        "That workout_id isn't in the list of templates the user can schedule. Double-check against the available templates in your context.",
      mutated: false,
    }
  }

  // Resolve current user — for the insert RLS check and to fill the user_id column.
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) {
    return { text: "Auth error: no user on this session.", mutated: false }
  }

  const { error: insertErr } = await supabase
    .from("scheduled_workouts")
    .insert({
      user_id: userId,
      workout_id: input.workout_id,
      scheduled_date: input.scheduled_date,
      status: "scheduled",
    })

  if (insertErr) {
    return {
      text: `Failed to schedule: ${insertErr.message}`,
      mutated: false,
    }
  }

  return {
    text: `Scheduled "${workout.title}" for ${input.scheduled_date}.`,
    mutated: true,
  }
}

async function runUnscheduleWorkout(
  supabase: ServerSupabase,
  input: UnscheduleWorkoutInput
): Promise<ToolExecutionResult> {
  if (!input.scheduled_workout_id) {
    return {
      text: "Missing required argument scheduled_workout_id.",
      mutated: false,
    }
  }

  // Read first so we can echo what was removed (better confirmation message).
  const { data: row } = await supabase
    .from("scheduled_workouts")
    .select(`
      id,
      scheduled_date,
      workouts:workout_id ( title )
    `)
    .eq("id", input.scheduled_workout_id)
    .maybeSingle()

  if (!row) {
    return {
      text:
        "That scheduled_workout_id wasn't found. It may have already been removed.",
      mutated: false,
    }
  }

  const { error: delErr } = await supabase
    .from("scheduled_workouts")
    .delete()
    .eq("id", input.scheduled_workout_id)

  if (delErr) {
    return { text: `Failed to unschedule: ${delErr.message}`, mutated: false }
  }

  const w = Array.isArray(row.workouts) ? row.workouts[0] : row.workouts
  const title = w?.title ?? "Workout"
  return {
    text: `Unscheduled "${title}" (was on ${row.scheduled_date}).`,
    mutated: true,
  }
}

async function runCreateWorkout(
  supabase: ServerSupabase,
  input: CreateWorkoutInput
): Promise<ToolExecutionResult> {
  // Defensive validation — Claude usually obeys the schema but a typo here
  // would corrupt the DB, so we double-check.
  if (!input.title || input.title.trim().length === 0) {
    return { text: "Workout needs a title.", mutated: false }
  }
  if (!input.category || input.category.trim().length === 0) {
    return { text: "Workout needs a category.", mutated: false }
  }
  if (!["beginner", "intermediate", "advanced"].includes(input.difficulty)) {
    return {
      text: `difficulty must be beginner / intermediate / advanced. Got "${input.difficulty}".`,
      mutated: false,
    }
  }
  if (!Array.isArray(input.exercises) || input.exercises.length === 0) {
    return { text: "Workout needs at least one exercise.", mutated: false }
  }

  // Resolve current user — workout owner.
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) {
    return { text: "Auth error: no user on this session.", mutated: false }
  }

  // Validate exercise_ids before inserting anything. The FK on
  // workout_exercises.exercise_id has on-delete-restrict so an invalid id
  // would fail mid-insert and leave an orphan workouts row. Better to
  // check up-front.
  const exerciseIds = input.exercises.map((e) => e.exercise_id)
  const { data: foundEx, error: exLookupErr } = await supabase
    .from("exercises")
    .select("id, name")
    .in("id", exerciseIds)

  if (exLookupErr) {
    return { text: `Couldn't validate exercises: ${exLookupErr.message}`, mutated: false }
  }
  const foundIds = new Set((foundEx ?? []).map((e) => e.id))
  const missing = exerciseIds.filter((id) => !foundIds.has(id))
  if (missing.length > 0) {
    return {
      text: `These exercise_ids don't exist or aren't visible to the user: ${missing.join(", ")}. Pick from the exercise library in your context.`,
      mutated: false,
    }
  }

  // Insert the workout row.
  const { data: workoutRow, error: insertWorkoutErr } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category.trim(),
      difficulty: input.difficulty,
      estimated_duration_minutes: input.estimated_duration_minutes ?? null,
    })
    .select("id")
    .single()

  if (insertWorkoutErr || !workoutRow) {
    return {
      text: `Failed to create workout: ${insertWorkoutErr?.message ?? "no row returned"}`,
      mutated: false,
    }
  }
  const newWorkoutId = workoutRow.id

  // Normalise positions to 0..n-1 in the order the AI gave us.
  const exerciseRows = input.exercises.map((e, i) => ({
    workout_id: newWorkoutId,
    exercise_id: e.exercise_id,
    position: i,
    sets: e.sets,
    prescription: e.prescription,
    weight_kg: e.weight_kg ?? null,
    rest_seconds: e.rest_seconds,
    notes: e.notes ?? null,
    superset_group: e.superset_group ?? null,
  }))

  const { error: insertExErr } = await supabase
    .from("workout_exercises")
    .insert(exerciseRows)

  if (insertExErr) {
    // The parent workout exists but is exercise-less — soft-delete it to
    // avoid an orphan template cluttering the user's library.
    await supabase
      .from("workouts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", newWorkoutId)
    return {
      text: `Failed to add exercises (workout rolled back): ${insertExErr.message}`,
      mutated: false,
    }
  }

  return {
    text:
      `Created workout "${input.title.trim()}" with ${input.exercises.length} ` +
      `exercises [workout_id=${newWorkoutId}]. Pass this workout_id to schedule_workout ` +
      `if the user wants it on the calendar.`,
    mutated: true,
  }
}

async function runDeleteWorkout(
  supabase: ServerSupabase,
  input: DeleteWorkoutInput
): Promise<ToolExecutionResult> {
  if (!input.workout_id) {
    return { text: "Missing required argument workout_id.", mutated: false }
  }

  // Confirm the workout exists, isn't already deleted, and belongs to this user.
  // RLS's update policy ("update_own_workouts": user_id = auth.uid()) will
  // reject the update if the workout isn't owned, but we read first so we
  // can give a better error message.
  const { data: row } = await supabase
    .from("workouts")
    .select("id, title, user_id, deleted_at")
    .eq("id", input.workout_id)
    .maybeSingle()

  if (!row) {
    return {
      text: "That workout_id wasn't found.",
      mutated: false,
    }
  }
  if (row.user_id === null) {
    return {
      text:
        `"${row.title}" is a built-in system template — those can't be deleted. ` +
        `You can unschedule it from a specific date if needed.`,
      mutated: false,
    }
  }
  if (row.deleted_at) {
    return { text: `"${row.title}" was already deleted.`, mutated: false }
  }

  const { error: delErr } = await supabase
    .from("workouts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.workout_id)

  if (delErr) {
    return { text: `Failed to delete: ${delErr.message}`, mutated: false }
  }

  return { text: `Deleted "${row.title}" from the library.`, mutated: true }
}

async function runCustomiseSession(
  supabase: ServerSupabase,
  input: CustomiseSessionInput
): Promise<ToolExecutionResult> {
  if (!input.scheduled_workout_id) {
    return { text: "Missing scheduled_workout_id.", mutated: false }
  }
  if (!Array.isArray(input.changes) || input.changes.length === 0) {
    return { text: "Provide at least one change in the changes array.", mutated: false }
  }
  for (const c of input.changes) {
    if (!c.workout_exercise_id) {
      return { text: "Every change needs a workout_exercise_id.", mutated: false }
    }
    const hasAnyChange =
      c.new_exercise_id !== undefined ||
      c.new_sets !== undefined ||
      c.new_prescription !== undefined ||
      c.new_weight_kg !== undefined ||
      c.new_rest_seconds !== undefined ||
      c.new_notes !== undefined
    if (!hasAnyChange) {
      return {
        text: `Change for workout_exercise_id ${c.workout_exercise_id} has no fields set. Include at least one new_* field.`,
        mutated: false,
      }
    }
  }

  // Resolve the current user (we may need to mark a copy as user-owned).
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) {
    return { text: "Auth error: no user on this session.", mutated: false }
  }

  // Load the scheduled workout + its underlying workout + its prescription.
  const { data: scheduled, error: schedErr } = await supabase
    .from("scheduled_workouts")
    .select(`
      id,
      scheduled_date,
      workout_id,
      workouts:workout_id (
        id,
        user_id,
        title,
        description,
        category,
        difficulty,
        estimated_duration_minutes,
        estimated_calories,
        image_url,
        is_adhoc,
        is_global
      )
    `)
    .eq("id", input.scheduled_workout_id)
    .maybeSingle()

  if (schedErr) {
    return { text: `Couldn't load session: ${schedErr.message}`, mutated: false }
  }
  if (!scheduled) {
    return { text: "That scheduled_workout_id wasn't found.", mutated: false }
  }
  const currentWorkout = Array.isArray(scheduled.workouts)
    ? scheduled.workouts[0]
    : scheduled.workouts
  if (!currentWorkout) {
    return { text: "Underlying workout missing — can't customise.", mutated: false }
  }

  // Load all workout_exercises for this workout — we need them for validation
  // and (in the copy case) for cloning.
  const { data: weRows, error: weErr } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("workout_id", currentWorkout.id)

  if (weErr) {
    return { text: `Couldn't load prescription: ${weErr.message}`, mutated: false }
  }
  if (!weRows || weRows.length === 0) {
    return { text: "Workout has no exercises to customise.", mutated: false }
  }

  // Validate: every change's workout_exercise_id must belong to this workout.
  const weById = new Map(weRows.map((r) => [r.id, r]))
  const unknownChanges = input.changes
    .filter((c) => !weById.has(c.workout_exercise_id))
    .map((c) => c.workout_exercise_id)
  if (unknownChanges.length > 0) {
    return {
      text:
        `These workout_exercise_ids aren't in this session: ${unknownChanges.join(", ")}. ` +
        `Pick from the workout_exercise_ids listed in the upcoming workouts context.`,
      mutated: false,
    }
  }

  // Validate: any new_exercise_id must exist and be visible to the user.
  const newExerciseIds = input.changes
    .map((c) => c.new_exercise_id)
    .filter((v): v is string => Boolean(v))
  if (newExerciseIds.length > 0) {
    const { data: foundEx } = await supabase
      .from("exercises")
      .select("id")
      .in("id", newExerciseIds)
    const foundSet = new Set((foundEx ?? []).map((e) => e.id))
    const missing = newExerciseIds.filter((id) => !foundSet.has(id))
    if (missing.length > 0) {
      return {
        text:
          `These exercise_ids don't exist or aren't visible: ${missing.join(", ")}. ` +
          `Pick from the exercise library in your context.`,
        mutated: false,
      }
    }
  }

  // ── Decide: mutate in place, or copy-on-write? ─────────────────────────
  //
  // We mutate in place only if ALL of these hold:
  //   • The workout is already ad-hoc (i.e. a private copy, not a shared template)
  //   • It's the only scheduled_workout pointing at this workout_id
  //   • It has no logged exercise_sets yet (nothing to corrupt)
  //
  // Otherwise we copy-on-write so history and other sessions stay clean.
  let mustCopy = !currentWorkout.is_adhoc

  if (!mustCopy) {
    const { count: refCount } = await supabase
      .from("scheduled_workouts")
      .select("id", { count: "exact", head: true })
      .eq("workout_id", currentWorkout.id)
    if ((refCount ?? 0) > 1) mustCopy = true
  }

  if (!mustCopy) {
    const workoutExerciseIds = weRows.map((r) => r.id)
    const { count: setsCount } = await supabase
      .from("exercise_sets")
      .select("id", { count: "exact", head: true })
      .in("workout_exercise_id", workoutExerciseIds)
    if ((setsCount ?? 0) > 0) mustCopy = true
  }

  // ── Apply changes ──────────────────────────────────────────────────────
  if (!mustCopy) {
    // Safe in-place updates.
    for (const change of input.changes) {
      // Typed payload — Supabase's generated types reject Record<string, unknown>.
      const updates: {
        exercise_id?: string
        sets?: number
        prescription?: string
        weight_kg?: number | null
        rest_seconds?: number
        notes?: string | null
      } = {}
      if (change.new_exercise_id !== undefined) updates.exercise_id = change.new_exercise_id
      if (change.new_sets !== undefined) updates.sets = change.new_sets
      if (change.new_prescription !== undefined) updates.prescription = change.new_prescription
      if (change.new_weight_kg !== undefined) updates.weight_kg = change.new_weight_kg
      if (change.new_rest_seconds !== undefined) updates.rest_seconds = change.new_rest_seconds
      if (change.new_notes !== undefined) updates.notes = change.new_notes
      const { error: updErr } = await supabase
        .from("workout_exercises")
        .update(updates)
        .eq("id", change.workout_exercise_id)
      if (updErr) {
        return {
          text: `Failed updating exercise ${change.workout_exercise_id}: ${updErr.message}`,
          mutated: false,
        }
      }
    }
    return {
      text:
        `Updated ${input.changes.length} exercise${input.changes.length === 1 ? "" : "s"} ` +
        `for the session on ${scheduled.scheduled_date}. Edited in place — this is already your private copy.`,
      mutated: true,
    }
  }

  // ── Copy-on-write path ─────────────────────────────────────────────────
  // 1. Insert a new workouts row (ad-hoc, owned by the user).
  const { data: newWorkout, error: copyErr } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      title: currentWorkout.title,
      description: currentWorkout.description,
      category: currentWorkout.category,
      difficulty: currentWorkout.difficulty,
      estimated_duration_minutes: currentWorkout.estimated_duration_minutes,
      estimated_calories: currentWorkout.estimated_calories,
      image_url: currentWorkout.image_url,
      is_adhoc: true, // hidden from the library list
    })
    .select("id")
    .single()

  if (copyErr || !newWorkout) {
    return {
      text: `Failed to copy workout: ${copyErr?.message ?? "no row returned"}`,
      mutated: false,
    }
  }

  // 2. Copy all workout_exercises rows, applying changes inline as we go.
  // Build a mapping so the caller's workout_exercise_id (from the original)
  // resolves to the new row's id when we report success.
  const changesById = new Map(input.changes.map((c) => [c.workout_exercise_id, c]))
  const newExerciseRows = weRows
    .sort((a, b) => a.position - b.position)
    .map((we) => {
      const change = changesById.get(we.id)
      return {
        workout_id: newWorkout.id,
        exercise_id: change?.new_exercise_id ?? we.exercise_id,
        position: we.position,
        sets: change?.new_sets ?? we.sets,
        prescription: change?.new_prescription ?? we.prescription,
        weight_kg:
          change?.new_weight_kg !== undefined ? change.new_weight_kg : we.weight_kg,
        rest_seconds: change?.new_rest_seconds ?? we.rest_seconds,
        notes: change?.new_notes !== undefined ? change.new_notes : we.notes,
        superset_group: we.superset_group,
      }
    })

  const { error: insertExErr } = await supabase
    .from("workout_exercises")
    .insert(newExerciseRows)

  if (insertExErr) {
    // Roll back the parent so we don't leak an orphan workout.
    await supabase.from("workouts").delete().eq("id", newWorkout.id)
    return {
      text: `Failed to clone prescription: ${insertExErr.message}`,
      mutated: false,
    }
  }

  // 3. Re-point the scheduled_workout at the new copy.
  const { error: repointErr } = await supabase
    .from("scheduled_workouts")
    .update({ workout_id: newWorkout.id })
    .eq("id", input.scheduled_workout_id)

  if (repointErr) {
    // The copy now exists but the scheduled_workout still points at the original.
    // Clean up the orphan copy so we don't pollute.
    await supabase.from("workout_exercises").delete().eq("workout_id", newWorkout.id)
    await supabase.from("workouts").delete().eq("id", newWorkout.id)
    return {
      text: `Couldn't apply changes to the session: ${repointErr.message}`,
      mutated: false,
    }
  }

  return {
    text:
      `Updated ${input.changes.length} exercise${input.changes.length === 1 ? "" : "s"} ` +
      `for the session on ${scheduled.scheduled_date}. ` +
      `Your "${currentWorkout.title}" template is unchanged — this only affects this session.`,
    mutated: true,
  }
}
