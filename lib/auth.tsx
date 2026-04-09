"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { supabase } from "@/lib/supabase/client"
import type { UserRole } from "@/lib/supabase/database.types"
import type { Session } from "@supabase/supabase-js"

// ── Public types ──────────────────────────────────────────────────────────────
// Matches the shape every consumer previously got from useDevUser().
// role, displayName, and username come from the profiles table, not auth.
export interface AppUser {
  id: string
  role: UserRole
  displayName: string
  username: string
}

interface AuthContextValue {
  /** The authenticated user + profile, or null while loading / when signed out */
  user: AppUser | null
  /** True while the initial session is being restored on mount */
  loading: boolean
  /** Sign in with email + password. Throws on error. */
  signIn: (email: string, password: string) => Promise<void>
  /** Sign up with email + password + profile metadata. Throws on error. */
  signUp: (input: SignUpInput) => Promise<void>
  /** Sign out. Navigates back to welcome screen via onAuthStateChange. */
  signOut: () => Promise<void>
}

export interface SignUpInput {
  email: string
  password: string
  displayName: string
  username: string
  role: UserRole
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Given a Supabase session, fetch the matching profile and set state.
  const loadProfile = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null)
      setLoading(false)
      return
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, role, display_name, username")
      .eq("id", session.user.id)
      .single()

    if (error || !profile) {
      // Profile might not exist yet if the trigger hasn't fired / propagated.
      // In that case, sign out so the user doesn't get stuck in a broken state.
      console.error("Failed to load profile:", error?.message)
      setUser(null)
    } else {
      setUser({
        id: profile.id,
        role: profile.role,
        displayName: profile.display_name,
        username: profile.username,
      })
    }

    setLoading(false)
  }, [])

  // On mount: restore existing session, then listen for changes.
  useEffect(() => {
    // 1. Restore session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session)
    })

    // 2. Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  // ── Auth methods ────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // onAuthStateChange will fire → loadProfile → setUser
  }, [])

  const signUp = useCallback(async (input: SignUpInput) => {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          username: input.username,
          role: input.role,
        },
      },
    })
    if (error) throw error
    // The DB trigger creates the profile. onAuthStateChange fires → loadProfile.
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // onAuthStateChange will fire → loadProfile(null) → setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// Drop-in replacement for useDevUser(). Every consumer that did:
//   const { user } = useDevUser()
// can now do:
//   const { user } = useAuth()
// and get the same shape ({ id, role, displayName, username }).
//
// The one difference: user can be null (loading or signed out).
// Screens that require auth should check for this.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }
  return ctx
}
