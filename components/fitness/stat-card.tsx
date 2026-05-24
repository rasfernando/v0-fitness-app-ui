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
      "rounded-xl bg-card p-4 transition-all duration-300 hover:bg-secondary",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            trend.positive 
              ? "bg-emerald-500/10 text-emerald-400" 
              : "bg-red-500/10 text-red-400"
          )}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
      
      <div className="mt-3">
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground/70">{subtext}</p>
        )}
      </div>
    </div>
  )
}
