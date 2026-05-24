// Shared types between the suggest-session route, the hook, and the UI.
// Single source of truth so the three never drift.

export interface ExerciseSuggestion {
  /** workout_exercises.id — needed if the UI ever wants to apply changes back. */
  workoutExerciseId: string
  /** Display name of the underlying exercise. */
  exerciseName: string
  /** Coach's proposed number of working sets for today. */
  suggestedSets: number
  /** Coach's proposed rep target (free text — "5", "8-10", "AMRAP", "30s"). */
  suggestedReps: string
  /** Coach's proposed working weight. null = bodyweight / time-based / no weight. */
  suggestedWeightKg: number | null
  /** One-sentence "why" the coach gave for this prescription. */
  reasoning: string
}

export interface CoachSuggestion {
  /** Two-sentence high-level take on the session. */
  summary: string
  /** Per-exercise prescription. Same order as the template. */
  exercises: ExerciseSuggestion[]
  /** ISO timestamp the suggestion was generated. */
  generatedAt: string
}
