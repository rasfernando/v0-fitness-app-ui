"use client"

import { Calendar, Dumbbell, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProgrammeCardProps {
  title: string
  description: string
  weeks: number
  workoutsPerWeek: number
  imageUrl: string
  tag?: string
  className?: string
  onClick?: () => void
}

export function ProgrammeCard({
  title,
  description,
  weeks,
  workoutsPerWeek,
  imageUrl,
  tag,
  className,
  onClick,
}: ProgrammeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl bg-card transition-all duration-300 hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {tag && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
            {tag}
          </span>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase leading-tight text-foreground">
            {title}
          </h3>
        </div>
      </div>
      
      <div className="p-4 text-left">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              {weeks} weeks
            </span>
            <span className="flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4 text-primary" />
              {workoutsPerWeek}x/week
            </span>
          </div>
          
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </button>
  )
}
