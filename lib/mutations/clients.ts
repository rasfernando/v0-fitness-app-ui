"use client"

import { supabase } from "@/lib/supabase/client"

/**
 * Creates a pt_clients relationship between a PT and a client.
 * Throws if the relationship already exists or on any DB error.
 */
export async function addClientRelationship(ptId: string, clientId: string) {
  const { error } = await supabase.from("pt_clients").insert({
    pt_id: ptId,
    client_id: clientId,
    status: "active",
  })

  if (error) throw error
}

/**
 * Searches profiles with role='client' that are NOT already coached by this PT.
 * Returns up to 20 results matching the search query (name or username).
 */
export async function searchAvailableClients(
  ptId: string,
  query: string
): Promise<{ id: string; displayName: string; username: string; avatarUrl: string | null }[]> {
  // First, get IDs of clients already linked to this PT
  const { data: existing } = await supabase
    .from("pt_clients")
    .select("client_id")
    .eq("pt_id", ptId)
    .eq("status", "active")

  const existingIds = new Set((existing ?? []).map((r) => r.client_id))

  // Search for client-role profiles matching the query
  // We use ilike for case-insensitive partial matching
  let queryBuilder = supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("role", "client")
    .limit(30)

  if (query.trim()) {
    queryBuilder = queryBuilder.or(
      `display_name.ilike.%${query}%,username.ilike.%${query}%`
    )
  }

  const { data: profiles, error } = await queryBuilder

  if (error) throw error

  // Filter out already-coached clients client-side (simpler than a NOT IN subquery via PostgREST)
  return (profiles ?? [])
    .filter((p) => !existingIds.has(p.id) && p.id !== ptId)
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      displayName: p.display_name,
      username: p.username,
      avatarUrl: p.avatar_url,
    }))
}
