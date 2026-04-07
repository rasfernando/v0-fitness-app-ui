// Hand-written for now to match supabase/migrations/0001_initial_schema.sql
// Later: replace with `npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts`
// Keep this file in sync with the migration until then.

export type UserRole = "pt" | "client"
export type DifficultyLevel = "beginner" | "intermediate" | "advanced"
export type RelationshipStatus = "active" | "paused" | "ended"
export type ScheduledStatus = "scheduled" | "completed" | "missed" | "skipped"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          username: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role: UserRole
          username: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      pt_clients: {
        Row: {
          id: string
          pt_id: string
          client_id: string
          status: RelationshipStatus
          started_at: string
          ended_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pt_id: string
          client_id: string
          status?: RelationshipStatus
          started_at?: string
          ended_at?: string | null
          notes?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["pt_clients"]["Insert"]>
      }
      exercises: {
        Row: {
          id: string
          name: string
          category: string
          muscle_group: string | null
          description: string | null
          image_url: string | null
          video_url: string | null
          uses_weight: boolean
          uses_reps: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          muscle_group?: string | null
          description?: string | null
          image_url?: string | null
          video_url?: string | null
          uses_weight?: boolean
          uses_reps?: boolean
          created_by?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>
      }
      workouts: {
        Row: {
          id: string
          pt_id: string
          title: string
          description: string | null
          category: string
          difficulty: DifficultyLevel
          estimated_duration_minutes: number | null
          estimated_calories: number | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pt_id: string
          title: string
          description?: string | null
          category: string
          difficulty?: DifficultyLevel
          estimated_duration_minutes?: number | null
          estimated_calories?: number | null
          image_url?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          position: number
          sets: number
          prescription: string
          weight_kg: number | null
          rest_seconds: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          position: number
          sets: number
          prescription: string
          weight_kg?: number | null
          rest_seconds?: number
          notes?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["workout_exercises"]["Insert"]>
      }
      scheduled_workouts: {
        Row: {
          id: string
          client_id: string
          assigned_by_pt_id: string
          workout_id: string
          scheduled_date: string // YYYY-MM-DD
          status: ScheduledStatus
          notes_for_client: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          assigned_by_pt_id: string
          workout_id: string
          scheduled_date: string
          status?: ScheduledStatus
          notes_for_client?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["scheduled_workouts"]["Insert"]>
      }
      workout_sessions: {
        Row: {
          id: string
          scheduled_workout_id: string
          client_id: string
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scheduled_workout_id: string
          client_id: string
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          notes?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>
      }
      exercise_sets: {
        Row: {
          id: string
          session_id: string
          workout_exercise_id: string
          set_number: number
          reps_completed: number | null
          weight_kg_used: number | null
          rpe: number | null
          completed_at: string
        }
        Insert: {
          id?: string
          session_id: string
          workout_exercise_id: string
          set_number: number
          reps_completed?: number | null
          weight_kg_used?: number | null
          rpe?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["exercise_sets"]["Insert"]>
      }
    }
  }
}
