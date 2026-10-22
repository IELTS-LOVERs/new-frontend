"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Book02Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { BandBadge } from "@/components/shared/band-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart } from "@/components/shared/charts"
import { ApiError } from "@/lib/api/client"
import { formatBand, formatDateShort, initials } from "@/lib/format"
import { PracticeHeatmap } from "@/features/practice/components/practice-heatmap"
import type {
  PracticeHeatmapResponse,
  StudentProgressAnalytics,
} from "@/lib/api/types"
import { cn } from "@/lib/utils"

export type StudentProgressViewer = "student" | "teacher" | "admin"

export interface StudentProgressViewProps {
  analytics?: StudentProgressAnalytics
  heatmap?: PracticeHeatmapResponse
  isLoading: boolean
  isHeatmapLoading?: boolean
  error: unknown
  onRetry: () => void
  viewer?: StudentProgressViewer
  backHref?: string
  backLabel?: string
}

/**
 * Shared progress dashboard used by the student's own progress page and the
 * teacher/admin student-progress pages.
 */
export function StudentProgressView({
  analytics,
  heatmap,
  isLoading,
  isHeatmapLoading = false,
  error,
  onRetry,
  viewer = "student",
  backHref,
  backLabel,
}: StudentProgressViewProps) {
  const isStudent = viewer === "student"
  const student = analytics?.student

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl pb-16">
        <ProgressHeader
          viewer={viewer}
          student={student}
          backHref={backHref}
          backLabel={backLabel}
        />
        <div className="grid border-y border-border md:grid-cols-[1.1fr_1fr] md:divide-x md:divide-border">
          <div className="space-y-4 px-5 py-7 sm:px-7">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-6 px-5 py-7 sm:px-7">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="mt-9 space-y-6">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Không tải được dữ liệu tiến độ."
    return (
      <div className="mx-auto w-full max-w-6xl pb-16">
        <ProgressHeader
          viewer={viewer}
          student={student}
          backHref={backHref}
          backLabel={backLabel}
        />
        <PracticeHeatmap data={heatmap} isLoading={isHeatmapLoading} />
        <div className="mt-8">
          <EmptyState
            icon={Book02Icon}
            title={
              isStudent
                ? "Không tải được tiến độ học tập"
                : "Không tải được tiến độ học viên"
            }
            description={message}
            action={
              <Button
                variant="default"
                size="sm"
                onClick={onRetry}
                className="font-semibold"
              >
                Thử lại
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const targetBand = analytics.targetBand ?? 6.5
  const latestOverall = analytics.latest.overall ?? null
  const delta =
    analytics.deltaFromTarget ??
    (latestOverall != null ? latestOverall - targetBand : 0)
  const lastAttempt = analytics.points[analytics.points.length - 1]
  const subject = isStudent ? "Bạn" : "Học viên"

  const allBands = analytics.points.flatMap((point) =>
    [point.listening, point.reading, point.writing, point.overall].filter(
      (value): value is number => value != null
    )
  )
  const chartMin = allBands.some((value) => value < 4) ? 0 : 4

  const series = [
    {
      name: "Listening",
      colorVar: "var(--chart-2)",
      points: analytics.points.map((p) => p.listening ?? null),
    },
    {
      name: "Reading",
      colorVar: "var(--brand-green)",
      points: analytics.points.map((p) => p.reading ?? null),
    },
    {
      name: "Writing",
      colorVar: "var(--brand-orange)",
      points: analytics.points.map((p) => p.writing ?? null),
    },
    {
      name: "Overall",
      colorVar: "var(--primary)",
      points: analytics.points.map((p) => p.overall ?? null),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <ProgressHeader
        viewer={viewer}
        student={student}
        backHref={backHref}
        backLabel={backLabel}
      />

      <BandSummary
        latestOverall={latestOverall}
        targetBand={targetBand}
        delta={delta}
        lastAttempt={lastAttempt}
        subject={subject}
      />

      <div className="mt-9 space-y-9">
        <PracticeHeatmap data={heatmap} isLoading={isHeatmapLoading} />

        {analytics.points.length === 0 ? (
          <div className="border-t border-border pt-8">
            <EmptyState
              icon={Book02Icon}
              title={
                isStudent
                  ? "Hoàn thành ít nhất 1 bài để xem biểu đồ biến thiên"
                  : "Học viên chưa hoàn thành bài thi thử nào"
              }
              description={
                isStudent
                  ? "Dữ liệu tiến độ sẽ hiển thị sau khi bạn hoàn thành bài thi đầu tiên."
                  : "Dữ liệu tiến độ sẽ hiển thị sau khi học viên nộp bài thi đầu tiên."
              }
              action={
                isStudent ? (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="font-semibold"
                  >
                    <Link href="/student/exams">Luyện thi thử ngay</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <BandTrendSection
              points={analytics.points}
              targetBand={targetBand}
              chartMin={chartMin}
              series={series}
            />
            <AttemptHistory
              points={analytics.points}
              isStudent={isStudent}
            />
          </>
        )}
      </div>
    </div>
  )
}

function ProgressHeader({
  viewer,
  student,
  backHref,
  backLabel,
}: {
  viewer: StudentProgressViewer
  student?: StudentProgressAnalytics["student"]
  backHref?: string
  backLabel?: string
}) {
  const isStudent = viewer === "student"

  return (
    <header className="flex flex-col gap-6 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {!isStudent && (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-sm font-semibold text-primary ring-1 ring-primary/15">
            {student?.fullName ? initials(student.fullName) : "HV"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {isStudent ? "Hồ sơ học tập" : "Tiến độ học viên"}
          </p>
          <h1 className="mt-1 truncate font-heading text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-[2.1rem]">
            {isStudent
              ? "Tiến độ học tập"
              : (student?.fullName ?? "Học viên")}
          </h1>
          {isStudent ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Theo dõi nhịp luyện tập, biến thiên band điểm và chặng đường
              chạm mục tiêu.
            </p>
          ) : (
            <>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {student?.email ?? "Chưa có email"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Nhịp luyện tập, band điểm và lịch sử bài làm của học viên.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isStudent ? (
          <>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Link href="/student/results">Xem bảng điểm</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Link href="/student/exams">
                <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                Luyện thi thử
              </Link>
            </Button>
          </>
        ) : (
          backHref && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Link href={backHref}>
                <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
                {backLabel ?? "Quay lại"}
              </Link>
            </Button>
          )
        )}
      </div>
    </header>
  )
}

function BandSummary({
  latestOverall,
  targetBand,
  delta,
  lastAttempt,
  subject,
}: {
  latestOverall: number | null
  targetBand: number
  delta: number
  lastAttempt?: StudentProgressAnalytics["points"][number]
  subject: string
}) {
  const reachedTarget = latestOverall != null && delta >= 0

  return (
    <section className="border-y border-border bg-card">
      <div className="grid md:grid-cols-[1.1fr_1fr] md:divide-x md:divide-border">
        <div className="px-5 py-7 sm:px-7 sm:py-8">
          <p className="text-sm text-muted-foreground">Band hiện tại</p>
          <div className="mt-0.5 flex items-end gap-3">
            <span className="font-mono text-[4rem] font-semibold leading-none tracking-[-0.06em] text-foreground sm:text-[4.8rem]">
              {latestOverall != null ? formatBand(latestOverall) : "—"}
            </span>
            <span className="pb-1.5 font-mono text-xs text-muted-foreground">
              / 9.0
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                latestOverall == null
                  ? "bg-muted text-muted-foreground"
                  : reachedTarget
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              )}
            >
              {latestOverall == null
                ? "Chưa có bài thi"
                : reachedTarget
                  ? "Đã đạt mục tiêu"
                  : `Còn ${Math.abs(delta).toFixed(1)} band`}
            </span>
            <span className="text-sm text-muted-foreground">
              {subject === "Bạn" ? "bạn" : "học viên"} đang hướng tới{" "}
              <span className="font-medium text-foreground">
                {formatBand(targetBand)}
              </span>
            </span>
          </div>

          <p className="mt-5 truncate text-xs text-muted-foreground">
            {lastAttempt ? (
              <>
                Bài gần nhất:{" "}
                <span className="text-foreground">
                  {lastAttempt.examTitle}
                </span>{" "}
                · {formatDateShort(lastAttempt.submittedAt)}
              </>
            ) : (
              "Chưa có bài thi thử nào được ghi nhận."
            )}
          </p>
        </div>

        <div className="border-t border-border px-5 py-7 sm:px-7 sm:py-8 md:border-t-0">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-muted-foreground">Mục tiêu</p>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {formatBand(targetBand)}
            </p>
          </div>
          <BandRunway current={latestOverall} target={targetBand} />
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {latestOverall == null
              ? "Làm bài thi thử đầu tiên để đo khoảng cách với mục tiêu."
              : reachedTarget
                ? "Mốc mục tiêu đã nằm trong tầm với. Giữ nhịp luyện tập đều."
                : `Mỗi buổi luyện tập đều đưa ${subject === "Bạn" ? "bạn" : "học viên"} gần mốc ${formatBand(targetBand)} hơn.`}
          </p>
        </div>
      </div>
    </section>
  )
}

function BandRunway({
  current,
  target,
}: {
  current: number | null
  target: number
}) {
  const toPercent = (value: number) =>
    Math.min(100, Math.max(0, (value / 9) * 100))
  const targetPercent = toPercent(target)
  const currentPercent = current == null ? null : toPercent(current)

  return (
    <div className="mt-7">
      <div className="relative mb-2 h-3">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-foreground"
          style={{ left: `${targetPercent}%` }}
        >
          Mục tiêu
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        {currentPercent != null && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
            style={{ width: `${currentPercent}%` }}
          />
        )}
        <span
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground/50"
          style={{ left: `${targetPercent}%` }}
        />
        {currentPercent != null && (
          <span
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-[0_0_0_1px_var(--primary)]"
            style={{ left: `${currentPercent}%` }}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>0</span>
        <span>3</span>
        <span>6</span>
        <span>9</span>
      </div>
    </div>
  )
}

function BandTrendSection({
  points,
  targetBand,
  chartMin,
  series,
}: {
  points: StudentProgressAnalytics["points"]
  targetBand: number
  chartMin: number
  series: Array<{
    name: string
    colorVar: string
    points: Array<number | null>
  }>
}) {
  return (
    <section className="border-t border-border pt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Biến thiên band điểm
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {points.length} lần làm bài gần nhất, so với mốc mục tiêu{" "}
            {formatBand(targetBand)}.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card px-3 py-4 sm:px-5 sm:py-5">
        <LineChart
          series={series}
          labels={points.map((point) => formatChartDate(point.submittedAt))}
          target={targetBand}
          targetColorVar="var(--foreground)"
          min={chartMin}
          max={9}
          gridStep={chartMin === 0 ? 1.5 : undefined}
          height={280}
        />
      </div>
    </section>
  )
}

function AttemptHistory({
  points,
  isStudent,
}: {
  points: StudentProgressAnalytics["points"]
  isStudent: boolean
}) {
  return (
    <section className="border-t border-border pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Lịch sử bài làm
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Điểm chi tiết từng kỹ năng của các bài đã hoàn thành.
          </p>
        </div>
        {isStudent && (
          <Link
            href="/student/results"
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tất cả
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Link>
        )}
      </div>

      <div className="mt-3">
        {points
          .slice()
          .reverse()
          .map((attempt) => (
            <div
              key={attempt.attemptId}
              className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-border py-4 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="font-mono text-[11px] text-muted-foreground">
                {formatDateShort(attempt.submittedAt)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {attempt.examTitle}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  {attempt.listening != null && (
                    <ScoreChip
                      label="L"
                      value={attempt.listening}
                      className="bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    />
                  )}
                  {attempt.reading != null && (
                    <ScoreChip
                      label="R"
                      value={attempt.reading}
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    />
                  )}
                  {attempt.writing != null && (
                    <ScoreChip
                      label="W"
                      value={attempt.writing}
                      className="bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    />
                  )}
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Overall
                  </span>
                  <BandBadge value={attempt.overall} size="sm" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Link
                    href={
                      isStudent
                        ? `/student/results/${attempt.attemptId}`
                        : `/teacher/submissions/${attempt.attemptId}`
                    }
                  >
                    {isStudent ? "Chi tiết" : "Xem bài nộp"}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}

function ScoreChip({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <span className={cn("rounded px-1.5 py-0.5", className)}>
      {label}: {formatBand(value)}
    </span>
  )
}

function formatChartDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDateShort(value)
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  })
}
