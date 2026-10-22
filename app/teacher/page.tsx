"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import { PageHeader } from "@/components/shared/page-header"
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
  UserIcon,
  Book02Icon,
  PencilEdit02Icon,
  Award01Icon,
  Alert02Icon,
  ArrowRight01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  SchoolIcon,
} from "@hugeicons/core-free-icons"
import { ApiError } from "@/lib/api/client"
import { useTeacherDashboardQuery } from "@/hooks/use-dashboard"
import { usePendingGradingQuery } from "@/hooks/use-grading"
import { useSuspiciousAttemptsQuery } from "@/hooks/use-admin"
import { useExamsQuery } from "@/hooks/use-exams"
import { useTeacherAssignmentsQuery } from "@/hooks/use-assignments"
import { useClassesQuery } from "@/hooks/use-classes"
import { useClassAnalyticsQueries } from "@/hooks/use-analytics"
import { formatBand, formatDate, deadlineLabel } from "@/lib/format"

function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Không tải được dữ liệu tổng quan."
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
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export default function TeacherDashboardPage() {
  const dashboardQuery = useTeacherDashboardQuery()
  const pendingQuery = usePendingGradingQuery()
  const suspiciousQuery = useSuspiciousAttemptsQuery(5)
  const draftExamsQuery = useExamsQuery({ status: "draft", limit: 5 })
  const assignmentsQuery = useTeacherAssignmentsQuery({ limit: 20 })
  const classesQuery = useClassesQuery()
  const publishedExamsQuery = useExamsQuery({ status: "published", limit: 1 })

  const classes = classesQuery.data ?? []
  const classAnalyticsQueries = useClassAnalyticsQueries(
    classes.slice(0, 5).map((c) => c.id),
    classes.length > 0
  )

  if (dashboardQuery.isLoading || pendingQuery.isLoading || classesQuery.isLoading) {
    return <DashboardSkeleton />
  }
  if (dashboardQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <DashboardError error={dashboardQuery.error} onRetry={() => dashboardQuery.refetch()} />
      </div>
    )
  }

  const stats = dashboardQuery.data
  const pendingItems = pendingQuery.data?.items ?? []
  const pendingCount = pendingQuery.data?.totalPending ?? pendingItems.length
  const suspicious = suspiciousQuery.data ?? []
  const draftExams = draftExamsQuery.data?.items ?? []
  const assignments = assignmentsQuery.data?.items ?? []
  const publishedExamsCount =
    publishedExamsQuery.data?.meta?.total ?? publishedExamsQuery.data?.items.length ?? 0

  const firstPending = pendingItems[0]

  // Setup checklist (T0): ẩn khi đã có ≥1 lớp, ≥1 đề published, ≥1 assignment
  const hasClasses = classes.length > 0
  const hasPublishedExam = publishedExamsCount > 0
  const hasAssignment = (assignmentsQuery.data?.meta?.total ?? assignments.length) > 0
  const showSetup = !hasClasses || !hasPublishedExam || !hasAssignment

  // Việc cần làm
  const upcomingDeadline = assignments
    .filter((a) => a.deadline && a.status === "active")
    .sort(
      (a, b) =>
        new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime()
    )[0]

  const todos: Array<{
    key: string
    icon: typeof Award01Icon
    label: string
    href: string
    actionLabel: string
  }> = []
  if (pendingCount > 0) {
    todos.push({
      key: "grading",
      icon: Award01Icon,
      label: `${pendingCount} bài Writing chờ chấm`,
      href: firstPending ? `/teacher/grading/${firstPending.attemptId}` : "/teacher/submissions",
      actionLabel: "Bắt đầu chấm",
    })
  }
  if (suspicious.length > 0) {
    todos.push({
      key: "suspicious",
      icon: Alert02Icon,
      label: `${suspicious.length} bài cần kiểm tra hành vi bất thường`,
      href: "/teacher/submissions?tab=suspicious",
      actionLabel: "Xem",
    })
  }
  if (upcomingDeadline?.deadline) {
    const title =
      upcomingDeadline.examTitle ||
      (typeof upcomingDeadline.examId === "object" && (upcomingDeadline.examId as any)?.title) ||
      "Bài tập"
    const stats = upcomingDeadline.stats
    const hasStats = Boolean(stats && typeof stats.assigned === "number" && stats.assigned > 0)
    const statsText = hasStats
      ? ` · ${stats!.submitted ?? 0}/${stats!.assigned} đã nộp`
      : stats && typeof stats.assigned === "number"
      ? ` · ${stats.submitted ?? 0}/${stats.assigned} đã nộp`
      : ""

    todos.push({
      key: "deadline",
      icon: Book02Icon,
      label: `"${title}" ${deadlineLabel(upcomingDeadline.deadline)}${statsText}`,
      href: `/teacher/assignments/${upcomingDeadline.id}`,
      actionLabel: "Xem tiến độ",
    })
  }
  if (draftExams.length > 0) {
    todos.push({
      key: "drafts",
      icon: PencilEdit02Icon,
      label: `${draftExams.length} đề nháp chưa xuất bản`,
      href: "/teacher/exams?tab=draft",
      actionLabel: "Tiếp tục soạn",
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Tổng quan giảng dạy"
        description="Theo dõi kết quả học tập của học sinh, tiến độ các lớp và bài làm cần chấm điểm"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs font-medium gap-1.5">
              <Link href="/teacher/exams/new">
                <HugeiconsIcon icon={Add01Icon} size={14} />
                <span>Tạo đề thi mới</span>
              </Link>
            </Button>
            {pendingCount > 0 && firstPending ? (
              <Button variant="default" size="sm" asChild className="h-8 text-xs font-semibold gap-1.5">
                <Link href={`/teacher/grading/${firstPending.attemptId}`}>
                  <HugeiconsIcon icon={Award01Icon} size={14} />
                  <span>Chấm bài ({pendingCount})</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5"
                disabled
                title="Không còn bài chờ chấm"
              >
                <HugeiconsIcon icon={Award01Icon} size={14} />
                <span>Chấm bài (0)</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Setup checklist (T0) */}
      {showSetup && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Thiết lập ban đầu
            </h3>
            <p className="text-xs text-muted-foreground">
              Hoàn tất các bước sau để bắt đầu giảng dạy.
            </p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <HugeiconsIcon
                  icon={hasClasses ? CheckmarkCircle02Icon : SchoolIcon}
                  size={15}
                  className={hasClasses ? "text-emerald-600" : "text-muted-foreground"}
                />
                Tạo lớp học đầu tiên
              </span>
              {!hasClasses && (
                <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2.5">
                  <Link href="/teacher/classes">Tạo lớp</Link>
                </Button>
              )}
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <HugeiconsIcon
                  icon={hasPublishedExam ? CheckmarkCircle02Icon : Book02Icon}
                  size={15}
                  className={hasPublishedExam ? "text-emerald-600" : "text-muted-foreground"}
                />
                Xuất bản đề thi đầu tiên
              </span>
              {!hasPublishedExam && (
                <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2.5">
                  <Link href="/teacher/exams/new">Soạn đề</Link>
                </Button>
              )}
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <HugeiconsIcon
                  icon={hasAssignment ? CheckmarkCircle02Icon : PencilEdit02Icon}
                  size={15}
                  className={hasAssignment ? "text-emerald-600" : "text-muted-foreground"}
                />
                Giao bài cho học sinh
              </span>
              {!hasAssignment && (
                <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2.5">
                  <Link href="/teacher/assignments">Giao bài</Link>
                </Button>
              )}
            </li>
          </ul>
        </div>
      )}

      {/* Việc cần làm */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground">
          Việc cần làm
        </h3>
        {todos.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="text-emerald-600" />
            Mọi thứ đã xong ✓
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {todos.map((todo) => (
              <li key={todo.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                  <HugeiconsIcon icon={todo.icon} size={15} className="text-amber-600 shrink-0" />
                  {todo.label}
                </span>
                <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2.5 shrink-0">
                  <Link href={todo.href}>{todo.actionLabel}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Học sinh"
          value={stats?.totalStudents ?? 0}
          hint={stats?.totalClasses ? `Đang hoạt động trên ${stats.totalClasses} lớp` : undefined}
          icon={UserIcon}
        />
        <StatCard
          label="Lớp học"
          value={stats?.totalClasses ?? 0}
          hint={classes.slice(0, 3).map((c) => c.name).join(", ") || undefined}
          icon={Book02Icon}
        />
        <StatCard
          label="Đề thi hoạt động"
          value={publishedExamsCount}
          hint="Đề đã xuất bản"
          icon={PencilEdit02Icon}
        />
        <StatCard
          label="Chờ chấm Writing"
          value={pendingCount}
          hint="Bài học sinh đã nộp"
          icon={Award01Icon}
          accent
        />
      </div>

      {/* Class Performance Summary */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground">
            Hiệu suất trung bình theo lớp học
          </h3>
          <p className="text-xs text-muted-foreground">
            Điểm trung bình các kỹ năng theo từng cấp độ hiện tại
          </p>
        </div>

        {classes.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Chưa có lớp học nào.{" "}
            <Link href="/teacher/classes" className="text-primary hover:underline">
              Tạo lớp đầu tiên
            </Link>
          </p>
        ) : classAnalyticsQueries.some((q) => q.isLoading) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {classes.slice(0, 3).map((c) => (
              <Skeleton key={c.id} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {classes.slice(0, 5).map((c, i) => {
              const analytics = classAnalyticsQueries[i]?.data
              return {
                id: c.id,
                name: c.name,
                studentsCount: c.studentsCount,
                overall: analytics?.average?.overall ?? null,
              }
            }).map((cls) => (
              <div
                key={cls.id}
                className="rounded-xl border border-border p-3.5 space-y-2.5 bg-muted/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs text-foreground truncate">
                    {cls.name}
                  </span>
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 shrink-0">
                    {cls.studentsCount} HS
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Overall Band TB</span>
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {formatBand(cls.overall)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${cls.overall ? Math.min(100, (cls.overall / 9) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions Section (Direct Table, unwrapped from Card) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground">
              Bài thi nộp gần đây
            </h3>
            <p className="text-xs text-muted-foreground">
              Các bài làm của học sinh vừa hoàn thành cần theo dõi và chấm điểm
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-medium h-8">
            <Link href="/teacher/submissions" className="flex items-center gap-1">
              <span>Xem tất cả bài nộp</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Học sinh</TableHead>
                <TableHead className="text-xs">Đề thi</TableHead>
                <TableHead className="text-xs hidden sm:table-cell w-36">Thời gian nộp</TableHead>
                <TableHead className="text-xs hidden md:table-cell w-36">Trạng thái</TableHead>
                <TableHead className="text-center font-mono text-xs w-24">Overall</TableHead>
                <TableHead className="text-right text-xs w-32">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats?.recentSubmissions ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                    Chưa có bài nộp nào.
                  </TableCell>
                </TableRow>
              ) : (
                (stats?.recentSubmissions ?? []).map((sub) => {
                  const needsGrading = pendingItems.some((p) => p.attemptId === sub.attemptId)
                  return (
                    <TableRow key={sub.attemptId} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-xs sm:text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{sub.studentName}</span>
                          {sub.suspicious && (
                            <StatusBadge
                              status="danger"
                              label="Cần chú ý"
                              className="h-4.5 px-1.5 text-[10px]"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.examTitle}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {formatDate(sub.submittedAt)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {needsGrading ? (
                          <StatusBadge status="warning" label="Chờ chấm Writing" />
                        ) : (
                          <StatusBadge status="success" label="Đã nộp" />
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                        {formatBand(sub.overallBand)}
                      </TableCell>
                      <TableCell className="text-right">
                        {needsGrading ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-medium px-2.5"
                            asChild
                          >
                            <Link href={`/teacher/grading/${sub.attemptId}`}>Chấm bài</Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-medium px-2.5"
                            asChild
                          >
                            <Link href={`/teacher/submissions/${sub.attemptId}`}>Xem bài</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
