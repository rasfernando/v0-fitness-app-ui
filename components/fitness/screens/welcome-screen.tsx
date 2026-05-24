"use client"

import { CTAButton } from "@/components/fitness/cta-button"

interface WelcomeScreenProps {
  onGetStarted: () => void
  onSignIn: () => void
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Top bar with wordmark + sign-in shortcut */}
      <header className="flex items-center justify-between px-6 pt-10">
        <Wordmark />
        <button
          onClick={onSignIn}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </button>
      </header>

      {/* Soft hero — tinted block + big confident type, no athlete photo */}
      <section className="flex flex-1 flex-col justify-center px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            A friendlier fitness app
          </p>
          <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] text-foreground sm:text-5xl">
            Training with someone in your corner.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Spotter is a calm, helpful training partner for people who want to
            get stronger without the gym-bro nonsense. Plan sessions, log lifts,
            and chat with an AI that actually pays attention to how you train.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <CTAButton onClick={onGetStarted} fullWidth size="lg">
            Get started — it&apos;s free
          </CTAButton>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={onSignIn}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </section>

      {/* Quiet footer marker */}
      <footer className="px-6 pb-10 pt-4">
        <p className="text-center text-xs text-muted-foreground">
          No personal trainer required. No transformation timelines.
        </p>
      </footer>
    </div>
  )
}

// ─── Brand wordmark ─────────────────────────────────────────────────────────
// A subtle "S" in a softly rounded square, plus the wordmark in lowercase.
// Avoids the "stamped logo" energy of all-caps inside a hard square.

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <span className="text-base font-semibold">s</span>
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        spotter
      </span>
    </div>
  )
}
