"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Award01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons"
import { BrandLogo } from "@/components/layout/brand-logo"
import { formatBand, formatDate } from "@/lib/format"
import { useAttemptResultQuery } from "@/hooks/use-attempts"
import type { AttemptResultDetail } from "@/lib/api/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function ExamSubmittedPage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

  React.useEffect(() => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  return <RealSubmitted attemptId={attemptId} />
}

function RealSubmitted({ attemptId }: { attemptId: string }) {
  const resultQuery = useAttemptResultQuery(attemptId)
  const result = resultQuery.data

  if (resultQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (resultQuery.isError || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Không tải được kết quả bài thi.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/student">Về trang chủ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPractice = result.examKind === "practice"
  const isRawResult = isPractice || result.scoreMode === "raw"
  const rawTotal = result.totalPoints ?? result.questionCount ?? 0
  const isWritingDetail = (d: AttemptResultDetail) =>
    d.skill === "writing" || d.groupType?.startsWith("writing")
  const writingDetails = result.details.filter(isWritingDetail)
  const objectiveCount = result.details.length - writingDetails.length
  // Bài luyện tập chỉ có Writing (không có câu khách quan) → 0/0 vô nghĩa.
  const writingOnly = writingDetails.length > 0 && objectiveCount === 0
  const fallbackCorrect = result.details.filter(
    (d) => !isWritingDetail(d) && d.isCorrect
  ).length
  const fallbackBlank = result.details.filter(
    (d) => !isWritingDetail(d) && (!d.studentAnswer || d.studentAnswer.trim() === "")
  ).length
  const fallbackWrong = result.details.filter(
    (d) =>
      !isWritingDetail(d) &&
      !!d.studentAnswer &&
      d.studentAnswer.trim() !== "" &&
      !d.isCorrect
  ).length
  const correctCount = result.correctCount ?? fallbackCorrect
  const wrongCount = result.wrongCount ?? fallbackWrong
  const blankCount = result.blankCount ?? fallbackBlank
  const countTotal = correctCount + wrongCount + blankCount
  const homeHref = isPractice ? "/student/practice" : "/student/exams"
  const homeLabel = isPractice ? "Về mục luyện tập" : "Về danh sách đề thi"

  const writingGraded = !!result.writingReview
  const hasWriting = writingDetails.length > 0 || result.writingReview != null
  const submittedAt = formatDate((result as any).submittedAt ?? null)
  const examTitle = (result as any).examTitle ?? "Bài thi"

  const bands = [
    { label: "Listening", value: result.scores?.listeningBand },
    { label: "Reading", value: result.scores?.readingBand },
    { label: "Writing", value: writingGraded ? result.scores?.writingBand : null },
    { label: "Overall", value: writingGraded ? result.scores?.overallBand : result.scores?.overallBand },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
        <BrandLogo href={homeHref} compact />
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href={homeHref}>
            <HugeiconsIcon icon={Home01Icon} size={15} /> {homeLabel}
          </Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={44} />
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            {isPractice ? "Bạn đã hoàn thành bài luyện tập!" : "Bạn đã nộp bài thành công!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Bài thi <span className="font-semibold text-foreground">{examTitle}</span> đã được nộp
            {submittedAt !== "—" && (
              <>
                {" "}lúc <span className="font-mono">{submittedAt}</span>
              </>
            )}
            .
          </p>
          {result.status === "expired" && (
            <Badge variant="secondary" className="text-xs">
              Tự động nộp khi hết giờ
            </Badge>
          )}
        </div>

        <Card className="w-full border-border shadow-xs">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isPractice ? "Kết quả luyện tập" : "Điểm nhanh"}
            </p>
            {isRawResult && writingOnly ? (
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-6">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Số bài viết
                </span>
                <span className="font-mono text-xl font-extrabold text-primary">
                  {writingDetails.length}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Giáo viên chấm
                </span>
              </div>
            ) : isRawResult ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3">
                  <span className="text-[11px] text-muted-foreground">Số câu đúng</span>
                  <span className="font-mono text-xl font-extrabold text-primary">
                    {correctCount}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{countTotal || rawTotal || 0}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3">
                  <span className="text-[11px] text-muted-foreground">Số câu sai</span>
                  <span className="font-mono text-xl font-extrabold text-rose-600 dark:text-rose-400">
                    {wrongCount}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3">
                  <span className="text-[11px] text-muted-foreground">Bỏ trống</span>
                  <span className="font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {blankCount}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3">
                  <span className="text-[11px] text-muted-foreground">Tỷ lệ đúng</span>
                  <span className="font-mono text-xl font-extrabold text-foreground">
                    {countTotal > 0
                      ? `${Math.round((correctCount / countTotal) * 100)}%`
                      : result.percentage !== undefined
                        ? `${result.percentage}%`
                        : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {bands.map((b) => (
                  <div
                    key={b.label}
                    className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3"
                  >
                    <span className="text-[11px] text-muted-foreground">{b.label}</span>
                    <span className="font-mono text-xl font-extrabold text-foreground">
                      {formatBand(b.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hasWriting && !writingGraded && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                <HugeiconsIcon icon={Clock01Icon} size={16} className="mt-0.5 text-amber-600" />
                <p className="text-xs text-foreground/90">
                  Writing sẽ được giáo viên chấm. Bạn sẽ thấy kết quả và nhận xét chi tiết tại trang{" "}
                  <span className="font-semibold">Kết quả</span> khi hoàn tất.
                </p>
              </div>
            )}
            {hasWriting && writingGraded && (
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <HugeiconsIcon icon={Award01Icon} size={16} className="mt-0.5 text-primary" />
                <p className="text-xs text-foreground/90">
                  Bài Writing đã được chấm. Xem nhận xét chi tiết của giáo viên ở trang kết quả.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2 font-semibold sm:min-w-48">
            <Link href={`/student/results/${attemptId}`}>
              <HugeiconsIcon icon={Award01Icon} size={16} />
              {isPractice ? "Xem giải thích & từ vựng" : "Xem kết quả chi tiết"}
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2 sm:min-w-40">
            <Link href={homeHref}>
              <HugeiconsIcon icon={Home01Icon} size={16} />
              {homeLabel}
            </Link>
          </Button>
        </div>

        <Badge variant="secondary" className="font-mono text-[10px]">
          Attempt: {attemptId}
        </Badge>
      </main>
    </div>
  )
}

