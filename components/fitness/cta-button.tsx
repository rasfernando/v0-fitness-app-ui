"use client"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

interface CTAButtonProps {
  children: React.ReactNode
  type?: "button" | "submit" | "reset"   // ← add this
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export function CTAButton({
  children,
  type = "button",   // ← add this
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className,
  onClick,
}: CTAButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
  }

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
