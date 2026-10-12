"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Book02Icon,
  PlayIcon,
  Timer01Icon,
  Award01Icon,
  Calendar01Icon,
  SchoolIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { DEMO_STUDENT, DEMO_STUDENT_DASHBOARD, DEMO_STUDENT_CLASSES, DEMO_STUDENT_ANALYTICS } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { useStudentDashboardQuery } from "@/hooks/use-dashboard"
import { useStudentProgressQuery } from "@/hooks/use-analytics"
import { useClassesQuery } from "@/hooks/use-classes"
import { formatBand, formatDateShort, deadlineLabel, greeting } from "@/lib/format"
import { useAuthStore } from "@/stores/auth.store"
import type { MyAssignment, ClassSummary } from "@/lib/api/types"

function teacherNameOf(cls: ClassSummary): string | null {
  const t = (cls as ClassSummary & { teacher?: { fullName?: string } }).teacher
  return t?.fullName ?? null
}

function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiError
      ? error.message
      : "Không tải được dữ liệu tổng quan."
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
      <p className="text-sm font-medium text-foreground">Không tải được dữ liệu</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium" onClick={onRetry}>
        <HugeiconsIcon icon={RefreshIcon} size={14} />
        <span>Thử lại</span>
      </Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function StudentDashboardPage() {
  const authUser = useAuthStore((s) => s.user)
  const currentUser = authUser ?? DEMO_STUDENT

  const dashboardQuery = useStudentDashboardQuery(!USE_MOCKS)
  const progressQuery = useStudentProgressQuery(undefined, !USE_MOCKS)
  const classesQuery = useClassesQuery(!USE_MOCKS)

  if (!USE_MOCKS) {
    if (dashboardQuery.isLoading || progressQuery.isLoading || classesQuery.isLoading) {
      return <DashboardSkeleton />
    }
    if (dashboardQuery.isError) {
      return (
        <div className="mx-auto max-w-6xl space-y-6">
          <DashboardError error={dashboardQuery.error} onRetry={() => dashboardQuery.refetch()} />
        </div>
      )
    }
  }

  const dashboard = USE_MOCKS ? DEMO_STUDENT_DASHBOARD : dashboardQuery.data
  const progress = USE_MOCKS ? DEMO_STUDENT_ANALYTICS : progressQuery.data
  const classes = USE_MOCKS ? DEMO_STUDENT_CLASSES : (classesQuery.data ?? [])
  const targetBand = progress?.targetBand ?? currentUser.targetBand

  const upcoming = (dashboard?.upcomingAssignments ?? []).slice(0, 5)
  const recentAttempts = dashboard?.recentAttempts ?? []

  // Hero "Việc tiếp theo"
  const inProgressItem = (dashboard?.upcomingAssignments ?? []).find(
    (a) => a.submissionStatus === "in_progress" && a.attemptId
  )
  const notStartedSorted = (dashboard?.upcomingAssignments ?? [])
    .filter((a) => a.submissionStatus === "not_started")
    .sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    })
  const nextTodo = notStartedSorted[0]

  const hasNoClasses = !USE_MOCKS && classesQuery.isSuccess && classes.length === 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="font-heading text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
          {greeting()}, {currentUser.fullName}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Đây là tổng quan tiến độ học tập của bạn.
        </p>
      </div>

      {/* Active Work In Progress (Next Action Hero) */}
      {inProgressItem ? (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <StatusBadge status="in_progress" label="Đang làm dở" />
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <HugeiconsIcon icon={Timer01Icon} size={14} />
                  {inProgressItem.durationMinutes} phút làm bài
                </span>
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {inProgressItem.examTitle}
              </h2>
              <p className="text-xs text-muted-foreground leading-normal">
                {inProgressItem.className
                  ? `Lớp ${inProgressItem.className}`
                  : "Bài tập được giao trực tiếp"}
                {inProgressItem.deadline ? ` · ${deadlineLabel(inProgressItem.deadline)}` : ""}
              </p>
            </div>

            <div className="sm:shrink-0">
              <Button size="default" className="w-full sm:w-auto font-medium gap-2" asChild>
                <Link href={`/exam/${inProgressItem.attemptId}`}>
                  <HugeiconsIcon icon={PlayIcon} size={15} />
                  <span>Tiếp tục làm bài</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : nextTodo ? (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <StatusBadge status="info" label="Việc tiếp theo" />
                {nextTodo.deadline && (
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <HugeiconsIcon icon={Timer01Icon} size={14} />
                    {deadlineLabel(nextTodo.deadline)}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {nextTodo.examTitle}
              </h2>
              <p className="text-xs text-muted-foreground leading-normal">
                {nextTodo.durationMinutes} phút
                {nextTodo.className ? ` · Lớp ${nextTodo.className}` : ""}
              </p>
            </div>

            <div className="sm:shrink-0">
              <Button size="default" className="w-full sm:w-auto font-medium gap-2" asChild>
                <Link href={`/exam/start/${nextTodo.id}`}>
                  <HugeiconsIcon icon={PlayIcon} size={15} />
                  <span>Bắt đầu</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : hasNoClasses ? (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                Bạn chưa tham gia lớp học nào
              </h2>
              <p className="text-xs text-muted-foreground leading-normal">
                Nhập mã lớp do giáo viên cung cấp để nhận bài tập và đề thi.
              </p>
            </div>

            <div className="sm:shrink-0">
              <Button size="default" className="w-full sm:w-auto font-medium gap-2" asChild>
                <Link href="/student/classes">
                  <HugeiconsIcon icon={SchoolIcon} size={15} />
                  <span>Tham gia lớp học</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 transition-colors">
          <div className="space-y-1.5 min-w-0">
            <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Không còn bài tập nào cần làm
            </h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Bạn đã hoàn thành tất cả bài tập được giao. Bài mới sẽ hiện ở đây.
            </p>
          </div>
        </div>
      )}

      {/* KPI Scores Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Overall Band"
          value={formatBand(progress?.latest?.overall)}
          hint={
            targetBand != null
              ? `Mục tiêu: Band ${formatBand(targetBand)} (${
                  progress && progress.deltaFromTarget > 0 ? "+" : ""
                }${progress?.deltaFromTarget?.toFixed(1) ?? "—"})`
              : undefined
          }
          accent
          icon={Award01Icon}
        />
        <StatCard
          label="Listening"
          value={formatBand(progress?.latest?.listening)}
          icon={Book02Icon}
        />
        <StatCard
          label="Reading"
          value={formatBand(progress?.latest?.reading)}
          icon={Book02Icon}
        />
        <StatCard
          label="Writing"
          value={formatBand(progress?.latest?.writing)}
          icon={Book02Icon}
        />
      </div>

      {/* Upcoming Assignments Section (Flat List without nested card borders) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Bài tập sắp đến hạn
            </h3>
            <p className="text-xs text-muted-foreground">
              Các bài thi được giao cần hoàn thành
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-medium h-8">
            <Link href="/student/assignments" className="flex items-center gap-1">
              <span>Xem tất cả</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </Link>
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
            Giáo viên chưa giao bài nào. Bài mới sẽ hiện ở đây.
          </div>
        ) : (
          <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
            {upcoming.map((assignment: MyAssignment) => (
              <div
                key={assignment.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {assignment.examTitle}
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-mono px-1.5 py-0">
                      {assignment.durationMinutes} phút
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {assignment.className ? `Lớp ${assignment.className}` : "Giao trực tiếp"}
                    {" · "}GV: {assignment.teacherName}
                  </p>
                  <div className="text-xs text-destructive font-medium flex items-center gap-1">
                    <HugeiconsIcon icon={Calendar01Icon} size={13} />
                    <span>
                      Hạn nộp: {formatDateShort(assignment.deadline)}
                      {assignment.deadline ? ` (${deadlineLabel(assignment.deadline)})` : ""}
                    </span>
                  </div>
                </div>

                <div className="sm:shrink-0">
                  {assignment.submissionStatus === "in_progress" && assignment.attemptId ? (
                    <Button size="sm" asChild className="gap-1.5 font-medium text-xs">
                      <Link href={`/exam/${assignment.attemptId}`}>
                        <HugeiconsIcon icon={PlayIcon} size={14} />
                        <span>Tiếp tục làm bài</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild className="gap-1.5 font-medium text-xs">
                      <Link href={`/exam/start/${assignment.id}`}>
                        <HugeiconsIcon icon={Book02Icon} size={14} />
                        <span>Bắt đầu thi</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrolled Classes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Lớp học đang tham gia
            </h3>
            <p className="text-xs text-muted-foreground">
              Các lớp học bạn đang theo học cùng giáo viên phụ trách
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-medium h-8">
            <Link href="/student/classes" className="flex items-center gap-1">
              <span>Xem tất cả lớp</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </Link>
          </Button>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
            Bạn chưa tham gia lớp học nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map((cls) => {
              const teacherName = teacherNameOf(cls as ClassSummary)
              return (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HugeiconsIcon icon={SchoolIcon} size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {cls.name}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {teacherName
                          ? `GV: ${teacherName} · ${cls.studentsCount} học sinh`
                          : `${cls.studentsCount} học sinh`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-medium shrink-0 ml-3" asChild>
                    <Link href={`/student/classes/${cls.id}`}>
                      <span>Vào lớp</span>
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Results Section (Direct Table without wrapping inside Card) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Kết quả thi gần đây
            </h3>
            <p className="text-xs text-muted-foreground">
              Lịch sử điểm số các bài thi đã nộp
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-medium h-8">
            <Link href="/student/results" className="flex items-center gap-1">
              <span>Toàn bộ lịch sử</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tên bài thi</TableHead>
                <TableHead className="text-center font-mono text-xs w-24">Listening</TableHead>
                <TableHead className="text-center font-mono text-xs w-24">Reading</TableHead>
                <TableHead className="text-center font-mono text-xs w-24">Writing</TableHead>
                <TableHead className="text-center font-mono text-xs w-24">Overall</TableHead>
                <TableHead className="text-xs hidden sm:table-cell w-32">Ngày nộp</TableHead>
                <TableHead className="text-right text-xs w-28">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                    Chưa có bài thi nào đã nộp.
                  </TableCell>
                </TableRow>
              ) : (
                recentAttempts.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-xs sm:text-sm text-foreground">
                      {item.examTitle}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-medium">
                      {formatBand(item.scores?.listeningBand)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-medium">
                      {formatBand(item.scores?.readingBand)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-medium">
                      {formatBand(item.scores?.writingBand)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                      {formatBand(item.scores?.overallBand)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                      {formatDateShort(item.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs font-medium px-2.5" asChild>
                        <Link href={`/student/results/${item.id}`}>Xem bài</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
