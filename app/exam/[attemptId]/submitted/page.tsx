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
import { Skeleton } from "@/components/ui/skeleton"
import { USE_MOCKS } from "@/lib/api/config"
import { DEMO_ATTEMPT_RESULT, DEMO_EXAM_MOCK_01 } from "@/mocks/demo-data"

export default function ExamSubmittedPage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

  React.useEffect(() => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  if (USE_MOCKS) {
    return <MockSubmitted attemptId={attemptId} />
  }

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

  const writingGraded = !!result.writingReview
  const hasWriting =
    result.scores.writingBand !== undefined ||
    result.writingReview !== null ||
    result.details.length === 0
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
        <BrandLogo href="/student" compact />
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href="/student">
            <HugeiconsIcon icon={Home01Icon} size={15} /> Về trang chủ
          </Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={44} />
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Bạn đã nộp bài thành công!
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
              Điểm nhanh
            </p>
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
              Xem kết quả chi tiết
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2 sm:min-w-40">
            <Link href="/student">
              <HugeiconsIcon icon={Home01Icon} size={16} />
              Về trang chủ
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

function MockSubmitted({ attemptId }: { attemptId: string }) {
  const result = DEMO_ATTEMPT_RESULT
  const examTitle = DEMO_EXAM_MOCK_01.title
  const writingGraded = !!result.writingReview
  const hasWriting = true
  const submittedAt = "18/09/2026 10:42"

  const bands = [
    { label: "Listening", value: result.scores.listeningBand },
    { label: "Reading", value: result.scores.readingBand },
    { label: "Writing", value: writingGraded ? result.scores.writingBand : null },
    { label: "Overall", value: writingGraded ? result.scores.overallBand : null },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
        <BrandLogo href="/student" compact />
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href="/student">
            <HugeiconsIcon icon={Home01Icon} size={15} /> Về trang chủ
          </Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={44} />
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Bạn đã nộp bài thành công!
          </h1>
          <p className="text-sm text-muted-foreground">
            Bài thi <span className="font-semibold text-foreground">{examTitle}</span> đã được nộp
            lúc <span className="font-mono">{submittedAt}</span>.
          </p>
        </div>

        <Card className="w-full border-border shadow-xs">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Điểm nhanh
            </p>
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

            {hasWriting && !writingGraded && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                <HugeiconsIcon icon={Clock01Icon} size={16} className="mt-0.5 text-amber-600" />
                <p className="text-xs text-foreground/90">
                  Writing sẽ được giáo viên chấm. Bạn sẽ thấy kết quả và nhận xét chi tiết tại trang{" "}
                  <span className="font-semibold">Kết quả</span> khi hoàn tất.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2 font-semibold sm:min-w-48">
            <Link href={`/student/results/${attemptId}`}>
              <HugeiconsIcon icon={Award01Icon} size={16} />
              Xem kết quả chi tiết
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2 sm:min-w-40">
            <Link href="/student">
              <HugeiconsIcon icon={Home01Icon} size={16} />
              Về trang chủ
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
