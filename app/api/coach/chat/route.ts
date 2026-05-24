import Anthropic from "@anthropic-ai/sdk"
import {
  createServerSupabaseClient,
  getAccessTokenFromRequest,
} from "@/lib/supabase/server"
import {
  COACH_MODEL,
  HISTORY_MESSAGE_LIMIT,
  buildSystemPrompt,
  summariseSessions,
  summariseScheduled,
  summariseTemplates,
  summariseExercises,
} from "@/lib/coach/prompt"
import { COACH_TOOLS, executeTool } from "@/lib/coach/tools"

// The SDK's MessageParam.content union, narrowed to the block kinds we
// actually emit from the agent loop (text we wrote, tool_use the model
// requested, tool_result we send back). Inline so we don't depend on
// the SDK's volatile internal type names.
type AssistantOrToolBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string }

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RECENT_SESSIONS_TO_LOAD = 8
const MAX_TOOL_ROUNDS = 3 // cap the agent loop so a runaway tool-call sequence can't burn dollars

interface ChatRequestBody {
  message: string
}

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromRequest(request)
  if (!accessToken) {
    return jsonError(401, "Missing or malformed Authorization header")
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return jsonError(
      500,
      "Server is missing ANTHROPIC_API_KEY. Set it in your environment and redeploy."
    )
  }

  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return jsonError(400, "Body must be JSON: { message: string }")
  }
  const userMessage = body.message?.trim()
  if (!userMessage) {
    return jsonError(400, "message is required and must be non-empty")
  }

  const supabase = createServerSupabaseClient(accessToken)

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return jsonError(401, "Invalid or expired access token")
  }
  const userId = authData.user.id

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single()

  const userName = profile?.display_name ?? "there"

  const { error: persistUserErr } = await supabase
    .from("coach_messages")
    .insert({ user_id: userId, role: "user", content: userMessage })

  if (persistUserErr) {
    return jsonError(500, `Failed to save your message: ${persistUserErr.message}`)
  }

  // ── Load context ───────────────────────────────────────────────────────
  const [history, sessions, sets, scheduled, workouts, exercises] = await Promise.all([
    loadHistory(supabase, userId),
    loadRecentSessions(supabase, userId),
    loadRecentSets(supabase, userId),
    loadUpcomingScheduled(supabase, userId),
    loadVisibleWorkouts(supabase),
    loadVisibleExercises(supabase),
  ])

  // Load workout_exercises for every workout the user has upcoming. The AI
  // needs workout_exercise_ids to call customise_session.
  const upcomingWorkoutIds = Array.from(new Set(scheduled.map((s) => s.workout_id)))
  const exercisesByWorkoutId = await loadWorkoutExercisesForWorkouts(
    supabase,
    upcomingWorkoutIds
  )

  const workoutTitleById = new Map(workouts.map((w) => [w.id, w.title]))
  const workoutTitleBySchedId = new Map(
    scheduled.map((s) => [s.id, workoutTitleById.get(s.workout_id) ?? "Workout"])
  )
  const setsBySession = new Map<
    string,
    Array<{
      exercise: string
      setNumber: number
      reps: number | null
      weightKg: number | null
      prescribedReps: string | null
    }>
  >()
  for (const set of sets) {
    const sessId = set.session_id
    const list = setsBySession.get(sessId) ?? []
    list.push({
      exercise: set.exerciseName,
      setNumber: set.set_number,
      reps: set.reps_completed,
      weightKg: set.weight_kg_used,
      prescribedReps: set.prescribed_reps,
    })
    setsBySession.set(sessId, list)
  }

  const ctx = {
    userName,
    recentCompletedSessions: summariseSessions(sessions, setsBySession, workoutTitleBySchedId),
    upcomingScheduled: summariseScheduled(scheduled, workoutTitleById, exercisesByWorkoutId),
    availableTemplates: summariseTemplates(workouts),
    availableExercises: summariseExercises(exercises),
  }

  const systemPrompt = buildSystemPrompt(ctx)

  // ── Anthropic agent loop with streaming ────────────────────────────────
  const anthropic = new Anthropic({ apiKey })

  // Build the running messages array — history + the new user message.
  const messages: Anthropic.Messages.MessageParam[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  messages.push({ role: "user", content: userMessage })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullAssistantReply = "" // accumulates text from all loop iterations for persistence
      let anyToolMutated = false

      try {
        // Agent loop. Each iteration streams Claude's response. If Claude
        // emits tool_use blocks, we execute them and feed results back.
        // Otherwise we're done.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // assistantBlocks captures the structured content of this turn so
          // we can append it to `messages` as the assistant turn before the
          // next user/tool_result turn.
          const assistantBlocks: AssistantOrToolBlock[] = []
          // toolUses captured this round so we can execute them after stream end.
          const toolUses: Array<{
            id: string
            name: string
            input: unknown
          }> = []
          // Partial state as we build content blocks from deltas.
          let currentTextBuffer = ""
          let currentToolJsonBuffer = ""
          let currentToolName: string | null = null
          let currentToolId: string | null = null
          let currentBlockType: "text" | "tool_use" | null = null

          const claudeStream = await anthropic.messages.stream({
            model: COACH_MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            tools: COACH_TOOLS,
            messages,
          })

          for await (const event of claudeStream) {
            if (event.type === "content_block_start") {
              const block = event.content_block
              if (block.type === "text") {
                currentBlockType = "text"
                currentTextBuffer = ""
              } else if (block.type === "tool_use") {
                currentBlockType = "tool_use"
                currentToolName = block.name
                currentToolId = block.id
                currentToolJsonBuffer = ""
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const chunk = event.delta.text
                currentTextBuffer += chunk
                fullAssistantReply += chunk
                controller.enqueue(encoder.encode(chunk))
              } else if (event.delta.type === "input_json_delta") {
                currentToolJsonBuffer += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentBlockType === "text" && currentTextBuffer) {
                assistantBlocks.push({ type: "text", text: currentTextBuffer })
              } else if (
                currentBlockType === "tool_use" &&
                currentToolName &&
                currentToolId
              ) {
                let parsed: unknown = {}
                try {
                  parsed = currentToolJsonBuffer
                    ? JSON.parse(currentToolJsonBuffer)
                    : {}
                } catch (e) {
                  parsed = {}
                  console.error("Failed to parse tool input JSON:", e)
                }
                assistantBlocks.push({
                  type: "tool_use",
                  id: currentToolId,
                  name: currentToolName,
                  input: parsed,
                })
                toolUses.push({
                  id: currentToolId,
                  name: currentToolName,
                  input: parsed,
                })
              }
              currentBlockType = null
              currentTextBuffer = ""
              currentToolJsonBuffer = ""
              currentToolName = null
              currentToolId = null
            }
          }

          // If Claude didn't call any tools, we're done.
          if (toolUses.length === 0) {
            break
          }

          // Otherwise: append the assistant turn (with its tool_use blocks) and
          // execute the tools.
          messages.push({ role: "assistant", content: assistantBlocks })

          // Execute each tool sequentially. Could be parallel but sequential
          // is easier to reason about and the user's scheduling actions usually
          // benefit from being applied in order anyway.
          const toolResultBlocks: AssistantOrToolBlock[] = []
          for (const call of toolUses) {
            const result = await executeTool(supabase, call.name, call.input)
            if (result.mutated) anyToolMutated = true
            toolResultBlocks.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: result.text,
            })
          }

          messages.push({ role: "user", content: toolResultBlocks })
          // Loop continues; Claude will see the tool_result and respond.
        }

        // Persist final assistant reply (text only — tool calls live in DB rows).
        const metadata = anyToolMutated ? { mutated: true } : null
        const { error: persistAsstErr } = await supabase
          .from("coach_messages")
          .insert({
            user_id: userId,
            role: "assistant",
            content: fullAssistantReply,
            metadata,
          })

        if (persistAsstErr) {
          console.error(
            "Coach reply streamed but failed to persist:",
            persistAsstErr.message
          )
        }

        // Trailing marker the client can sniff to know whether to refetch.
        // Plain text protocol — we use a fenced marker that's unlikely to
        // appear in normal model output. The client strips it before display.
        if (anyToolMutated) {
          controller.enqueue(encoder.encode(" MUTATED "))
        }
      } catch (err) {
        console.error("Anthropic stream error:", err)
        const message = err instanceof Error ? err.message : "Stream failed"
        controller.enqueue(encoder.encode(`\n\n[coach error] ${message}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function loadHistory(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const { data } = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_MESSAGE_LIMIT + 1)

  if (!data) return []
  const sorted = data
    .map((m) => ({ role: m.role, content: m.content, created_at: m.created_at }))
    .reverse()
  return sorted.slice(0, -1)
}

async function loadRecentSessions(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(RECENT_SESSIONS_TO_LOAD)
  return data ?? []
}

async function loadRecentSets(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const { data } = await supabase
    .from("exercise_sets")
    .select(`
      session_id,
      set_number,
      reps_completed,
      weight_kg_used,
      prescribed_reps,
      workout_exercises:workout_exercise_id (
        exercises:exercise_id (
          name
        )
      ),
      workout_sessions:session_id (
        user_id,
        completed_at
      )
    `)
    .order("completed_at", { ascending: false })
    .limit(200)

  if (!data) return []

  type Row = (typeof data)[number]
  const flat: Array<Row & { exerciseName: string }> = []
  for (const r of data) {
    const we = Array.isArray(r.workout_exercises) ? r.workout_exercises[0] : r.workout_exercises
    const ex = we ? (Array.isArray(we.exercises) ? we.exercises[0] : we.exercises) : null
    flat.push({ ...r, exerciseName: ex?.name ?? "Exercise" })
  }
  return flat
}

async function loadUpcomingScheduled(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const today = new Date().toISOString().split("T")[0]
  const { data } = await supabase
    .from("scheduled_workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(10)
  return data ?? []
}

async function loadVisibleWorkouts(
  supabase: ReturnType<typeof createServerSupabaseClient>
) {
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .is("deleted_at", null)
    .eq("is_adhoc", false)
    .limit(50)
  return data ?? []
}

async function loadVisibleExercises(
  supabase: ReturnType<typeof createServerSupabaseClient>
) {
  // RLS returns global (created_by IS NULL) + the user's own custom exercises.
  // Cap defensively; 200 rows is far more than we ever expect.
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .limit(200)
  return data ?? []
}

/**
 * Load workout_exercises (with exercise names) for a set of workout ids and
 * return a Map keyed by workout_id. Used to give the AI per-exercise handles
 * (workout_exercise_id) so it can call customise_session.
 */
async function loadWorkoutExercisesForWorkouts(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  workoutIds: string[]
): Promise<
  Map<
    string,
    Array<{
      workoutExerciseId: string
      exerciseName: string
      sets: number
      prescription: string
      weightKg: number | null
    }>
  >
> {
  const result = new Map<
    string,
    Array<{
      workoutExerciseId: string
      exerciseName: string
      sets: number
      prescription: string
      weightKg: number | null
    }>
  >()
  if (workoutIds.length === 0) return result

  const { data } = await supabase
    .from("workout_exercises")
    .select(`
      id,
      workout_id,
      position,
      sets,
      prescription,
      weight_kg,
      exercises:exercise_id (
        name
      )
    `)
    .in("workout_id", workoutIds)
    .order("position", { ascending: true })

  for (const row of data ?? []) {
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises
    const list = result.get(row.workout_id) ?? []
    list.push({
      workoutExerciseId: row.id,
      exerciseName: ex?.name ?? "Exercise",
      sets: row.sets,
      prescription: row.prescription,
      weightKg: row.weight_kg,
    })
    result.set(row.workout_id, list)
  }
  return result
}
