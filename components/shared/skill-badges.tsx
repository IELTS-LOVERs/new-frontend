import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SkillType } from "@/lib/api/types"

/** Display order for skills (IELTS test order) and their short label. */
const SKILL_DISPLAY_ORDER: SkillType[] = ["listening", "reading", "writing"]

const SKILL_LABEL: Record<SkillType, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
}

const SKILL_TONE: Record<SkillType, string> = {
  listening: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  reading: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  writing: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
}

/**
 * Normalises an arbitrary skill list into a stable, deduplicated order so the
 * same exam always renders the same chips (backend order is not guaranteed).
 */
export function orderSkills(skills: readonly string[] | null | undefined): SkillType[] {
  const present = new Set(skills ?? [])
  return SKILL_DISPLAY_ORDER.filter((skill) => present.has(skill))
}

export function SkillBadges({
  skills,
  className,
  emptyLabel = "—",
}: {
  skills: readonly string[] | null | undefined
  className?: string
  emptyLabel?: React.ReactNode
}) {
  const ordered = orderSkills(skills)

  if (ordered.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {ordered.map((skill) => (
        <Badge
          key={skill}
          variant="outline"
          className={cn("px-2 py-0.5 text-[11px] font-medium ring-0", SKILL_TONE[skill])}
        >
          {SKILL_LABEL[skill]}
        </Badge>
      ))}
    </div>
  )
}
