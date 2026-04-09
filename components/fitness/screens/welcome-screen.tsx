"use client"

import { CTAButton } from "@/components/fitness/cta-button"

interface WelcomeScreenProps {
  onGetStarted: () => void
  onSignIn: () => void
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[75vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80"
            alt="Athlete training"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>

        <div className="relative flex h-full flex-col justify-between px-6 pt-12 pb-8">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-primary-foreground">
                  F
                </span>
              </div>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wider text-foreground">
                Forge
              </span>
            </div>
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              Sign In
            </button>
          </div>

          {/* Hero Content */}
          <div className="space-y-6">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold uppercase leading-tight text-foreground md:text-5xl">
                Your Training, Elevated
              </h1>
              <p className="mt-4 max-w-md text-base text-muted-foreground">
                Personalised programmes from your coach. Track workouts, log progress, and hit your goals — all in one place.
              </p>
            </div>

            <CTAButton onClick={onGetStarted} size="lg">
              Get Started
            </CTAButton>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-24 pt-10">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Ready to Start?
          </h3>
          <p className="mt-2 text-muted-foreground">
            Sign up as a client or a trainer
          </p>
          <CTAButton onClick={onGetStarted} fullWidth className="mt-6">
            Create Account
          </CTAButton>
          <button
            onClick={onSignIn}
            className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign In
          </button>
        </div>
      </section>
    </div>
  )
}
