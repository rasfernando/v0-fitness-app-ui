// Shared shape of the user's training goals, stored as jsonb on profiles.goals.
// All fields optional. The AI may fill these in incrementally over time, and
// the user can update any subset by chatting with the coach.

export type Experience = "beginner" | "intermediate" | "advanced"

export type PrimaryAim =
  | "stronger"
  | "muscle"
  | "general"
  | "lose_weight"
  | "performance"
  | "other"

export type Equipment =
  | "full_gym"
  | "home_basic"
  | "home_loaded"
  | "bodyweight"
  | "other"

export interface UserGoals {
  experience?: Experience
  primary_aim?: PrimaryAim
  frequency_per_week?: number
  equipment?: Equipment
  session_minutes?: number
  notes?: string
}

// Human-readable labels for displaying goals on the profile screen and in
// the coach's context prompt.

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

export const PRIMARY_AIM_LABELS: Record<PrimaryAim, string> = {
  stronger: "Get stronger",
  muscle: "Build muscle",
  general: "General fitness & health",
  lose_weight: "Lose weight",
  performance: "Train for a sport or event",
  other: "Other",
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  full_gym: "Full gym",
  home_basic: "Home — basic kit",
  home_loaded: "Home — well-equipped",
  bodyweight: "Bodyweight only",
  other: "Other",
}

/**
 * Returns true if the user has set at least the three "core" fields that
 * unlock useful coach behaviour. Used by the coach prompt to decide whether
 * to stay in onboarding mode or move on to building workouts.
 */
export function hasCoreGoals(goals: UserGoals | null | undefined): boolean {
  if (!goals) return false
  return Boolean(goals.experience && goals.primary_aim && goals.frequency_per_week)
}

/**
 * Read goals safely from a profiles.goals JSON blob. Returns an empty object
 * if the blob is null, malformed, or missing. Never throws.
 */
export function parseUserGoals(raw: unknown): UserGoals {
  if (!raw || typeof raw !== "object") return {}
  const r = raw as Record<string, unknown>
  const result: UserGoals = {}

  if (typeof r.experience === "string" &&
      ["beginner", "intermediate", "advanced"].includes(r.experience)) {
    result.experience = r.experience as Experience
  }
  if (typeof r.primary_aim === "string" &&
      ["stronger", "muscle", "general", "lose_weight", "performance", "other"].includes(r.primary_aim)) {
    result.primary_aim = r.primary_aim as PrimaryAim
  }
  if (typeof r.frequency_per_week === "number" &&
      r.frequency_per_week >= 1 && r.frequency_per_week <= 7) {
    result.frequency_per_week = r.frequency_per_week
  }
  if (typeof r.equipment === "string" &&
      ["full_gym", "home_basic", "home_loaded", "bodyweight", "other"].includes(r.equipment)) {
    result.equipment = r.equipment as Equipment
  }
  if (typeof r.session_minutes === "number" &&
      r.session_minutes >= 10 && r.session_minutes <= 240) {
    result.session_minutes = r.session_minutes
  }
  if (typeof r.notes === "string" && r.notes.trim().length > 0) {
    result.notes = r.notes
  }

  return result
}
