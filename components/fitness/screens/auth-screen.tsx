"use client"

import { useState } from "react"
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react"
import { CTAButton } from "@/components/fitness/cta-button"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/supabase/database.types"

interface AuthScreenProps {
  mode: "signin" | "signup"
  onBack: () => void
  onSuccess: () => void
  onToggleMode: () => void
}

export function AuthScreen({ mode, onBack, onSuccess, onToggleMode }: AuthScreenProps) {
  const { signIn, signUp } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRole>("client")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "signin") {
        await signIn(email, password)
      } else {
        // Generate a username from the display name
        const username = name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 20)

        await signUp({
          email,
          password,
          displayName: name.trim(),
          username: username || `user_${Date.now()}`,
          role,
        })
      }
      onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80"
          alt="Gym background"
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="font-[family-name:var(--font-display)] text-sm font-bold text-primary-foreground">
              F
            </span>
          </div>
          <span className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wider text-foreground">
            Forge
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pt-12">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-foreground">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue your fitness journey"
              : "Join the community and start transforming"}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 w-full rounded-xl bg-input pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* Role picker */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all",
                    role === "client"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  I&apos;m a Client
                </button>
                <button
                  type="button"
                  onClick={() => setRole("pt")}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all",
                    role === "pt"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  I&apos;m a Trainer
                </button>
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-xl bg-input pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-xl bg-input pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {mode === "signin" && (
            <div className="text-right">
              <button type="button" className="text-sm text-primary hover:underline">
                Forgot Password?
              </button>
            </div>
          )}

          <CTAButton type="submit" fullWidth loading={loading} className="mt-6 h-14">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </CTAButton>
        </form>

        {/* Toggle Mode */}
        <p className="mt-8 text-center text-muted-foreground">
          {mode === "signin"
            ? "Don't have an account?"
            : "Already have an account?"}{" "}
          <button
            onClick={onToggleMode}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </button>
        </p>

        {mode === "signup" && (
          <p className="mt-6 pb-8 text-center text-xs text-muted-foreground">
            By signing up, you agree to our{" "}
            <button className="text-primary hover:underline">
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="text-primary hover:underline">
              Privacy Policy
            </button>
          </p>
        )}
      </main>
    </div>
  )
}
