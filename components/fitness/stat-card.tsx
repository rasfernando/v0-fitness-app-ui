"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string
  subtext?: string
  icon: LucideIcon
  trend?: {
    value: string
    positive: boolean
  }
  className?: string
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn(
      "rounded-xl bg-card p-4 ring-1 ring-border transition-colors duration-150 hover:bg-secondary/40",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {trend && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            trend.positive
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {subtext && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{subtext}</p>
        )}
      </div>
    </div>
  )
}
