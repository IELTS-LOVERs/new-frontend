"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Copy01Icon,
  MaximizeScreenIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { DEMO_GRADING_VIEW, DEMO_PENDING_GRADING, DEMO_ANTI_CHEAT_EVENTS } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import {
  useAttemptGradingViewQuery,
  useGradeWritingMutation,
  usePendingGradingQuery,
} from "@/hooks/use-grading"
import { useAttemptEventsQuery } from "@/hooks/use-attempts"
import { formatBand } from "@/lib/format"

// Lưới band 0-9, bước 0.5 (khớp validate backend)
const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => (i * 0.5).toFixed(1))

interface GradingDraft {
  task1Score: string | null
  task1Comment: string
  task2Score: string | null
  task2Comment: string
  generalFeedback: string
}

function loadDraft(attemptId: string): GradingDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`grading-draft:${attemptId}`)
    return raw ? (JSON.parse(raw) as GradingDraft) : null
  } catch {
    return null
  }
}

function saveDraft(attemptId: string, draft: GradingDraft) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`grading-draft:${attemptId}`, JSON.stringify(draft))
  } catch {
    // ignore quota errors
  }
}

function clearDraft(attemptId: string) {
  if (typeof window === "undefined") return
  localStorage.removeItem(`grading-draft:${attemptId}`)
}

function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Không tải được dữ liệu chấm bài."
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

function GradingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <Skeleton className="h-96 w-full rounded-xl lg:col-span-7" />
        <Skeleton className="h-96 w-full rounded-xl lg:col-span-5" />
      </div>
    </div>
  )
}

