"use client"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Browser-side Supabase client. We're using the anon key — when RLS is enabled
// later, this client will be subject to row-level security policies. For now
// (no RLS, fake auth) it has full read/write access. Do NOT ship this to real
// users until RLS is on.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
