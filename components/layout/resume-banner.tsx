"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon, Timer01Icon } from "@hugeicons/core-free-icons"
import { useStudentDashboardQuery } from "@/hooks/use-dashboard"

export function ResumeBanner() {
  const pathname = usePathname()
  const isStudentPath = pathname.startsWith("/student")

  const dashboardQuery = useStudentDashboardQuery(isStudentPath)

  const inProgress = dashboardQuery.data?.upcomingAssignments.find(
    (a) => a.submissionStatus === "in_progress" && a.attemptId
  )

  if (!isStudentPath || !inProgress || !inProgress.attemptId) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <HugeiconsIcon icon={Timer01Icon} size={15} className="shrink-0 text-primary" />
        <span className="truncate text-foreground">
          Bạn đang làm dở <span className="font-semibold">{inProgress.examTitle}</span>
        </span>
        <span className="hidden font-mono font-semibold text-primary sm:inline">
          · {inProgress.durationMinutes} phút
        </span>
      </div>
      <Button size="sm" className="h-7 shrink-0 gap-1.5 text-xs font-semibold" asChild>
        <Link href={`/exam/${inProgress.attemptId}`}>
          <HugeiconsIcon icon={PlayIcon} size={13} />
          Tiếp tục
        </Link>
      </Button>
    </div>
  )
}
