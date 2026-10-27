"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  VolumeHighIcon,
  PlayIcon,
  PauseIcon,
  Timer01Icon,
  Alert02Icon,
  ArrowLeft01Icon,
  HeadphonesIcon,
  Book02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { BrandLogo } from "@/components/layout/brand-logo"
import { useStartAttemptMutation } from "@/hooks/use-attempts"
import { getExamDetailApi } from "@/lib/api/attempts"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import type { CandidateExam } from "@/lib/api/types"

export default function PracticeLobbyPage() {
  const params = useParams<{ examId: string }>()
  const examId = params.examId
  const router = useRouter()

  const startAttemptMutation = useStartAttemptMutation()

  const examQuery = useQuery({
    queryKey: ["exams", "detail", examId] as const,
    queryFn: () => getExamDetailApi(examId),
    enabled: !!examId,
    staleTime: 60_000,
    retry: 0,
  })

  const exam = examQuery.data ?? null
  const isLoading = examQuery.isLoading
  const loadError = examQuery.error
    ? examQuery.error instanceof ApiError
      ? examQuery.error.message
      : "Không tải được thông tin bài luyện tập."
    : null

  const handleStartPractice = async () => {
    if (!exam) return
    try {
      const result = await startAttemptMutation.mutateAsync({
        examId: exam.id,
      })
      router.replace(`/exam/${result.attemptId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Không thể bắt đầu bài luyện tập", { description: err.message })
      } else {
        toast.error("Không thể bắt đầu bài luyện tập")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/20">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  if (loadError || !exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/20">
        <Card className="w-full max-w-md border-destructive/40">
          <CardContent className="p-6 text-center space-y-3">
            <HugeiconsIcon icon={Alert02Icon} size={32} className="mx-auto text-destructive" />
            <h2 className="font-heading font-semibold text-base">Không thể mở bài luyện tập</h2>
            <p className="text-xs text-muted-foreground">{loadError ?? "Không có dữ liệu bài thi."}</p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link href="/student/practice">Về danh mục luyện tập</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PracticeLobbyUI
      exam={exam}
      isPending={startAttemptMutation.isPending}
      onStart={handleStartPractice}
    />
  )
}

function PracticeLobbyUI({
  exam,
  isPending,
  onStart,
}: {
  exam: CandidateExam
  isPending: boolean
  onStart: () => void
}) {
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const hasListening = exam.sections.some((s) => s.skill === "listening")
  const hasWriting = exam.sections.some((s) => s.skill === "writing")
  const skillLabel = hasListening
    ? "Listening"
    : exam.sections.some((s) => s.skill === "reading")
      ? "Reading"
      : "Writing"
  const totalQuestions = exam.sections.reduce(
    (acc, s) =>
      acc + (s.questionGroups ?? []).reduce((gAcc, g) => gAcc + (g.questions?.length ?? 0), 0),
    0
  )

  const toggleSoundCheck = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg"
      )
      audioRef.current.onended = () => setIsPlayingAudio(false)
    }

    if (isPlayingAudio) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlayingAudio(false)
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => {
          toast.error("Không thể phát âm thanh kiểm tra")
          setIsPlayingAudio(false)
        })
    }
  }

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <BrandLogo size="sm" />
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
            <Link href="/student/practice">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              <span>Quay lại luyện tập</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-2xl border-border bg-card shadow-sm">
          <CardHeader className="space-y-2 border-b border-border/50 pb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs font-semibold bg-primary/10 text-primary border-primary/20"
              >
                Luyện tập tự do
              </Badge>
              {exam.curriculum?.collectionName && (
                <span className="text-xs text-muted-foreground">
                  {exam.curriculum.collectionName}
                  {exam.curriculum.testNumber ? ` • Test ${exam.curriculum.testNumber}` : ""}
                </span>
              )}
            </div>
            <CardTitle className="font-heading text-xl sm:text-2xl font-bold">
              {exam.title}
            </CardTitle>
            {exam.description && (
              <CardDescription className="text-xs sm:text-sm">
                {exam.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Quick Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Timer01Icon} size={16} />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Thời gian</div>
                  <div className="text-sm font-semibold">{exam.durationMinutes} phút</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon
                    icon={hasListening ? HeadphonesIcon : Book02Icon}
                    size={16}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Kỹ năng</div>
                  <div className="text-sm font-semibold capitalize">
                    {skillLabel}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-muted/30 col-span-2 sm:col-span-1 flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">{hasWriting ? "Số bài viết" : "Số câu hỏi"}</div>
                  <div className="text-sm font-semibold">
                    {hasWriting ? `${totalQuestions || 1} bài` : `${totalQuestions} câu`}
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Check for Listening */}
            {hasListening && (
              <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-medium text-xs">
                    <HugeiconsIcon icon={VolumeHighIcon} size={16} />
                    <span>Kiểm tra âm thanh tai nghe</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isPlayingAudio ? "destructive" : "outline"}
                    onClick={toggleSoundCheck}
                    className="gap-1.5 text-xs h-8"
                  >
                    <HugeiconsIcon icon={isPlayingAudio ? PauseIcon : PlayIcon} size={14} />
                    <span>{isPlayingAudio ? "Dừng thử" : "Nghe thử"}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Đeo tai nghe và điều chỉnh âm lượng để đảm bảo bạn có thể nghe rõ ràng nội dung bài thi.
                </p>
              </div>
            )}

            {/* Information Notice */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">💡 Lưu ý khi luyện tập:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Bài luyện tập không áp dụng giám sát chống gian lận (Anti-cheat).</li>
                <li>Bạn có thể làm bài ở chế độ cửa sổ thông thường, không ép buộc toàn màn hình.</li>
                {hasWriting ? (
                  <>
                    <li>Bài Writing được giáo viên chấm và nhận xét sau khi bạn nộp bài.</li>
                    <li>Sau khi nộp, bạn có thể xem lại đề bài và bài viết của mình.</li>
                  </>
                ) : (
                  <li>Sau khi nộp bài, bạn sẽ xem ngay đáp án giải thích chi tiết và danh sách từ vựng.</li>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" asChild size="default" className="text-xs">
                <Link href="/student/practice">Để sau</Link>
              </Button>
              <Button
                size="default"
                onClick={onStart}
                disabled={isPending}
                className="gap-2 font-semibold text-xs px-6"
              >
                <HugeiconsIcon icon={PlayIcon} size={16} />
                <span>{isPending ? "Đang chuẩn bị..." : "Bắt đầu luyện tập"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
