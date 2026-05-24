import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

/**
 * Server-side Supabase client scoped to a specific user's session.
 *
 * The client sends its access token in the Authorization header to our API
 * routes; we hand it to this helper which builds a Supabase client that
 * forwards the token to PostgREST. RLS then enforces "this user can only
 * read/write their own rows" exactly as it does on the browser client.
 *
 * Do not use the service-role key here — that would bypass RLS, which we
 * specifically don't want for user-scoped chat / coach routes.
 *
 * Throws if env vars are missing or the token is malformed.
 */
export function createServerSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }
  if (!accessToken) {
    throw new Error("No access token provided to server Supabase client")
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      // The server doesn't manage sessions — the client is the source of truth.
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Extract a bearer token from a Request's Authorization header.
 * Returns null if missing or malformed (so the caller can 401).
 */
export function getAccessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization")
  if (!auth) return null
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}
