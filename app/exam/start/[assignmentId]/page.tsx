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
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { BrandLogo } from "@/components/layout/brand-logo"
import { useMyAssignmentsQuery } from "@/hooks/use-assignments"
import { useStartAttemptMutation } from "@/hooks/use-attempts"
import { getExamDetailApi } from "@/lib/api/attempts"
import { ApiError } from "@/lib/api/client"
import type { CandidateExam, MyAssignment } from "@/lib/api/types"

export default function ExamLobbyPage() {
  const params = useParams<{ assignmentId: string }>()
  const assignmentId = params.assignmentId

  return <RealLobby assignmentId={assignmentId} />
}

function RealLobby({ assignmentId }: { assignmentId: string }) {
  const router = useRouter()
  const myAssignmentsQuery = useMyAssignmentsQuery({}, true)
  const startAttemptMutation = useStartAttemptMutation()

  const assignment = React.useMemo(
    () => (myAssignmentsQuery.data ?? []).find((a) => a.id === assignmentId) ?? null,
    [myAssignmentsQuery.data, assignmentId]
  )

  const examQuery = useQuery({
    queryKey: ["exams", "detail", assignment?.examId ?? ""] as const,
    queryFn: () => getExamDetailApi(assignment!.examId),
    enabled: !!assignment,
    staleTime: 60_000,
    retry: 0,
  })

  const exam = examQuery.data ?? null
  const loadError = examQuery.error
    ? examQuery.error instanceof ApiError
      ? examQuery.error.message
      : "Không tải được thông tin đề thi."
    : null
  const loadingExam = examQuery.isLoading

  const isLoading = myAssignmentsQuery.isLoading || loadingExam
  const isNotFound =
    myAssignmentsQuery.isSuccess && !assignment ? "Không tìm thấy bài tập này trong danh sách của bạn." : null
  const isError = myAssignmentsQuery.isError
    ? "Không tải được danh sách bài tập."
    : (isNotFound ?? loadError)

  const handleStartExam = async () => {
    if (!assignment || !exam) return
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
      const result = await startAttemptMutation.mutateAsync({
        examId: assignment.examId,
        assignmentId: assignment.id,
      })
      router.replace(`/exam/${result.attemptId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        const code = err.code
        if (code === "EXAM_NOT_OPENED") {
          toast.error("Đề thi chưa mở", { description: err.message })
        } else if (code === "EXAM_CLOSED" || code === "ASSIGNMENT_DEADLINE_PASSED") {
          toast.error("Đã quá hạn làm bài", { description: err.message })
        } else if (code === "ASSIGNMENT_MAX_ATTEMPTS_REACHED") {
          toast.error("Bạn đã dùng hết lượt làm bài", { description: err.message })
        } else if (code === "EXAM_NOT_PUBLISHED" || code === "NOT_FOUND" || code === "FORBIDDEN") {
          toast.error("Bài thi không khả dụng", { description: err.message })
        } else {
          toast.error("Không thể bắt đầu bài thi", { description: err.message })
        }
      } else {
        toast.error("Không thể bắt đầu bài thi")
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

  if (isError || !exam || !assignment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/20">
        <Card className="w-full max-w-md border-destructive/40">
          <CardContent className="p-6 text-center space-y-3">
            <HugeiconsIcon icon={Alert02Icon} size={32} className="mx-auto text-destructive" />
            <h2 className="font-heading font-semibold text-base">Không thể mở phòng chờ thi</h2>
            <p className="text-xs text-muted-foreground">{isError ?? "Không có dữ liệu đề thi."}</p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link href="/student/exams">Về danh sách đề thi</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <LobbyUI exam={exam} assignment={assignment} isPending={startAttemptMutation.isPending} onStart={handleStartExam} />
}

// ─── Shared lobby UI (dùng cho cả mock & real) ──────────────
function LobbyUI({
  exam,
  assignment,
  isPending,
  onStart,
}: {
  exam: CandidateExam
  assignment: MyAssignment
  isPending: boolean
  onStart: () => void
}) {
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false)
  const [hasTestedAudio, setHasTestedAudio] = React.useState(false)
  const [hasAgreedRules, setHasAgreedRules] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const toggleSoundCheck = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg")
      audioRef.current.onended = () => setIsPlayingAudio(false)
    }
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlayingAudio(true)
      setHasTestedAudio(true)
    }
  }

  const sectionsBySkill = exam.sections.reduce<Record<string, { parts: number; questions: number }>>(
    (acc, sec) => {
      const key = sec.skill
      if (!acc[key]) acc[key] = { parts: 0, questions: 0 }
      acc[key].parts += 1
      acc[key].questions += (sec.questionGroups ?? []).reduce(
        (sum, g) => sum + g.questions.length,
        0
      )
      return acc
    },
    {}
  )
  const hasListening = !!sectionsBySkill.listening

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/20">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        {/* Top header */}
        <div className="flex items-center justify-between">
          <BrandLogo href="/student" />
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
            <Link href="/student/exams">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              <span>Thoát ra danh sách đề thi</span>
            </Link>
          </Button>
        </div>

        {/* Exam Information Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-primary font-semibold border-primary/30 bg-primary/5">
                Phòng thi trực tuyến
              </Badge>
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <HugeiconsIcon icon={Timer01Icon} size={14} />
                Thời lượng: {exam.durationMinutes} phút
              </span>
            </div>
            <CardTitle className="font-heading text-2xl font-extrabold text-foreground mt-2">
              {exam.title}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-muted-foreground">
              GV: {assignment.teacherName}
              {assignment.className ? ` · Lớp ${assignment.className}` : ""}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Sections summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["listening", "reading", "writing"] as const).map((skill) => {
                const agg = sectionsBySkill[skill]
                return (
                  <div
                    key={skill}
                    className="rounded-xl border border-border bg-muted/30 p-3 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground font-medium block capitalize">
                      {skill}
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground mt-0.5 block">
                      {agg
                        ? skill === "writing"
                          ? `${agg.questions} task`
                          : `${agg.parts} phần · ${agg.questions} câu`
                        : "—"}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Sound Check Box */}
            {hasListening && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={VolumeHighIcon} size={20} className="text-primary" />
                    <span className="font-heading font-bold text-sm text-foreground">
                      Kiểm tra tai nghe / âm thanh
                    </span>
                  </div>
                  {hasTestedAudio && (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                      <span>Đã kiểm tra ✓</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Đảm bảo bạn đeo tai nghe và nghe rõ âm lượng trước khi bắt đầu bài thi Listening.
                </p>
                <Button
                  variant={isPlayingAudio ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleSoundCheck}
                  className="gap-2 text-xs font-semibold"
                >
                  <HugeiconsIcon icon={isPlayingAudio ? PauseIcon : PlayIcon} size={14} />
                  <span>{isPlayingAudio ? "Dừng âm thanh thử" : "Phát âm thanh thử nghiệm"}</span>
                </Button>
              </div>
            )}

            {/* Exam Rules */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs text-muted-foreground">
              <span className="font-semibold text-amber-700 dark:text-orange-400 flex items-center gap-1.5">
                <HugeiconsIcon icon={Alert02Icon} size={16} />
                Quy chế phòng thi IELTS LOVERs:
              </span>
              <ul className="list-disc list-inside space-y-1 text-foreground/85 pl-1 leading-relaxed">
                <li>
                  Đồng hồ đếm ngược được tính theo máy chủ và <strong>không dừng lại</strong> khi tải lại
                  trang.
                </li>
                <li>
                  Hệ thống tự động lưu đáp án sau mỗi 2.5 giây. Nếu mất kết nối, dữ liệu vẫn được lưu an
                  toàn trên máy.
                </li>
                <li>
                  Không chuyển tab hoặc thoát toàn màn hình; mọi hành vi bất thường sẽ được ghi nhận vào
                  nhật ký nộp bài.
                </li>
                <li>Khi hết thời gian, bài thi sẽ tự động khóa và nộp kết quả lên hệ thống.</li>
              </ul>
            </div>

            {/* Agreement checkbox */}
            <label className="flex items-start gap-3 cursor-pointer text-xs select-none rounded-lg p-1 hover:bg-foreground/5 transition-colors">
              <input
                type="checkbox"
                checked={hasAgreedRules}
                onChange={(e) => setHasAgreedRules(e.target.checked)}
                className="mt-0.5 size-4 rounded-md border-[1.5px] border-border-strong text-primary accent-primary cursor-pointer focus:ring-1 focus:ring-primary/30"
              />
              <span className="text-foreground leading-normal font-medium">
                Tôi xác nhận đã kiểm tra âm thanh, hiểu rõ quy chế phòng thi và sẵn sàng bước vào bài làm.
              </span>
            </label>

            {/* Start Button */}
            <Button
              size="lg"
              disabled={!hasAgreedRules || isPending}
              onClick={onStart}
              className="w-full h-12 text-base font-bold shadow-xs gap-2"
            >
              <HugeiconsIcon icon={PlayIcon} size={18} />
              <span>{isPending ? "Đang vào phòng thi…" : "Bắt đầu làm bài thi"}</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
