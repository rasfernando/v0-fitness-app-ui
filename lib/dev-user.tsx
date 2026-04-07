"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Hardcoded user IDs from supabase/migrations/0001_initial_schema.sql seed block.
// When real auth lands, this whole file gets replaced with a Supabase auth
// session hook — but every consumer of useDevUser() keeps working as-is
// because the shape is the same: { id, role, displayName }.

export const DEV_USERS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    role: "pt" as const,
    displayName: "Sam Carter",
    username: "coach_sam",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    role: "client" as const,
    displayName: "Alex Johnson",
    username: "alex_j",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    role: "client" as const,
    displayName: "Jordan Miller",
    username: "jordan_m",
  },
] as const

export type DevUser = (typeof DEV_USERS)[number]

interface DevUserContextValue {
  user: DevUser
  setUserId: (id: string) => void
}

const DevUserContext = createContext<DevUserContextValue | null>(null)

const STORAGE_KEY = "dev-user-id"

export function DevUserProvider({ children }: { children: ReactNode }) {
  // Default to the PT so the first thing you see is PT view.
  const [userId, setUserIdState] = useState<string>(DEV_USERS[0].id)

  // Persist the chosen dev user across page reloads.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && DEV_USERS.some((u) => u.id === stored)) {
      setUserIdState(stored)
    }
  }, [])

  const setUserId = (id: string) => {
    setUserIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const user = DEV_USERS.find((u) => u.id === userId) ?? DEV_USERS[0]

  return (
    <DevUserContext.Provider value={{ user, setUserId }}>
      {children}
    </DevUserContext.Provider>
  )
}

export function useDevUser() {
  const ctx = useContext(DevUserContext)
  if (!ctx) {
    throw new Error("useDevUser must be used inside <DevUserProvider>")
  }
  return ctx
}
