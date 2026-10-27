"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface AttemptsCellProps {
  attemptsCount: number
  activeAttemptsCount: number
  className?: string
}

/**
 * Compact attempt counter for teacher tables.
 *
 * Shows the total number of attempts plus how many are still in progress, so a
 * teacher can tell at a glance whether editing an exam will reach students who
 * are currently taking it.
 */
export function AttemptsCell({
  attemptsCount,
  activeAttemptsCount,
  className,
}: AttemptsCellProps) {
  if (attemptsCount <= 0) {
    return <span className={cn("text-muted-foreground/70", className)}>—</span>
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-mono tabular-nums">{attemptsCount}</span>
      {activeAttemptsCount > 0 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
          <HugeiconsIcon icon={Loading03Icon} size={10} className="animate-spin" />
          {activeAttemptsCount} đang làm
        </span>
      )}
    </span>
  )
}
