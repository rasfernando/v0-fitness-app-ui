"use client"

import { useState } from "react"
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react"
import { CTAButton } from "@/components/fitness/cta-button"
import { useAuth } from "@/lib/auth"

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
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-10">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-base font-semibold">s</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            spotter
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pt-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">
            {mode === "signin" ? "Welcome back" : "Make an account"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "signin"
              ? "Sign in and we'll pick up where you left off."
              : "Takes about thirty seconds. Just your name, email, and a password."}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 w-full rounded-xl border border-border bg-input pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-xl border border-border bg-input pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="h-14 w-full rounded-xl border border-border bg-input pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
              minLength={6}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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
                Forgot your password?
              </button>
            </div>
          )}

          <CTAButton type="submit" fullWidth loading={loading} className="mt-6 h-14">
            {mode === "signin" ? "Sign in" : "Create account"}
          </CTAButton>
        </form>

        {/* Toggle Mode */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {mode === "signin"
            ? "Don't have an account?"
            : "Already have one?"}{" "}
          <button
            onClick={onToggleMode}
            className="font-medium text-primary hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {mode === "signup" && (
          <p className="mt-6 pb-8 text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <button className="text-primary hover:underline">
              terms
            </button>{" "}
            and{" "}
            <button className="text-primary hover:underline">
              privacy policy
            </button>
            .
          </p>
        )}
      </main>
    </div>
  )
}
