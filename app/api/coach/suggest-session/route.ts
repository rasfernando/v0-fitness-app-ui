import Anthropic from "@anthropic-ai/sdk"
import {
  createServerSupabaseClient,
  getAccessTokenFromRequest,
} from "@/lib/supabase/server"
import { COACH_MODEL } from "@/lib/coach/prompt"
import type {
  CoachSuggestion,
  ExerciseSuggestion,
} from "@/lib/coach/suggestion-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RequestBody {
  scheduledWorkoutId: string
}

// Pull the last 2 comparable sessions for each exercise (just enough to see
// the trajectory without bloating the prompt).
const COMPARABLE_HISTORY_LIMIT = 2

// Hard cap on Claude tokens — the structured response is small.
const MAX_TOKENS = 1500

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromRequest(request)
  if (!accessToken) {
    return jsonError(401, "Missing or malformed Authorization header")
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return jsonError(500, "Server is missing ANTHROPIC_API_KEY")
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return jsonError(400, "Body must be JSON: { scheduledWorkoutId: string }")
  }
  const scheduledWorkoutId = body.scheduledWorkoutId?.trim()
  if (!scheduledWorkoutId) {
    return jsonError(400, "scheduledWorkoutId is required")
  }

  const supabase = createServerSupabaseClient(accessToken)

  // Auth-check by JWT validation, not by trusting the client.
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return jsonError(401, "Invalid or expired access token")
  }

  // ── Load: scheduled workout + its workout's prescription ──────────────
  const { data: scheduledRow, error: schedErr } = await supabase
    .from("scheduled_workouts")
    .select(`
      id,
      scheduled_date,
      workouts:workout_id (
        title,
        description,
        category,
        difficulty,
        workout_exercises (
          id,
          position,
          sets,
          prescription,
          weight_kg,
          rest_seconds,
          notes,
          exercises:exercise_id (
            id,
            name,
            uses_weight,
            uses_reps
          )
        )
      )
    `)
    .eq("id", scheduledWorkoutId)
    .single()

  if (schedErr || !scheduledRow) {
    return jsonError(404, "Scheduled workout not found (or RLS blocked it)")
  }

  const w = Array.isArray(scheduledRow.workouts)
    ? scheduledRow.workouts[0]
    : scheduledRow.workouts
  if (!w) {
    return jsonError(404, "Scheduled workout has no underlying workout")
  }

  type WERow = {
    id: string
    position: number
    sets: number
    prescription: string
    weight_kg: number | null
    rest_seconds: number
    notes: string | null
    exercises:
      | { id: string; name: string; uses_weight: boolean; uses_reps: boolean }
      | Array<{ id: string; name: string; uses_weight: boolean; uses_reps: boolean }>
      | null
  }
  const weRows = ((w.workout_exercises ?? []) as WERow[])
    .map((we) => ({
      ...we,
      ex: Array.isArray(we.exercises) ? we.exercises[0] : we.exercises,
    }))
    .filter((we) => we.ex !== null)
    .sort((a, b) => a.position - b.position)

  if (weRows.length === 0) {
    return jsonError(400, "This workout has no exercises to suggest for")
  }

  // ── Load: per-exercise recent comparable sets ────────────────────────────
  // For each exercise in the prescription, find the user's last N completed
  // sets of that same exercise (across any workout, joined back via exercise_id).
  const exerciseIds = weRows.map((r) => r.ex!.id)
  const { data: historyRows, error: histErr } = await supabase
    .from("exercise_sets")
    .select(`
      set_number,
      reps_completed,
      weight_kg_used,
      prescribed_reps,
      completed_at,
      workout_exercises:workout_exercise_id!inner (
        exercise_id
      )
    `)
    .in("workout_exercises.exercise_id", exerciseIds)
    .order("completed_at", { ascending: false })
    .limit(400) // generous; we filter per-exercise below

  if (histErr) {
    return jsonError(500, `Failed to load history: ${histErr.message}`)
  }

  // Group sets per exercise_id, then take the most recent COMPARABLE_HISTORY_LIMIT sessions.
  // A "session" is identified by (exercise_id, completed_at date) — we don't
  // have session_id in the select so we approximate by the timestamp's date part.
  const setsByExercise = new Map<
    string,
    Array<{
      sessionKey: string
      setNumber: number
      reps: number | null
      weightKg: number | null
      prescribedReps: string | null
      completedAt: string
    }>
  >()
  for (const row of historyRows ?? []) {
    const we = Array.isArray(row.workout_exercises)
      ? row.workout_exercises[0]
      : row.workout_exercises
    const exId = we?.exercise_id
    if (!exId) continue
    const list = setsByExercise.get(exId) ?? []
    const completedAt = row.completed_at as string
    list.push({
      sessionKey: completedAt.split("T")[0],
      setNumber: row.set_number,
      reps: row.reps_completed,
      weightKg: row.weight_kg_used,
      prescribedReps: row.prescribed_reps,
      completedAt,
    })
    setsByExercise.set(exId, list)
  }

  // Build the prompt context: for each exercise in today's session, get last 2
  // session-days' worth of sets.
  const exerciseContexts = weRows.map((we) => {
    const ex = we.ex!
    const all = setsByExercise.get(ex.id) ?? []
    // Group by session date
    const byDate = new Map<string, typeof all>()
    for (const s of all) {
      const list = byDate.get(s.sessionKey) ?? []
      list.push(s)
      byDate.set(s.sessionKey, list)
    }
    const recentSessions = Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, COMPARABLE_HISTORY_LIMIT)
      .map(([date, sets]) => ({
        date,
        sets: sets
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps,
            weightKg: s.weightKg,
            prescribedReps: s.prescribedReps,
          })),
      }))
    return {
      workoutExerciseId: we.id,
      exerciseName: ex.name,
      usesWeight: ex.uses_weight,
      usesReps: ex.uses_reps,
      prescribedSets: we.sets,
      prescribedReps: we.prescription,
      prescribedWeightKg: we.weight_kg,
      notes: we.notes,
      recentSessions,
    }
  })

  // ── Build prompt ─────────────────────────────────────────────────────────
  const exerciseLines = exerciseContexts
    .map((ec) => {
      const historyBlock =
        ec.recentSessions.length === 0
          ? "    History: (no previous sessions for this exercise)"
          : ec.recentSessions
              .map(
                (sess) =>
                  `    ${sess.date}: ` +
                  sess.sets
                    .map(
                      (s) =>
                        `set ${s.setNumber}=${s.reps ?? "?"} reps` +
                        (s.weightKg !== null ? `@${s.weightKg}kg` : "") +
                        (s.prescribedReps ? ` (asked ${s.prescribedReps})` : "")
                    )
                    .join(", ")
              )
              .join("\n")
      return (
        `- ${ec.exerciseName} (workout_exercise_id=${ec.workoutExerciseId})\n` +
        `    Today's prescription: ${ec.prescribedSets} × ${ec.prescribedReps}` +
        (ec.prescribedWeightKg !== null ? ` @ ${ec.prescribedWeightKg}kg` : "") +
        (ec.notes ? ` (notes: ${ec.notes})` : "") +
        `\n${historyBlock}`
      )
    })
    .join("\n\n")

  const systemPrompt = `You are an experienced strength coach proposing today's working weights for the user's scheduled session. You ALWAYS respond by calling the "propose_session" tool exactly once. Do not respond in plain text.

Guidance for your proposal:
- Be conservative on the first session for an exercise the user has never done (suggestedWeightKg = null is fine — let them feel it out).
- Small jumps only: 2.5kg on big compounds (squat/bench/deadlift/row), 1–2.5kg on isolations, and prefer adding a rep before adding load on hypertrophy work.
- If they MISSED reps last session, repeat the weight and aim for all reps clean.
- If they HIT all sets clean and the prescription is rep-based (e.g. "5"), bump load 2.5kg. If rep-based with a range (e.g. "8-10"), suggest pushing toward the top of the range first, then add load.
- For bodyweight or time-based exercises (uses_weight=false), set suggestedWeightKg to null.
- Reasoning must be ONE short sentence, specific to their data — e.g. "All 4 sets at 65kg last week, time to bump." NOT "Great effort, keep it up!"
- Summary is ONE or TWO sentences — the headline of today's session.

Today's date: ${new Date().toISOString().split("T")[0]}
Scheduled date: ${scheduledRow.scheduled_date}
Workout: ${w.title} (${w.category}, ${w.difficulty})
${w.description ? `Description: ${w.description}\n` : ""}
Exercises:
${exerciseLines}`

  // ── Call Claude with tool use ────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey })

  const tool: Anthropic.Messages.Tool = {
    name: "propose_session",
    description:
      "Submit the coach's proposed prescription for today's session.",
    input_schema: {
      type: "object",
      required: ["summary", "exercises"],
      properties: {
        summary: {
          type: "string",
          description: "One or two short sentences summarising the session.",
        },
        exercises: {
          type: "array",
          description: "Per-exercise proposal in the same order as the prescription.",
          items: {
            type: "object",
            required: [
              "workoutExerciseId",
              "exerciseName",
              "suggestedSets",
              "suggestedReps",
              "reasoning",
            ],
            properties: {
              workoutExerciseId: {
                type: "string",
                description: "Echo back the workout_exercise_id from the input.",
              },
              exerciseName: { type: "string" },
              suggestedSets: { type: "integer", minimum: 1 },
              suggestedReps: {
                type: "string",
                description: "Free text — '5', '8-10', 'AMRAP', '30s', etc.",
              },
              suggestedWeightKg: {
                type: ["number", "null"],
                description: "Working weight in kg. null for bodyweight / time-based.",
              },
              reasoning: {
                type: "string",
                description: "ONE short sentence justifying the prescription, using their data.",
              },
            },
          },
        },
      },
    },
  }

  // Shape Claude is constrained to return via the tool's input_schema.
  interface ClaudeToolInput {
    summary: string
    exercises: Array<{
      workoutExerciseId: string
      exerciseName: string
      suggestedSets: number
      suggestedReps: string
      suggestedWeightKg: number | null
      reasoning: string
    }>
  }

  let toolInput: ClaudeToolInput | null = null

  try {
    const response = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: "tool", name: "propose_session" },
      messages: [
        {
          role: "user",
          content:
            "Propose today's session based on the prescription and history above. Call propose_session once.",
        },
      ],
    })

    // Find the tool_use block.
    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "propose_session") {
        toolInput = block.input as ClaudeToolInput
        break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claude API failed"
    return jsonError(502, `Coach unavailable: ${message}`)
  }

  if (!toolInput) {
    return jsonError(
      502,
      "Coach didn't return a structured suggestion. Try again."
    )
  }

  // Map onto our wire type. We trust the schema for the most part but defend
  // against the model rearranging things — re-key by workoutExerciseId.
  const claudeInput: ClaudeToolInput = toolInput
  const byId = new Map(claudeInput.exercises.map((e) => [e.workoutExerciseId, e]))
  const mapped: ExerciseSuggestion[] = weRows.map((we) => {
    const ex = we.ex!
    const claudeEx = byId.get(we.id)
    return {
      workoutExerciseId: we.id,
      exerciseName: ex.name,
      suggestedSets: claudeEx?.suggestedSets ?? we.sets,
      suggestedReps: claudeEx?.suggestedReps ?? we.prescription,
      suggestedWeightKg:
        claudeEx?.suggestedWeightKg ?? (ex.uses_weight ? we.weight_kg : null),
      reasoning: claudeEx?.reasoning ?? "No specific guidance — give it your usual effort.",
    }
  })

  const suggestion: CoachSuggestion = {
    summary: claudeInput.summary,
    exercises: mapped,
    generatedAt: new Date().toISOString(),
  }

  return new Response(JSON.stringify(suggestion), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
