"use client"

import { Clock, Zap, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkoutCardProps {
  title: string
  category: string
  duration: string
  calories: string
  imageUrl: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  className?: string
  onClick?: () => void
}

export function WorkoutCard({
  title,
  category,
  duration,
  calories,
  imageUrl,
  difficulty,
  className,
  onClick,
}: WorkoutCardProps) {
  // Single accent for the active level, quiet pills for the rest.
  const difficultyColor = {
    Beginner: "bg-secondary text-muted-foreground",
    Intermediate: "bg-primary/10 text-primary",
    Advanced: "bg-secondary text-foreground",
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl bg-card transition-all duration-300 hover:scale-[1.02] hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <span className={cn(
          "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium",
          difficultyColor[difficulty]
        )}>
          {difficulty}
        </span>
      </div>
      
      <div className="p-4 text-left">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {category}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight leading-snug text-foreground">
          {title}
        </h3>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {duration}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            {calories}
          </span>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  )
}
