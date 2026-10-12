import * as React from "react"
import { cn } from "@/lib/utils"
import { formatBand } from "@/lib/format"
import type { SkillType } from "@/lib/api/types"

interface BandBadgeProps {
  value?: number | null
  skill?: SkillType
  size?: "sm" | "md"
  className?: string
}

export function BandBadge({ value, skill, size = "md", className }: BandBadgeProps) {
  const hasValue = value !== null && value !== undefined
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-mono font-bold tabular-nums",
        size === "sm" ? "h-6 min-w-11 px-1.5 text-xs" : "h-8 min-w-14 px-2 text-sm",
        hasValue
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground",
        className
      )}
      style={
        hasValue && skill
          ? {
              color: `var(--chart-${skill === "listening" ? 1 : skill === "reading" ? 2 : 3})`,
              borderColor: `color-mix(in oklch, var(--chart-${skill === "listening" ? 1 : skill === "reading" ? 2 : 3}) 25%, transparent)`,
              backgroundColor: `color-mix(in oklch, var(--chart-${skill === "listening" ? 1 : skill === "reading" ? 2 : 3}) 12%, transparent)`,
            }
          : undefined
      }
    >
      {formatBand(value)}
    </span>
  )
}
