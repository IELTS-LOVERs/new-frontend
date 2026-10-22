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
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BandBadge } from "@/components/shared/band-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart } from "@/components/shared/charts"
import { ApiError } from "@/lib/api/client"
import { formatDateShort, formatBand } from "@/lib/format"
import { useStudentProgressQuery } from "@/hooks/use-analytics"
import { usePracticeHeatmapQuery } from "@/hooks/use-practice"
import { PracticeHeatmap } from "@/features/practice/components/practice-heatmap"
import type { StudentProgressAnalytics } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export default function StudentProgressPage() {
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
  const heatmapQuery = usePracticeHeatmapQuery()

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
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !analytics) {
    const message =
      error instanceof ApiError ? error.message : "Không tải được dữ liệu tiến độ."
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-12">
        <PageHeaderBlock studentName={studentName} />
        <PracticeHeatmap
          data={heatmapQuery.data}
          isLoading={heatmapQuery.isLoading}
        />
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

  const targetBand = analytics.targetBand ?? 6.5
  const latestOverall = analytics.latest.overall ?? null
  const delta = analytics.deltaFromTarget ?? (latestOverall != null ? latestOverall - targetBand : 0)
  const lastSubmittedAt = analytics.points[analytics.points.length - 1]?.submittedAt

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

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-12">
      <PageHeaderBlock studentName={studentName} />

      {/* KPI Cards: 3 clean, flat metric cards matching design system */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Band Hiện tại */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Band điểm hiện tại
              </span>
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Award01Icon} size={16} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">
                {latestOverall != null ? formatBand(latestOverall) : "—"}
              </span>
              <span className="text-xs font-medium text-muted-foreground font-mono">
                Overall
              </span>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground truncate">
              {lastSubmittedAt ? (
                <>Bài thi gần nhất: <strong>{formatDateShort(lastSubmittedAt)}</strong></>
              ) : (
                "Chưa có bài thi thử nào"
              )}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Mục tiêu Band */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Band điểm mục tiêu
              </span>
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Target02Icon} size={16} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-primary tabular-nums">
                {formatBand(targetBand)}
              </span>
              <span className="text-xs font-medium text-muted-foreground font-mono">
                Target
              </span>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground truncate">
              Mục tiêu cá nhân của học viên
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Chênh lệch */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Chênh lệch mục tiêu
              </span>
              <span
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  latestOverall == null
                    ? "bg-muted text-muted-foreground"
                    : delta >= 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                <HugeiconsIcon icon={TrendingUpIcon} size={16} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-3xl sm:text-4xl font-extrabold tabular-nums",
                  latestOverall == null
                    ? "text-foreground"
                    : delta >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-500"
                )}
              >
                {latestOverall == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
              </span>
              <span className="text-xs font-medium text-muted-foreground font-mono">
                Band
              </span>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground truncate">
              {latestOverall == null
                ? "Làm bài thi thử để đo khoảng cách"
                : delta >= 0
                  ? "Bạn đã đạt hoặc vượt mốc mục tiêu."
                  : `Cần thêm ${Math.abs(delta).toFixed(1)} Band để đạt mục tiêu.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap: Biểu đồ luyện tập (GitHub/YouPass style chuẩn chỉnh) */}
      <PracticeHeatmap
        data={heatmapQuery.data}
        isLoading={heatmapQuery.isLoading}
      />

      {/* Line Chart: Biến thiên Band theo thời gian */}
      {analytics.points.length === 0 ? (
        <EmptyState
          icon={Book02Icon}
          title="Hoàn thành ít nhất 1 bài để xem biểu đồ biến thiên"
          description="Dữ liệu tiến độ sẽ hiển thị sau khi bạn hoàn thành bài thi đầu tiên."
          action={
            <Button variant="default" size="sm" asChild className="font-semibold">
              <Link href="/student/exams">Luyện thi thử ngay</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border p-5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-base font-bold text-foreground">
                    Biến thiên Band điểm theo thời gian
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Theo dõi sự tiến bộ qua các kỳ thi thử và mốc mục tiêu Target {formatBand(targetBand)}
                  </CardDescription>
                </div>

                {/* Series Legend */}
                <div className="flex items-center flex-wrap gap-3 text-xs select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)]" />
                    <span className="text-muted-foreground font-medium text-[11px]">Listening</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-2)]" />
                    <span className="text-muted-foreground font-medium text-[11px]">Reading</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-3)]" />
                    <span className="text-muted-foreground font-medium text-[11px]">Writing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-4)]" />
                    <span className="text-foreground font-bold text-[11px]">Overall</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-border pl-2.5">
                    <span className="w-4 h-0.5 border-t border-dashed border-[var(--chart-5)]" />
                    <span className="text-muted-foreground font-medium text-[11px]">Target ({formatBand(targetBand)})</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <LineChart
                series={series}
                labels={lineLabels}
                target={targetBand}
                min={4.0}
                max={9.0}
                height={260}
              />
            </CardContent>
          </Card>

          {/* Bảng lịch sử làm bài */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border p-5 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base font-bold text-foreground">
                  Lịch sử thi thử gần đây
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Các bài kiểm tra đã hoàn thành với điểm số chi tiết từng kỹ năng
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
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {attempt.examTitle}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <span>{formatDateShort(attempt.submittedAt)}</span>
                          <span>·</span>
                          {attempt.listening != null && (
                            <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200/50">
                              L: {formatBand(attempt.listening)}
                            </span>
                          )}
                          {attempt.reading != null && (
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/50">
                              R: {formatBand(attempt.reading)}
                            </span>
                          )}
                          {attempt.writing != null && (
                            <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200/50">
                              W: {formatBand(attempt.writing)}
                            </span>
                          )}
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
        </>
      )}
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
          Theo dõi sự biến thiên band điểm thi thử và tần suất luyện tập mỗi ngày
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 text-xs font-medium">
          <Link href="/student/results">
            <span>Xem bảng điểm</span>
          </Link>
        </Button>
        <Button size="sm" asChild className="h-9 gap-1.5 text-xs font-medium">
          <Link href="/student/exams">
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
            <span>Luyện thi thử</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
