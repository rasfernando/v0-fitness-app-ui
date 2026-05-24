"use client"

import { cn } from "@/lib/utils"

interface FilterChipsProps {
  options: string[]
  selected: string
  onSelect: (option: string) => void
  className?: string
}

export function FilterChips({
  options,
  selected,
  onSelect,
  className,
}: FilterChipsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            selected === option
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
