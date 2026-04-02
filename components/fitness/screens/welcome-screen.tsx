"use client"

// Welcome screen - fitness app
import { Play, Star, Users, Award } from "lucide-react"
import { CTAButton } from "@/components/fitness/cta-button"

interface WelcomeScreenProps {
  onGetStarted: () => void
  onSignIn: () => void
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[70vh] overflow-hidden">
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
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-primary-foreground">F</span>
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
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Coach Marcus Thompson
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold uppercase leading-tight text-foreground md:text-5xl">
                Transform Your Body, Elevate Your Life
              </h1>
              <p className="mt-4 max-w-md text-base text-muted-foreground">
                Elite training programs designed to push your limits and unlock your full potential.
              </p>
            </div>
            
            <div className="flex gap-4">
              <CTAButton onClick={onGetStarted} size="lg">
                Start Free Trial
              </CTAButton>
              <CTAButton variant="outline" size="lg">
                <Play className="h-5 w-5" />
                Watch
              </CTAButton>
            </div>
          </div>
        </div>
      </section>
      
      {/* Social Proof */}
      <section className="border-y border-border bg-secondary/50 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">15K+</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">4.9</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">10+</p>
              <p className="text-xs text-muted-foreground">Years Exp</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Workouts */}
      <section className="px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
            Featured Workouts
          </h2>
          <button className="text-sm font-medium text-primary">View All</button>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="group relative overflow-hidden rounded-xl bg-card transition-transform hover:scale-105">
            <img
              src="https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&auto=format&fit=crop&q=80"
              alt="HIIT Burn"
              className="h-48 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="text-right">
                <span className="rounded-full bg-primary/20 px-2 py-1 text-xs font-semibold uppercase text-primary">
                  Advanced
                </span>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                  HIIT Burn
                </h3>
                <p className="text-sm text-muted-foreground">30 min • 450 cal</p>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl bg-card transition-transform hover:scale-105">
            <img
              src="https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=600&auto=format&fit=crop&q=80"
              alt="Strength Foundations"
              className="h-48 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="text-right">
                <span className="rounded-full bg-primary/20 px-2 py-1 text-xs font-semibold uppercase text-primary">
                  Beginner
                </span>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                  Strength Foundations
                </h3>
                <p className="text-sm text-muted-foreground">45 min • 320 cal</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonial */}
      <section className="px-6 py-8">
        <div className="rounded-xl bg-card p-6">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
            ))}
          </div>
          <blockquote className="mt-4 text-base italic text-foreground">
            &ldquo;Coach Marcus completely changed my approach to fitness. Down 30lbs and stronger than ever!&rdquo;
          </blockquote>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary" />
            <div>
              <p className="font-semibold text-foreground">Sarah J.</p>
              <p className="text-sm text-muted-foreground">Lost 30lbs in 4 months</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom CTA */}
      <section className="px-6 pb-24 pt-8">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Ready to Transform?
          </h3>
          <p className="mt-2 text-muted-foreground">
            Start your 7-day free trial today
          </p>
          <CTAButton onClick={onGetStarted} fullWidth className="mt-6">
            Get Started Free
          </CTAButton>
        </div>
      </section>
    </div>
  )
}
