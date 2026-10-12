"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Award01Icon,
  Target02Icon,
  TrendingUpIcon,
  Book02Icon,
  ArrowRight01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BandBadge } from "@/components/shared/band-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart } from "@/components/shared/charts"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { formatDateShort, formatBand } from "@/lib/format"
import { useStudentProgressQuery } from "@/hooks/use-analytics"
import type { StudentProgressAnalytics } from "@/lib/api/types"
import { DEMO_STUDENT, DEMO_STUDENT_ANALYTICS } from "@/mocks/demo-data"

export default function StudentProgressPage() {
  if (USE_MOCKS) {
    return <MockProgress />
  }
  return <RealProgress />
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
function MockProgress() {
  return (
    <ProgressView
      analytics={DEMO_STUDENT_ANALYTICS}
      studentName={DEMO_STUDENT.fullName}
      isLoading={false}
      error={null}
      refetch={() => {}}
    />
  )
}

// ─── REAL ────────────────────────────────────────────────────────────────────
function RealProgress() {
  const analyticsQuery = useStudentProgressQuery()
  return (
    <ProgressView
      analytics={analyticsQuery.data}
      studentName={null}
      isLoading={analyticsQuery.isLoading}
      error={analyticsQuery.error}
      refetch={() => analyticsQuery.refetch()}
    />
  )
}

// ─── Shared View ─────────────────────────────────────────────────────────────
interface ProgressViewProps {
  analytics: StudentProgressAnalytics | undefined
  studentName: string | null
  isLoading: boolean
  error: unknown
  refetch: () => void
}

function ProgressView({ analytics, studentName, isLoading, error, refetch }: ProgressViewProps) {
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !analytics) {
    const message =
      error instanceof ApiError ? error.message : "Không tải được dữ liệu tiến độ."
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-12">
        <PageHeaderBlock studentName={studentName} />
        <EmptyState
          icon={Award01Icon}
          title="Không tải được tiến độ học tập"
          description={message}
          action={
            <Button variant="default" size="sm" onClick={refetch} className="font-semibold">
              Thử lại
            </Button>
          }
        />
      </div>
    )
  }

  const targetBand = analytics.targetBand ?? 7.0
  const latestOverall = analytics.latest.overall ?? null
  const delta = analytics.deltaFromTarget ?? 0

  // Empty state: chưa có bài nào → CTA đi làm bài
  if (analytics.points.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-12">
        <PageHeaderBlock studentName={studentName} />
        <EmptyState
          icon={Book02Icon}
          title="Hoàn thành ít nhất 1 bài để xem biểu đồ"
          description="Dữ liệu tiến độ sẽ hiển thị sau khi bạn hoàn thành bài thi đầu tiên."
          action={
            <Button variant="default" size="sm" asChild className="font-semibold">
              <Link href="/student/assignments">Luyện thi thử ngay</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Line chart: L / R / W / Overall theo submittedAt + đường Target
  const lineLabels = analytics.points.map((p) => formatDateShort(p.submittedAt))
  const series = [
    {
      name: "Listening",
      colorVar: "var(--chart-1)",
      points: analytics.points.map((p) => p.listening ?? null),
    },
    {
      name: "Reading",
      colorVar: "var(--chart-2)",
      points: analytics.points.map((p) => p.reading ?? null),
    },
    {
      name: "Writing",
      colorVar: "var(--chart-3)",
      points: analytics.points.map((p) => p.writing ?? null),
    },
    {
      name: "Overall",
      colorVar: "var(--chart-4)",
      points: analytics.points.map((p) => p.overall ?? null),
    },
  ]

  const lastSubmittedAt = analytics.points[analytics.points.length - 1]?.submittedAt

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-12">
      <PageHeaderBlock studentName={studentName} />

      {/* KPI Cards: Band hiện tại / Mục tiêu / Chênh lệch */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Band Hiện tại */}
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Band điểm hiện tại</span>
              <HugeiconsIcon icon={Award01Icon} size={16} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle className="font-mono text-3xl font-extrabold text-foreground tabular-nums">
                {formatBand(latestOverall)}
              </CardTitle>
              {latestOverall != null && delta !== 0 && (
                <span
                  className={
                    delta > 0
                      ? "font-mono text-xs font-semibold text-emerald-600 flex items-center gap-0.5"
                      : "font-mono text-xs font-semibold text-amber-600 flex items-center gap-0.5"
                  }
                >
                  <HugeiconsIcon icon={TrendingUpIcon} size={13} />
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)} so với mục tiêu
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {lastSubmittedAt ? <>Thi ngày {formatDateShort(lastSubmittedAt)}</> : "—"}
          </CardContent>
        </Card>

        {/* Card 2: Mục tiêu Band */}
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Band điểm mục tiêu</span>
              <HugeiconsIcon icon={Target02Icon} size={16} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle className="font-mono text-3xl font-extrabold text-primary tabular-nums">
                {formatBand(targetBand)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Mục tiêu cá nhân của học viên
          </CardContent>
        </Card>

        {/* Card 3: Chênh lệch */}
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Chênh lệch mục tiêu</span>
              <HugeiconsIcon icon={TrendingUpIcon} size={16} className="text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle
                className={
                  delta >= 0
                    ? "font-mono text-3xl font-extrabold text-emerald-600 tabular-nums"
                    : "font-mono text-3xl font-extrabold text-foreground tabular-nums"
                }
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">Band</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {delta >= 0
              ? "Bạn đã vượt mục tiêu đề ra."
              : `Cần thêm ${Math.abs(delta).toFixed(1)} Band để đạt mục tiêu.`}
          </CardContent>
        </Card>
      </div>

      {/* Line Chart: Biến thiên Band theo thời gian */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border p-4 sm:p-5">
          <CardTitle className="font-heading text-base font-bold text-foreground">
            Biến thiên Band điểm theo thời gian
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Theo dõi sự tiến bộ qua các kỳ thi thử và mốc mục tiêu Target {formatBand(targetBand)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <LineChart
            series={series}
            labels={lineLabels}
            target={targetBand}
            min={4.5}
            max={8.5}
            height={260}
          />
        </CardContent>
      </Card>

      {/* Bảng lịch sử làm bài */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border p-4 sm:p-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base font-bold text-foreground">
              Lịch sử làm bài thi
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Các bài kiểm tra đã hoàn thành gần đây
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
          >
            <Link href="/student/results">
              <span>Tất cả</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {analytics.points
              .slice()
              .reverse()
              .map((attempt) => (
                <div
                  key={attempt.attemptId}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                      {attempt.examTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{formatDateShort(attempt.submittedAt)}</span>
                      <span>·</span>
                      {attempt.listening != null && <span>L: {formatBand(attempt.listening)}</span>}
                      {attempt.reading != null && <span>R: {formatBand(attempt.reading)}</span>}
                      {attempt.writing != null && <span>W: {formatBand(attempt.writing)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                        Overall
                      </span>
                      <BandBadge value={attempt.overall} size="sm" />
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2.5">
                      <Link href={`/student/results/${attempt.attemptId}`}>Chi tiết</Link>
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Header (dùng chung) ────────────────────────────────────────────────────
function PageHeaderBlock({ studentName }: { studentName: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Tiến độ học tập & Mục tiêu
          </h1>
          {studentName && (
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
              Học viên: {studentName}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi sự thay đổi band điểm IELTS qua các bài thi thử
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 text-xs font-medium">
          <Link href="/student/results">
            <span>Xem bảng điểm</span>
          </Link>
        </Button>
        <Button size="sm" asChild className="h-9 gap-1.5 text-xs font-medium">
          <Link href="/student/assignments">
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
            <span>Luyện thi thử ngay</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
