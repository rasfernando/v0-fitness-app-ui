"use client"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Browser-side Supabase client. Uses the public anon key — all queries run
// under the signed-in user's session and are gated by the RLS policies
// defined in supabase/migrations/0001_initial_schema_squashed.sql.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