export default function TeacherWritingGradingPage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId
  const router = useRouter()

  const gradingQuery = useAttemptGradingViewQuery(attemptId, !USE_MOCKS)
  const eventsQuery = useAttemptEventsQuery(attemptId, !USE_MOCKS)
  const pendingQuery = usePendingGradingQuery(!USE_MOCKS)
  const gradeMutation = useGradeWritingMutation()

  const [activeTask, setActiveTask] = React.useState<"task1" | "task2">("task1")
  // Khôi phục nháp từ localStorage theo attemptId (lazy init — không mất khi đóng tab)
  const [draftSource, setDraftSource] = React.useState<string | null>(null)
  const [task1Score, setTask1Score] = React.useState<string | null>(null)
  const [task1Comment, setTask1Comment] = React.useState<string>("")
  const [task2Score, setTask2Score] = React.useState<string | null>(null)
  const [task2Comment, setTask2Comment] = React.useState<string>("")
  const [generalFeedback, setGeneralFeedback] = React.useState<string>("")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const pendingAction = React.useRef<"save" | "next">("save")

  if (draftSource !== attemptId) {
    setDraftSource(attemptId)
    const draft = loadDraft(attemptId)
    setTask1Score(draft?.task1Score ?? null)
    setTask1Comment(draft?.task1Comment ?? "")
    setTask2Score(draft?.task2Score ?? null)
    setTask2Comment(draft?.task2Comment ?? "")
    setGeneralFeedback(draft?.generalFeedback ?? "")
  }

  // Tự lưu nháp khi đang gõ
  React.useEffect(() => {
    saveDraft(attemptId, { task1Score, task1Comment, task2Score, task2Comment, generalFeedback })
  }, [attemptId, task1Score, task1Comment, task2Score, task2Comment, generalFeedback])

  const data = USE_MOCKS ? DEMO_GRADING_VIEW : gradingQuery.data
  const queue = USE_MOCKS ? DEMO_PENDING_GRADING : (pendingQuery.data?.items ?? [])
  const queueIndex = queue.findIndex((p) => p.attemptId === attemptId)
  const queuePosition = queueIndex >= 0 ? queueIndex + 1 : null
  const prevAttempt = queueIndex > 0 ? queue[queueIndex - 1] : null
  const nextAttempt = queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null

  const events = USE_MOCKS
    ? DEMO_ANTI_CHEAT_EVENTS
    : (eventsQuery.data?.events ?? [])
  const pastes = events.filter((e) => e.type === "PASTE").length
  const tabSwitches = events.filter((e) => e.type === "TAB_SWITCH" || e.type === "WINDOW_BLUR").length
  const fullscreenExits = events.filter((e) => e.type === "FULLSCREEN_EXIT").length

  const hasAnyScore = task1Score !== null || task2Score !== null

  // Dự kiến Writing Band (round half 0.5) — chỉ preview, chính thức từ response
  const previewOverall = React.useMemo(() => {
    const s1 = task1Score ? parseFloat(task1Score) : null
    const s2 = task2Score ? parseFloat(task2Score) : null
    if (s1 === null && s2 === null) return null
    const raw = ((s1 ?? 0) + (s2 ?? 0) * 2) / 3
    return (Math.round(raw * 2) / 2).toFixed(1)
  }, [task1Score, task2Score])

  const doSubmit = React.useCallback(
    (next: boolean) => {
      if (!data) return
      gradeMutation.mutate(
        {
          attemptId,
          ...(task1Score !== null
            ? { task1: { score: parseFloat(task1Score), comment: task1Comment || undefined } }
            : {}),
          ...(task2Score !== null
            ? { task2: { score: parseFloat(task2Score), comment: task2Comment || undefined } }
            : {}),
          ...(generalFeedback ? { generalFeedback } : {}),
        },
        {
          onSuccess: (result) => {
            clearDraft(attemptId)
            toast.success(`Đã lưu điểm cho ${data.student.fullName}`, {
              description: `Writing Band chính thức: ${formatBand(result.overallWritingScore)}`,
            })
            if (next) {
              if (nextAttempt) {
                router.push(`/teacher/grading/${nextAttempt.attemptId}`)
              } else {
                router.push("/teacher/submissions")
              }
            }
          },
          onError: (error) => {
            toast.error(
              error instanceof ApiError ? error.message : "Không lưu được điểm. Vui lòng thử lại."
            )
          },
        }
      )
    },
    [data, gradeMutation, attemptId, task1Score, task1Comment, task2Score, task2Comment, generalFeedback, nextAttempt, router]
  )

  // G7: không sửa được điểm đã chấm → confirm kỹ trước khi lưu
  const requestSave = React.useCallback(
    (next: boolean) => {
      if (!hasAnyScore) {
        toast.error("Chọn band điểm cho ít nhất 1 task trước khi lưu.")
        return
      }
      pendingAction.current = next ? "next" : "save"
      setConfirmOpen(true)
    },
    [hasAnyScore]
  )

  // Phím tắt: Ctrl+Enter lưu & tiếp, [ / ] bài trước/sau, 1/2 chuyển Task
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (!gradeMutation.isPending) requestSave(true)
        return
      }
      if (typing) return
      if (e.key === "[") {
        if (prevAttempt) router.push(`/teacher/grading/${prevAttempt.attemptId}`)
      } else if (e.key === "]") {
        if (nextAttempt) router.push(`/teacher/grading/${nextAttempt.attemptId}`)
      } else if (e.key === "1") {
        setActiveTask("task1")
      } else if (e.key === "2") {
        setActiveTask("task2")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [gradeMutation.isPending, requestSave, prevAttempt, nextAttempt, router])

  if (!USE_MOCKS) {
    if (gradingQuery.isLoading) return <GradingSkeleton />
    if (gradingQuery.isError) {
      return (
        <div className="mx-auto max-w-7xl space-y-6 pb-12">
          <QueryError error={gradingQuery.error} onRetry={() => gradingQuery.refetch()} />
        </div>
      )
    }
  }
  if (!data) return null

  const task1Data = data.writingTasks.find((t) => t.task === 1)
  const task2Data = data.writingTasks.find((t) => t.task === 2)

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in pb-12">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
            <Link href="/teacher/submissions">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              <span>Danh sách bài nộp</span>
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground">
              Writing Review Studio
            </h1>
            <p className="text-xs text-muted-foreground">
              Học sinh: <span className="font-semibold text-foreground">{data.student.fullName}</span>
              {task2Data ? " · Đề gồm Task 1 & Task 2" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {queuePosition !== null ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                asChild={!!prevAttempt}
                disabled={!prevAttempt}
                title={prevAttempt ? "Bài trước ([)" : "Không có bài trước"}
              >
                {prevAttempt ? (
                  <Link href={`/teacher/grading/${prevAttempt.attemptId}`}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                  </Link>
                ) : (
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                )}
              </Button>
              <Badge variant="outline" className="font-mono text-xs">
                Bài {queuePosition}/{queue.length}
              </Badge>
              <Button
                variant="outline"
                size="icon-sm"
                asChild={!!nextAttempt}
                disabled={!nextAttempt}
                title={nextAttempt ? "Bài tiếp (])" : "Không có bài tiếp"}
              >
                {nextAttempt ? (
                  <Link href={`/teacher/grading/${nextAttempt.attemptId}`}>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                  </Link>
                ) : (
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                )}
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="font-mono text-xs">
              Ngoài hàng đợi
            </Badge>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => requestSave(true)}
            disabled={gradeMutation.isPending || !hasAnyScore}
            title={!hasAnyScore ? "Chọn band điểm cho ít nhất 1 task" : "Lưu & chấm bài tiếp (Ctrl+Enter)"}
            className="gap-1.5 font-semibold"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
            <span>{gradeMutation.isPending ? "Đang lưu..." : "Lưu & Chấm bài tiếp"}</span>
          </Button>
        </div>
      </div>

      {/* Cảnh báo nghi vấn */}
      {(pastes > 0 || tabSwitches > 0 || fullscreenExits > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3">
          <HugeiconsIcon icon={Alert02Icon} size={15} className="text-amber-600 shrink-0" />
          <span className="text-xs font-medium text-foreground">
            Bài làm có dấu hiệu cần kiểm tra:
          </span>
          {pastes > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px] font-normal">
              <HugeiconsIcon icon={Copy01Icon} size={10} />
              {pastes} lần dán văn bản
            </Badge>
          )}
          {tabSwitches > 0 && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {tabSwitches} lần rời tab
            </Badge>
          )}
          {fullscreenExits > 0 && (
            <Badge variant="outline" className="gap-1 text-[10px] font-normal">
              <HugeiconsIcon icon={MaximizeScreenIcon} size={10} />
              {fullscreenExits} lần thoát fullscreen
            </Badge>
          )}
        </div>
      )}

      {/* 2-Column Grading Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (60% / 7 cols): Student Essay */}
        <div className="lg:col-span-7 space-y-4">
          <Tabs value={activeTask} onValueChange={(v) => setActiveTask(v as "task1" | "task2")} className="w-full">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="task1" className="gap-2 text-xs" disabled={!task1Data}>
                  <span>Task 1 (Report)</span>
                  <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1">
                    {task1Data?.wordCount ?? 0} từ
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="task2" className="gap-2 text-xs" disabled={!task2Data}>
                  <span>Task 2 (Essay)</span>
                  <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1">
                    {task2Data?.wordCount ?? 0} từ
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <span className="text-xs text-muted-foreground font-mono">
                {activeTask === "task1" ? "Yêu cầu ≥ 150 từ" : "Yêu cầu ≥ 250 từ"}
              </span>
            </div>

            {/* Task 1 Content */}
            <TabsContent value="task1" className="space-y-4 mt-4">
              {task1Data ? (
                <>
                  <Card className="border-border bg-muted/20">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider font-mono">
                        Đề bài Task 1
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs leading-relaxed text-foreground/90 whitespace-pre-line font-medium">
                      {task1Data.prompt}
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-border">
                      <div className="space-y-0.5">
                        <CardTitle className="font-heading text-sm font-bold">
                          Bài viết của học sinh
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Bài làm đã nộp của {data.student.fullName}
                        </CardDescription>
                      </div>
                      {task1Data.wordCount >= 150 ? (
                        <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-xs">
                          ✓ {task1Data.wordCount} words (Đủ số từ)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-mono text-amber-600 bg-amber-500/10 border-amber-500/20 text-xs">
                          ⚠ {task1Data.wordCount} words (Dưới 150 từ)
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="font-serif text-sm leading-[1.8] text-foreground whitespace-pre-line select-text">
                        {task1Data.studentContent}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Bài thi này không có Writing Task 1.
                </p>
              )}
            </TabsContent>

            {/* Task 2 Content */}
            <TabsContent value="task2" className="space-y-4 mt-4">
              {task2Data ? (
                <>
                  <Card className="border-border bg-muted/20">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider font-mono">
                        Đề bài Task 2
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs leading-relaxed text-foreground/90 whitespace-pre-line font-medium">
                      {task2Data.prompt}
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-border">
                      <div className="space-y-0.5">
                        <CardTitle className="font-heading text-sm font-bold">
                          Bài viết của học sinh
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Bài làm đã nộp của {data.student.fullName}
                        </CardDescription>
                      </div>
                      {task2Data.wordCount >= 250 ? (
                        <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-xs">
                          ✓ {task2Data.wordCount} words (Đủ số từ)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-mono text-amber-600 bg-amber-500/10 border-amber-500/20 text-xs">
                          ⚠ {task2Data.wordCount} words (Dưới 250 từ)
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="font-serif text-sm leading-[1.8] text-foreground whitespace-pre-line select-text">
                        {task2Data.studentContent}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Bài thi này không có Writing Task 2.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (40% / 5 cols): Grading Rubric & Feedback Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Overall Writing Band Preview Card */}
          <Card className="border-primary/40 bg-primary/5 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-primary uppercase">
                  Dự kiến Writing Band
                </CardDescription>
                <span className="text-[10px] text-muted-foreground font-mono">
                  (Task 1 + Task 2 × 2) / 3
                </span>
              </div>
              <CardTitle className="font-mono text-4xl font-black text-primary">
                {previewOverall ?? "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              Chỉ là dự kiến — band chính thức lấy từ kết quả lưu của hệ thống.
            </CardContent>
          </Card>

          {/* Task 1 Scoring */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="font-heading text-sm font-bold">
                  Task 1 Band Score
                </CardTitle>
                <Badge variant="outline" className="font-mono font-bold text-primary">
                  {task1Score ? `Band ${task1Score}` : "Chưa chọn"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Chọn Band điểm:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {BAND_OPTIONS.map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTask1Score(score)}
                      className={`h-7 px-2.5 rounded text-xs font-mono font-semibold transition-colors ${
                        task1Score === score
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Nhận xét chi tiết Task 1:</Label>
                <Textarea
                  value={task1Comment}
                  onChange={(e) => setTask1Comment(e.target.value)}
                  placeholder="Nhập nhận xét về Task Achievement, Coherence, Lexical..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Task 2 Scoring */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="font-heading text-sm font-bold">
                  Task 2 Band Score
                </CardTitle>
                <Badge variant="outline" className="font-mono font-bold text-primary">
                  {task2Score ? `Band ${task2Score}` : "Chưa chọn"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Chọn Band điểm:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {BAND_OPTIONS.map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTask2Score(score)}
                      className={`h-7 px-2.5 rounded text-xs font-mono font-semibold transition-colors ${
                        task2Score === score
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Nhận xét chi tiết Task 2:</Label>
                <Textarea
                  value={task2Comment}
                  onChange={(e) => setTask2Comment(e.target.value)}
                  placeholder="Nhập nhận xét về Task Response, Cohesion, Grammar..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* General Feedback */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border">
              <CardTitle className="font-heading text-sm font-bold">
                Nhận xét tổng quan của Giáo viên
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                placeholder="Lời nhắn động viên hoặc hướng dẫn cải thiện gửi đến học sinh..."
                rows={3}
                className="text-xs resize-none"
              />
            </CardContent>
          </Card>

          {/* Final Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 font-semibold h-10 gap-2"
              onClick={() => requestSave(true)}
              disabled={gradeMutation.isPending || !hasAnyScore}
              title={!hasAnyScore ? "Chọn band điểm cho ít nhất 1 task" : undefined}
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
              <span>{gradeMutation.isPending ? "Đang lưu..." : "Hoàn tất & Lưu đánh giá"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* G7: Confirm trước khi lưu — không sửa được điểm sau khi lưu */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Xác nhận lưu điểm?</DialogTitle>
            <DialogDescription className="text-xs">
              Bạn không thể sửa điểm sau khi lưu. Vui lòng kiểm tra kỹ band điểm và nhận xét trước
              khi xác nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1.5">
            <p className="text-muted-foreground">
              Task 1:{" "}
              <span className="font-mono font-semibold text-foreground">
                {task1Score ?? "Chưa chấm"}
              </span>
            </p>
            <p className="text-muted-foreground">
              Task 2:{" "}
              <span className="font-mono font-semibold text-foreground">
                {task2Score ?? "Chưa chấm"}
              </span>
            </p>
            <p className="text-muted-foreground">
              Writing (dự kiến):{" "}
              <span className="font-mono font-semibold text-primary">{previewOverall ?? "—"}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Kiểm tra lại
            </Button>
            <Button
              className="font-semibold"
              disabled={gradeMutation.isPending}
              onClick={() => {
                setConfirmOpen(false)
                doSubmit(pendingAction.current === "next")
              }}
            >
              {gradeMutation.isPending ? "Đang lưu..." : "Xác nhận lưu điểm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
