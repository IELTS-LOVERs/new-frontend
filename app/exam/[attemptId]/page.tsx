"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PlayIcon,
  VolumeHighIcon,
  Timer01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Flag01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { BrandLogo } from "@/components/layout/brand-logo"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { useExamTimer } from "@/features/exam-engine/hooks/use-exam-timer"
import { useAutosave } from "@/features/exam-engine/hooks/use-autosave"
import { useExamRecovery } from "@/features/exam-engine/hooks/use-recovery"
import { useAntiCheat } from "@/features/exam-engine/hooks/use-anti-cheat"
import { useExamAudioPlayer } from "@/features/exam-engine/hooks/use-audio-player"
import { useSubmitAttemptMutation } from "@/hooks/use-attempts"
import { clearAttemptSnapshot } from "@/features/exam-engine/lib/idb"
import { formatDuration, QUESTION_GROUP_TYPE_LABEL } from "@/lib/format"
import { DEMO_EXAM_MOCK_01 } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import type { CandidateSection, CandidateQuestionGroup, CandidateQuestionItem, CandidateQuestion } from "@/lib/api/types"

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Helper: Check if a section uses the new questionGroups format */
function sectionHasGroups(section: CandidateSection): boolean {
  return Array.isArray(section.questionGroups) && section.questionGroups.length > 0
}

/** Helper: Extract flat question list from section (handles both formats) */
function flattenSectionQuestions(section: CandidateSection): Array<{ id: string; prompt: string; type?: string }> {
  if (sectionHasGroups(section)) {
    return section.questionGroups!.flatMap((g) =>
      g.questions.map((q) => ({ id: q.id, prompt: q.prompt, type: g.groupType }))
    )
  }
  return section.questions.map((q) => ({ id: q.id, prompt: q.prompt, type: q.type }))
}

export default function ExamEnginePage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

  // ─── Mock shortcut (demo mode) ─────────────────────────────
  if (USE_MOCKS) {
    return <MockExamEngine attemptId={attemptId} />
  }

  return <RealExamEngine attemptId={attemptId} />
}

// ═══════════════════════════════════════════════════════════════
// Real exam engine (API + IndexedDB + anti-cheat)
// ═══════════════════════════════════════════════════════════════
function RealExamEngine({ attemptId }: { attemptId: string }) {
  const router = useRouter()
  const exam = useExamSessionStore((s) => s.exam)
  const phase = useExamSessionStore((s) => s.phase)
  const answers = useExamSessionStore((s) => s.answers)
  const flagged = useExamSessionStore((s) => s.flagged)
  const saveStatus = useExamSessionStore((s) => s.saveStatus)
  const ui = useExamSessionStore((s) => s.ui)
  const setActiveSectionIndex = useExamSessionStore((s) => s.setActiveSectionIndex)
  const activeSectionIndex = useExamSessionStore((s) => s.activeSectionIndex)
  const setAnswer = useExamSessionStore((s) => s.setAnswer)
  const toggleFlag = useExamSessionStore((s) => s.toggleFlag)
  const setPhase = useExamSessionStore((s) => s.setPhase)
  const setUIFontScale = useExamSessionStore((s) => s.setUIFontScale)
  const setUITheme = useExamSessionStore((s) => s.setUITheme)

  const [isSubmitOpen, setIsSubmitOpen] = React.useState(false)
  const [writingTask, setWritingTask] = React.useState<"task1" | "task2">("task1")
  const submitMutation = useSubmitAttemptMutation()
  const handleSubmitRef = React.useRef<(auto?: boolean) => Promise<void>>(async () => {})

  const { status: recoveryStatus, error: recoveryError, needsGesture, confirmResume } =
    useExamRecovery(attemptId)

  const { secondsLeft } = useExamTimer(() => {
    // Hết giờ → submit
    void handleSubmitRef.current(true)
  })

  const { flush } = useAutosave(attemptId)
  useAntiCheat(attemptId, phase === "active" || phase === "offline")

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async (auto = false) => {
    if (phase === "submitting" || phase === "finished") return
    setPhase("submitting")
    try {
      // Flush tất cả dirty answers trước (tối đa 10s)
      await Promise.race([
        flush(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("flush-timeout")), 10_000)),
      ]).catch(() => {
        // Nếu flush thất bại vì mạng và không phải hết giờ → cho phép thử lại
        if (!auto) {
          setPhase("active")
          toast.error("Chưa thể đồng bộ đáp án. Kiểm tra kết nối rồi bấm Thử lại.")
          throw new Error("flush-failed")
        }
      })

      const result = await submitMutation.mutateAsync(attemptId)
      await clearAttemptSnapshot(attemptId)
      setPhase("finished")
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      if (result.message) {
        toast.info(result.message)
      } else {
        toast.success("Đã nộp bài thi thành công!")
      }
      router.replace(`/exam/${attemptId}/submitted`)
    } catch (err: any) {
      if (err?.message === "flush-failed") return
      setPhase("active")
      const code = err?.code
      if (code === "EXAM_ALREADY_SUBMITTED") {
        // coi như thành công
        setPhase("finished")
        router.replace(`/exam/${attemptId}/submitted`)
        return
      }
      toast.error(err?.message ?? "Không thể nộp bài. Vui lòng thử lại.")
    }
  }

  React.useEffect(() => {
    handleSubmitRef.current = handleSubmit
  })

  // ─── Recovery states ───────────────────────────────────────
  if (recoveryStatus === "loading") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-6 w-80" />
        <p className="text-xs text-muted-foreground">Đang khôi phục bài làm…</p>
      </div>
    )
  }

  if (recoveryStatus === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <HugeiconsIcon icon={Alert02Icon} size={40} className="text-destructive" />
        <h1 className="font-heading text-lg font-semibold">Không thể mở bài thi</h1>
        <p className="text-sm text-muted-foreground">{recoveryError}</p>
        <Button asChild variant="outline">
          <Link href="/student/assignments">Về danh sách bài tập</Link>
        </Button>
      </div>
    )
  }

  if (needsGesture) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <BrandLogo href="/student" />
        <h1 className="font-heading text-lg font-semibold">Tiếp tục làm bài</h1>
        <p className="text-sm text-muted-foreground">
          Bấm nút bên dưới để vào lại chế độ toàn màn hình và tiếp tục bài thi.
        </p>
        <Button size="lg" onClick={confirmResume} className="gap-2">
          <HugeiconsIcon icon={PlayIcon} size={16} />
          Tiếp tục làm bài
        </Button>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Không có dữ liệu đề thi.</p>
      </div>
    )
  }

  const currentSection = exam.sections[activeSectionIndex] ?? exam.sections[0]
  const allQuestions = exam.sections.flatMap((s, sIdx) => {
    const qs = flattenSectionQuestions(s)
    return qs.map((q, qIdx) => ({ ...q, sectionIndex: sIdx, displayNumber: qIdx + 1 }))
  })
  const answeredCount = Object.values(answers).filter((a) => a.value?.trim()).length
  const totalQuestions = allQuestions.length

  return (
    <div
      className={cn(
        "flex h-screen flex-col overflow-hidden transition-colors duration-200",
        ui.theme === "cream" ? "bg-[#FAF8F5] text-[#2D2A26]" : "bg-background text-foreground"
      )}
    >
      {/* TOP BAR */}
      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-between border-b px-6 select-none z-30",
          ui.theme === "cream" ? "border-[#E8E4DD] bg-[#FAF8F5]" : "border-border bg-background"
        )}
      >
        <div className="flex items-center gap-6">
          <BrandLogo href="/student" compact />
          <div className="h-4 w-px bg-border hidden sm:block" />
          <span className="font-heading font-semibold text-sm text-foreground truncate max-w-[260px]">
            {exam.title}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          {exam.sections.map((sec, idx) => (
            <button
              key={`${sec.skill}-${sec.part}`}
              onClick={() => setActiveSectionIndex(idx)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors",
                idx === activeSectionIndex
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {sec.skill}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" ? (
              <span className="animate-pulse">Đang lưu...</span>
            ) : saveStatus === "saved" ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                Đã lưu
              </span>
            ) : saveStatus === "offline" ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <HugeiconsIcon icon={Alert02Icon} size={14} />
                Chưa đồng bộ
              </span>
            ) : saveStatus === "error" ? (
              <span className="text-destructive font-medium flex items-center gap-1">
                <HugeiconsIcon icon={Alert02Icon} size={14} />
                Lỗi lưu
              </span>
            ) : (
              <span>—</span>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 border border-border px-3 py-1 font-mono text-xs sm:text-sm font-semibold">
            <HugeiconsIcon icon={Timer01Icon} size={15} className="text-primary" />
            <span
              className={cn(
                secondsLeft <= 60
                  ? "text-destructive font-bold animate-pulse"
                  : secondsLeft <= 300
                    ? "text-destructive"
                    : secondsLeft <= 600
                      ? "text-amber-600"
                      : "text-foreground"
              )}
            >
              {formatDuration(secondsLeft)}
            </span>
          </div>

          {/* Theme */}
          <div className="hidden sm:flex items-center rounded-xl border border-border p-0.5 text-xs">
            <button
              onClick={() => setUITheme("white")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors",
                ui.theme === "white" ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              Trắng
            </button>
            <button
              onClick={() => setUITheme("cream")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors",
                ui.theme === "cream" ? "bg-[#EFECE6] font-semibold text-[#2D2A26]" : "text-muted-foreground"
              )}
            >
              Ngà
            </button>
          </div>

          {/* Font scale */}
          <div className="hidden sm:flex items-center rounded-xl border border-border p-0.5 text-xs">
            {([1, 1.125, 1.25] as const).map((scale, i) => (
              <button
                key={scale}
                onClick={() => setUIFontScale(scale)}
                className={cn(
                  "px-2 py-0.5 rounded-lg font-mono text-[11px]",
                  ui.fontScale === scale ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                )}
              >
                {["A", "A+", "A++"][i]}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => setIsSubmitOpen(true)} className="font-medium text-xs h-8 px-3">
            Nộp bài
          </Button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 overflow-hidden" style={{ fontSize: `${ui.fontScale * 100}%` }}>
        {currentSection.skill === "listening" && (
          <ListeningSection
            section={currentSection}
            answers={answers}
            flagged={flagged}
            onAnswer={(qid, v) => setAnswer(qid, v)}
            onToggleFlag={toggleFlag}
            uiTheme={ui.theme}
          />
        )}
        {currentSection.skill === "reading" && (
          <ReadingSection
            section={currentSection}
            answers={answers}
            flagged={flagged}
            onAnswer={(qid, v) => setAnswer(qid, v)}
            onToggleFlag={toggleFlag}
          />
        )}
        {currentSection.skill === "writing" && (
          <WritingSection
            section={currentSection}
            answers={answers}
            writingTask={writingTask}
            onSwitchTask={setWritingTask}
            onAnswer={(qid, v) => setAnswer(qid, v)}
          />
        )}
        {currentSection.skill === "speaking" && (
          <SpeakingSection
            section={currentSection}
            answers={answers}
            flagged={flagged}
            onAnswer={(qid, v) => setAnswer(qid, v)}
            onToggleFlag={toggleFlag}
          />
        )}
      </main>

      {/* BOTTOM PALETTE */}
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border bg-background px-6 select-none z-30">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
            Tiến độ: <strong className="text-foreground font-mono">{answeredCount}/{totalQuestions}</strong> câu
          </span>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {allQuestions.map((q, idx) => {
              const isAnswered = !!answers[q.id]?.value?.trim()
              const isFlag = !!flagged[q.id]
              const isCurrentSec = q.sectionIndex === activeSectionIndex
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveSectionIndex(q.sectionIndex)}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all",
                    isAnswered
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-card text-foreground hover:bg-muted",
                    isCurrentSec ? "ring-2 ring-primary ring-offset-1" : "opacity-80"
                  )}
                >
                  {idx + 1}
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-1 ring-background" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === 0}
            onClick={() => setActiveSectionIndex(Math.max(0, activeSectionIndex - 1))}
            className="h-8 gap-1 text-xs"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span className="hidden sm:inline">Phần trước</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === exam.sections.length - 1}
            onClick={() => setActiveSectionIndex(Math.min(exam.sections.length - 1, activeSectionIndex + 1))}
            className="h-8 gap-1 text-xs"
          >
            <span className="hidden sm:inline">Phần tiếp theo</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Button>
        </div>
      </footer>

      {/* Submit dialog */}
      <SubmitReviewDialog
        open={isSubmitOpen}
        onOpenChange={setIsSubmitOpen}
        exam={exam}
        answers={answers}
        flagged={flagged}
        onConfirm={() => {
          setIsSubmitOpen(false)
          handleSubmit(false)
        }}
        submitting={submitMutation.isPending || phase === "submitting"}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Section renderers
// ═══════════════════════════════════════════════════════════════

interface SectionProps {
  section: CandidateSection
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  uiTheme?: "white" | "cream"
}

function QuestionCard({
  q,
  idx,
  flagged,
  onToggleFlag,
  children,
}: {
  q: CandidateQuestion
  idx: number
  flagged: boolean
  onToggleFlag: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
            {idx + 1}
          </span>
          <span className="font-semibold text-sm text-foreground">{q.prompt}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-7",
            flagged ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground"
          )}
          onClick={onToggleFlag}
          title="Đánh dấu câu hỏi để xem lại"
        >
          <HugeiconsIcon icon={Flag01Icon} size={14} />
        </Button>
      </div>
      {children}
    </div>
  )
}

function QuestionInput({
  q,
  answer,
  onAnswer,
}: {
  q: CandidateQuestion
  answer: string
  onAnswer: (v: string) => void
}) {
  const options: Array<{ id: string; text: string }> | undefined =
    (q.data?.options as any) ?? (q.data?.headings as any)

  // Multiple choice / matching / true-false-not-given
  if (
    (q.type === "multiple_choice" ||
      q.type === "true_false_not_given" ||
      q.type === "yes_no_not_given" ||
      q.type === "matching" ||
      q.type === "matching_headings" ||
      q.type === "map_labelling" ||
      q.type === "diagram_labelling") &&
    options
  ) {
    return (
      <div className="space-y-2 pt-1">
        {options.map((opt) => {
          const isSelected = answer === opt.id
          return (
            <label
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-xs font-medium",
                isSelected
                  ? "border-primary bg-primary/5 text-primary font-semibold"
                  : "border-border hover:bg-muted/30 text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[11px] font-mono font-bold",
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {opt.id}
              </span>
              <span>{opt.text}</span>
            </label>
          )
        })}
      </div>
    )
  }

  // Default: text input
  return (
    <div className="pt-1">
      <Input
        value={answer}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Nhập câu trả lời của bạn..."
        className="h-10 text-sm max-w-md font-medium"
      />
    </div>
  )
}

function ListeningSection({ section, answers, flagged, onAnswer, onToggleFlag, uiTheme }: SectionProps) {
  const audioMedia = section.media?.find((m) => m.type === "audio")
  const audio = useExamAudioPlayer(audioMedia?.url ?? null, { autoplay: true })

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Sticky audio player */}
      <div
        className={cn(
          "sticky top-0 z-20 flex items-center justify-between border-b px-8 py-3",
          uiTheme === "cream" ? "border-[#E8E4DD] bg-[#FAF8F5]/95" : "border-border bg-card/95"
        )}
      >
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-2.5 rounded-full",
                audio.error ? "bg-destructive" : "bg-emerald-500 animate-pulse"
              )}
            />
            <span className="text-xs font-medium text-foreground">
              {audio.error ? "Lỗi audio" : "Audio đang phát (Tự động)"}
            </span>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>{audioMedia?.originalName ?? `${section.title} audio`}</span>
              <span>
                {formatDuration(Math.floor(audio.position))} / {formatDuration(Math.floor(audio.duration))}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: audio.duration > 0 ? `${(audio.position / audio.duration) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pl-4">
          {audio.error && (
            <Button variant="outline" size="sm" onClick={audio.retry} className="h-7 text-xs">
              Thử lại
            </Button>
          )}
          <button
            type="button"
            onClick={audio.toggleMute}
            className="hover:text-foreground transition-colors p-1"
            title={audio.isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          >
            <HugeiconsIcon
              icon={VolumeHighIcon}
              size={16}
              className={audio.isMuted ? "text-destructive" : ""}
            />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={audio.isMuted ? 0 : Math.round(audio.volume * 100)}
            onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
            className="w-20 sm:w-28 h-1.5 accent-primary bg-muted rounded-lg cursor-pointer"
            title="Điều chỉnh âm lượng"
          />
          <span className="font-mono text-xs w-8 text-right">
            {audio.isMuted ? "0%" : `${Math.round(audio.volume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Questions */}
      <div className="mx-auto w-full max-w-3xl p-8 space-y-8">
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
          <h3 className="font-heading font-bold text-base text-foreground">{section.title}</h3>
          <p className="text-xs text-muted-foreground">{section.instructions}</p>
        </div>

        {sectionHasGroups(section) ? (
          <div className="space-y-8">
            {section.questionGroups!.map((group) => (
              <GroupRenderer key={group.id} group={group} answers={answers} flagged={flagged} onAnswer={onAnswer} onToggleFlag={onToggleFlag} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {section.questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                q={q}
                idx={idx}
                flagged={!!flagged[q.id]}
                onToggleFlag={() => onToggleFlag(q.id)}
              >
                <QuestionInput q={q} answer={answers[q.id]?.value ?? ""} onAnswer={(v) => onAnswer(q.id, v)} />
              </QuestionCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HighlightedPassage({ text, highlights }: { text: string; highlights: string[] }) {
  if (!highlights.length || !text) {
    return <span>{text}</span>
  }
  const escaped = highlights
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  if (!escaped.length) return <span>{text}</span>
  const regex = new RegExp(`(${escaped.join("|")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = highlights.some((h) => h.toLowerCase() === part.toLowerCase())
        return isMatch ? (
          <mark key={i} className="rounded bg-amber-200 px-0.5 font-medium text-stone-900 dark:bg-amber-400 dark:text-stone-900">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      })}
    </>
  )
}

function ReadingSection({ section, answers, flagged, onAnswer, onToggleFlag }: SectionProps) {
  const [highlights, setHighlights] = React.useState<string[]>([])
  const [selectedText, setSelectedText] = React.useState<string>("")

  const handleMouseUp = () => {
    if (typeof window === "undefined") return
    const sel = window.getSelection()?.toString().trim()
    if (sel && sel.length > 1) {
      setSelectedText(sel)
    } else {
      setSelectedText("")
    }
  }

  const addHighlight = () => {
    if (selectedText) {
      setHighlights((prev) => (prev.includes(selectedText) ? prev : [...prev, selectedText]))
      setSelectedText("")
    }
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-y-auto bg-card border-r border-border">
        <div className="p-8 max-w-2xl mx-auto space-y-6" onMouseUp={handleMouseUp}>
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <Badge variant="outline" className="text-primary font-semibold text-xs">
              {section.title}
            </Badge>
            <div className="flex items-center gap-2">
              {selectedText && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={addHighlight}
                  className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold"
                >
                  Highlight vùng chọn
                </Button>
              )}
              {highlights.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHighlights([])}
                  className="h-7 text-xs"
                >
                  Xóa highlight ({highlights.length})
                </Button>
              )}
            </div>
          </div>
          <div className="font-serif text-sm leading-[1.8] text-foreground/90 whitespace-pre-line space-y-4 select-text">
            <HighlightedPassage text={section.passageText ?? ""} highlights={highlights} />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30} className="overflow-y-auto bg-muted/10">
        <div className="p-8 max-w-2xl mx-auto space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <h3 className="font-heading font-bold text-sm text-foreground">{section.title}</h3>
            <p className="text-xs text-muted-foreground">{section.instructions}</p>
          </div>

          <div className="space-y-6">
            {sectionHasGroups(section) ? (
              section.questionGroups!.map((group) => (
                <GroupRenderer key={group.id} group={group} answers={answers} flagged={flagged} onAnswer={onAnswer} onToggleFlag={onToggleFlag} />
              ))
            ) : (
              section.questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  idx={idx}
                  flagged={!!flagged[q.id]}
                  onToggleFlag={() => onToggleFlag(q.id)}
                >
                  <QuestionInput q={q} answer={answers[q.id]?.value ?? ""} onAnswer={(v) => onAnswer(q.id, v)} />
                </QuestionCard>
              ))
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function WritingSection({
  section,
  answers,
  writingTask,
  onSwitchTask,
  onAnswer,
}: {
  section: CandidateSection
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  writingTask: "task1" | "task2"
  onSwitchTask: (t: "task1" | "task2") => void
  onAnswer: (questionId: string, value: string) => void
}) {
  const task1Q = sectionHasGroups(section)
    ? (() => { const g = section.questionGroups!.find((g) => g.groupType === "writing_task_1"); return g?.questions[0] ? { id: g.questions[0].id, type: "writing_task_1" as const, prompt: g.questions[0].prompt, content: undefined as string | null | undefined, media: undefined as any[] | undefined } : undefined })()
    : section.questions.find((q) => q.type === "writing_task_1")
  const task2Q = sectionHasGroups(section)
    ? (() => { const g = section.questionGroups!.find((g) => g.groupType === "writing_task_2"); return g?.questions[0] ? { id: g.questions[0].id, type: "writing_task_2" as const, prompt: g.questions[0].prompt, content: undefined as string | null | undefined, media: undefined as any[] | undefined } : undefined })()
    : section.questions.find((q) => q.type === "writing_task_2")
  const currentQ = writingTask === "task1" ? task1Q : task2Q
  const text = currentQ ? (answers[currentQ.id]?.value ?? "") : ""
  const wordCount = countWords(text)
  const minWords = writingTask === "task1" ? 150 : 250

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-full divide-x divide-border">
        {/* Left: prompt */}
        <div className="w-1/2 overflow-y-auto p-8 space-y-6 bg-card">
          <div className="flex gap-2 border-b border-border pb-3">
            {task1Q && (
              <button
                onClick={() => onSwitchTask("task1")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                  writingTask === "task1"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                Writing Task 1 (Report)
              </button>
            )}
            {task2Q && (
              <button
                onClick={() => onSwitchTask("task2")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                  writingTask === "task2"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                Writing Task 2 (Essay)
              </button>
            )}
          </div>

          {currentQ && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-heading font-bold text-sm text-foreground mb-1">
                  {writingTask === "task1" ? "Task 1 Instructions" : "Task 2 Instructions"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-medium">
                  {currentQ.prompt}
                  {currentQ.content ? `\n\n${currentQ.content}` : ""}
                </p>
              </div>
              {currentQ.media?.map((m) =>
                m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.url} alt={m.originalName ?? "Task image"} className="rounded-xl border border-border" />
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div className="w-1/2 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm text-foreground">{wordCount} words</span>
              <Badge variant="outline" className="text-[11px] font-mono">
                Tối thiểu {minWords} từ
              </Badge>
              {wordCount > 0 && wordCount < minWords && (
                <span className="text-[11px] text-amber-600 font-medium">còn thiếu {minWords - wordCount} từ</span>
              )}
            </div>
          </div>
          <div className="flex-1 p-6">
            {currentQ ? (
              <Textarea
                value={text}
                onChange={(e) => onAnswer(currentQ.id, e.target.value)}
                placeholder={`Bắt đầu gõ bài viết ${writingTask === "task1" ? "Task 1" : "Task 2"} của bạn tại đây...`}
                spellCheck={false}
                className="h-full w-full resize-none border-0 focus-visible:ring-0 font-serif text-sm leading-[1.8] select-text"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Không có câu hỏi {writingTask}.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Question Group Renderer & Inline Template Engine
// ═══════════════════════════════════════════════════════════════

function InlineTemplateRenderer({
  template,
  questions,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  optionsPool,
  maxWords,
}: {
  template: string
  questions: CandidateQuestionItem[]
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  optionsPool?: Array<{ id: string; text: string }>
  maxWords?: number
}) {
  const regex = /(\{\{\s*(?:q)?(\d+)\s*\}\}|\[\s*(?:q)?(\d+)\s*\])/gi
  const parts = template.split(regex)
  const matchedQNums = new Set<number>()

  const findQuestion = (numStr: string) => {
    const num = parseInt(numStr, 10)
    const q = questions.find((item) => item.questionNumber === num) || questions[num - 1]
    if (q) matchedQNums.add(q.questionNumber)
    return q
  }

  const renderedTokens = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue

    const match = part.match(/^\{\{\s*(?:q)?(\d+)\s*\}\}$|^\[\s*(?:q)?(\d+)\s*\]$/i)
    if (match) {
      const qNumStr = match[1] || match[2]
      const q = findQuestion(qNumStr)
      if (q) {
        const answer = answers[q.id]?.value ?? ""
        const isFlag = !!flagged[q.id]
        renderedTokens.push(
          <span key={`q-${q.id}-${i}`} className="inline-flex items-center gap-1 mx-1.5 my-1 align-baseline">
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[11px] font-bold text-primary">
              {q.questionNumber}
            </span>
            {optionsPool && optionsPool.length > 0 ? (
              <select
                value={answer}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-mono font-medium focus:border-primary focus:outline-hidden"
              >
                <option value="">[{q.questionNumber}]</option>
                {optionsPool.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.id} {opt.text && opt.text !== opt.id ? `- ${opt.text}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={answer}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                placeholder={maxWords ? `≤ ${maxWords} từ` : `[${q.questionNumber}]`}
                className="h-7 w-28 sm:w-36 rounded-md border border-border bg-background px-2 text-xs font-medium focus:border-primary focus:outline-hidden"
              />
            )}
            <button
              type="button"
              onClick={() => onToggleFlag(q.id)}
              className={cn(
                "p-0.5",
                isFlag ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground"
              )}
              title="Đánh dấu câu"
            >
              <HugeiconsIcon icon={Flag01Icon} size={12} />
            </button>
          </span>
        )
      } else {
        renderedTokens.push(<span key={i} className="font-mono text-muted-foreground">[{qNumStr}]</span>)
      }
    } else {
      renderedTokens.push(
        <span key={i} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      )
    }
  }

  const unplacedQuestions = questions.filter((q) => !matchedQNums.has(q.questionNumber))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-muted/10 p-4 font-serif text-sm leading-[2.2] text-foreground select-text">
        {renderedTokens}
      </div>

      {unplacedQuestions.length > 0 && (
        <div className="space-y-2.5 pt-2">
          {unplacedQuestions.map((q) => {
            const answer = answers[q.id]?.value ?? ""
            const isFlag = !!flagged[q.id]
            return (
              <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                  {q.questionNumber}
                </span>
                <span className="text-xs text-foreground flex-1">{q.prompt}</span>
                <Input
                  value={answer}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  placeholder="Nhập câu trả lời..."
                  className="h-8 w-44 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => onToggleFlag(q.id)}
                  className={cn("p-1", isFlag ? "text-amber-500" : "text-muted-foreground/40 hover:text-muted-foreground")}
                >
                  <HugeiconsIcon icon={Flag01Icon} size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GroupRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  group: CandidateQuestionGroup
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  const config = group.config || {}
  const options = (config.options as Array<{ id: string; text: string }>) ?? []
  const optionsPool = (config.optionsPool as Array<{ id: string; text: string }>) ?? []
  const labelsPool = (config.labels as Array<{ id: string; label: string }>) ?? []
  const isTFNG = group.groupType === "true_false_not_given"
  const isYNNG = group.groupType === "yes_no_not_given"
  const isMatching = group.groupType.startsWith("matching_")
  const isCompletion = [
    "sentence_completion",
    "note_completion",
    "table_completion",
    "summary_completion",
    "form_completion",
    "flow_chart_completion",
    "short_answer",
  ].includes(group.groupType)
  const maxWords = (config.maxWords as number) ?? undefined
  const wordLimitText = maxWords ? `NO MORE THAN ${maxWords} WORD${maxWords > 1 ? "S" : ""}` : undefined

  const matchPool: Array<{ id: string; text: string }> = (() => {
    if (group.groupType === "matching_headings") return (config.headingsPool as any[]) ?? []
    if (group.groupType === "matching_information")
      return ((config.paragraphLabels as string[]) ?? []).map((l: string) => ({ id: l, text: l }))
    if (group.groupType === "matching_features") return (config.featuresPool as any[]) ?? []
    if (group.groupType === "matching_sentence_endings") return (config.endingsPool as any[]) ?? []
    return []
  })()

  // ─── Multiple Choice Multiple ──────────────────────────────────────────────
  if (group.groupType === "multiple_choice_multiple") {
    const maxSelections = (config.maxSelections as number) || group.questions.length || 2
    const isMultiQuestion = group.questions.length > 1

    const selectedOptionIds: string[] = isMultiQuestion
      ? group.questions.map((q) => answers[q.id]?.value?.trim()).filter(Boolean)
      : (answers[group.questions[0]?.id]?.value ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

    const handleToggleOption = (optId: string) => {
      const isSelected = selectedOptionIds.includes(optId)
      if (isSelected) {
        if (isMultiQuestion) {
          const targetQ = group.questions.find((q) => answers[q.id]?.value?.trim() === optId)
          if (targetQ) onAnswer(targetQ.id, "")
        } else if (group.questions[0]) {
          const remaining = selectedOptionIds.filter((id) => id !== optId)
          onAnswer(group.questions[0].id, remaining.join(", "))
        }
      } else {
        if (selectedOptionIds.length >= maxSelections) {
          toast.warning(`Bạn chỉ được chọn tối đa ${maxSelections} đáp án`)
          return
        }
        if (isMultiQuestion) {
          const emptyQ = group.questions.find((q) => !answers[q.id]?.value?.trim())
          if (emptyQ) {
            onAnswer(emptyQ.id, optId)
          }
        } else if (group.questions[0]) {
          const next = [...selectedOptionIds, optId]
          onAnswer(group.questions[0].id, next.join(", "))
        }
      }
    }

    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Questions {group.questions[0]?.questionNumber}–{group.questions[group.questions.length - 1]?.questionNumber}
          </p>
          <p className="text-sm font-medium text-foreground whitespace-pre-line">{group.instructions}</p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Chọn đúng {maxSelections} đáp án</span>
            <span className="font-mono font-semibold text-foreground">
              {selectedOptionIds.length} / {maxSelections} đã chọn
            </span>
          </div>

          {group.questions[0]?.prompt && (
            <p className="text-sm font-semibold text-foreground">{group.questions[0].prompt}</p>
          )}

          <div className="space-y-1.5">
            {options.map((opt) => {
              const isSelected = selectedOptionIds.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleToggleOption(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 font-semibold text-primary shadow-2xs"
                      : "border-border hover:bg-muted text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-card"
                    )}
                  >
                    {opt.id}
                  </div>
                  <span className="flex-1">{opt.text || opt.id}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            {group.questions.map((q) => {
              const qAns = answers[q.id]?.value?.trim()
              const isFlag = !!flagged[q.id]
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1 text-xs"
                >
                  <span className="font-mono font-bold text-primary">Câu {q.questionNumber}:</span>
                  <span className="font-mono font-semibold">{qAns || "(Chưa chọn)"}</span>
                  <button
                    type="button"
                    onClick={() => onToggleFlag(q.id)}
                    className={cn("ml-1", isFlag ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground")}
                    title="Đánh dấu câu này"
                  >
                    <HugeiconsIcon icon={Flag01Icon} size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── Inline Template Renderer for Completion Types ─────────────────────────
  if (config.template && typeof config.template === "string" && config.template.trim().length > 0) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Questions {group.questions[0]?.questionNumber}–{group.questions[group.questions.length - 1]?.questionNumber}
          </p>
          <p className="text-sm font-medium text-foreground whitespace-pre-line">{group.instructions}</p>
          {wordLimitText && <p className="text-xs font-semibold text-primary">{wordLimitText}</p>}
        </div>

        {optionsPool.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <span className="text-xs font-bold text-primary uppercase">Word Bank / Danh sách từ khóa:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {optionsPool.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1 text-xs border border-border">
                  <span className="font-bold text-primary">{item.id}</span>
                  <span className="text-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <InlineTemplateRenderer
          template={config.template}
          questions={group.questions}
          answers={answers}
          flagged={flagged}
          onAnswer={onAnswer}
          onToggleFlag={onToggleFlag}
          optionsPool={optionsPool}
          maxWords={maxWords}
        />
      </div>
    )
  }

  // ─── Standard Group Renderer ───────────────────────────────────────────────
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Questions {group.questions[0]?.questionNumber}–{group.questions[group.questions.length - 1]?.questionNumber}
        </p>
        <p className="text-sm font-medium text-foreground whitespace-pre-line">{group.instructions}</p>
        {wordLimitText && <p className="text-xs font-semibold text-primary">{wordLimitText}</p>}
      </div>

      {isMatching && matchPool.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
          {matchPool.map((item) => (
            <div key={item.id} className="flex gap-2 text-xs">
              <span className="font-bold text-primary w-5">{item.id}</span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {optionsPool.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <span className="text-xs font-bold text-primary uppercase">Word Bank:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {optionsPool.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1 text-xs border border-border">
                <span className="font-bold text-primary">{item.id}</span>
                <span className="text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {labelsPool.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Danh sách nhãn:</span>
          <div className="flex flex-wrap gap-2">
            {labelsPool.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5 rounded bg-card px-2.5 py-1 text-xs border border-border">
                <span className="font-bold text-primary">{l.id}</span>
                <span className="text-foreground">{l.label || l.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {group.questions.map((q) => {
          const answer = answers[q.id]?.value ?? ""
          const isFlagged = !!flagged[q.id]
          return (
            <div key={q.id} className="flex gap-3 items-start">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary mt-0.5">
                {q.questionNumber}
              </span>
              <div className="flex-1 space-y-1.5">
                {q.prompt && <p className="text-sm text-foreground">{q.prompt}</p>}
                {isTFNG || isYNNG ? (
                  <div className="flex gap-2">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAnswer(q.id, opt.id)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          answer === opt.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                ) : group.groupType === "multiple_choice_single" ? (
                  <div className="space-y-1">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAnswer(q.id, opt.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                          answer === opt.id
                            ? "border-primary bg-primary/5 font-medium text-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                          {opt.id}
                        </span>
                        <span>{opt.text || opt.id}</span>
                      </button>
                    ))}
                  </div>
                ) : isMatching ? (
                  <select
                    value={answer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    <option value="">—</option>
                    {matchPool.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.id}
                        {opt.text !== opt.id ? " - " + opt.text : ""}
                      </option>
                    ))}
                  </select>
                ) : optionsPool.length > 0 ? (
                  <select
                    value={answer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono font-medium"
                  >
                    <option value="">— Chọn từ khóa —</option>
                    {optionsPool.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.id}: {opt.text}
                      </option>
                    ))}
                  </select>
                ) : labelsPool.length > 0 ? (
                  <select
                    value={answer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono font-medium"
                  >
                    <option value="">— Chọn nhãn —</option>
                    {labelsPool.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id}: {l.label || l.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={answer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="h-8 text-xs"
                    placeholder={
                      isCompletion && maxWords ? `Tối đa ${maxWords} từ` : "Nhập câu trả lời..."
                    }
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => onToggleFlag(q.id)}
                className={cn(
                  "mt-1 shrink-0",
                  isFlagged ? "text-amber-500" : "text-muted-foreground/40 hover:text-muted-foreground"
                )}
              >
                <HugeiconsIcon icon={Flag01Icon} size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SpeakingSection({
  section,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  section: CandidateSection
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  const groups = section.questionGroups ?? []
  return (
    <div className="flex h-full flex-col overflow-y-auto p-8 max-w-3xl mx-auto space-y-6">
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
        <h3 className="font-heading font-bold text-base text-foreground">{section.title}</h3>
        <p className="text-xs text-muted-foreground">{section.instructions || "IELTS Speaking Interview Session"}</p>
      </div>
      {groups.map((group) => {
        const config = group.config || {}
        return (
          <div key={group.id} className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
            <div className="space-y-1">
              <Badge variant="outline" className="text-primary font-semibold text-xs">
                {QUESTION_GROUP_TYPE_LABEL[group.groupType] ?? group.groupType}
              </Badge>
              <p className="text-sm font-medium text-foreground whitespace-pre-line">{group.instructions}</p>
            </div>
            {config.cueCard && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Candidate Cue Card:
                </span>
                <p className="text-sm font-semibold text-foreground">{config.cueCard as string}</p>
                {Array.isArray(config.bulletPoints) && (
                  <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground pt-1">
                    {(config.bulletPoints as string[]).map((bp, i) => (
                      <li key={i}>{bp}</li>
                    ))}
                  </ul>
                )}
                {config.prepTimeSeconds && (
                  <p className="text-[11px] font-mono text-muted-foreground pt-1">
                    Thời gian chuẩn bị: {config.prepTimeSeconds as number} giây · Trình bày: {config.speakTimeSeconds as number || 120} giây
                  </p>
                )}
              </div>
            )}
            <div className="space-y-3">
              {group.questions.map((q) => (
                <div key={q.id} className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                        {q.questionNumber}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{q.prompt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFlag(q.id)}
                      className={cn("p-1", flagged[q.id] ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground")}
                    >
                      <HugeiconsIcon icon={Flag01Icon} size={13} />
                    </button>
                  </div>
                  <Textarea
                    value={answers[q.id]?.value ?? ""}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    placeholder="Ghi chú câu trả lời hoặc tóm tắt ý chính..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Submit Review Dialog
// ═══════════════════════════════════════════════════════════════

function SubmitReviewDialog({
  open,
  onOpenChange,
  exam,
  answers,
  flagged,
  onConfirm,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exam: NonNullable<ReturnType<typeof useExamSessionStore.getState>["exam"]>
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onConfirm: () => void
  submitting: boolean
}) {
  const sections = exam.sections.map((sec) => {
    const qs = flattenSectionQuestions(sec)
    const total = qs.length
    const answered = qs.filter((q) => answers[q.id]?.value?.trim()).length
    const flaggedCount = qs.filter((q) => flagged[q.id]).length
    const isWriting = sec.skill === "writing"
    return { sec, total, answered, flaggedCount, isWriting, qs }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Xác nhận nộp bài thi</DialogTitle>
          <DialogDescription className="text-xs">
            Vui lòng rà soát lại tiến độ làm bài trước khi gửi kết quả cuối cùng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-xl border border-border p-3 space-y-1.5 bg-muted/20">
            {sections.map(({ sec, total, answered, flaggedCount, isWriting, qs }) => (
              <div key={`${sec.skill}-${sec.part}`} className="flex justify-between font-medium">
                <span className="capitalize">
                  {sec.skill} {sec.part ? `· Part ${sec.part}` : ""} ({total} câu)
                </span>
                {isWriting ? (
                  <span className="font-mono text-muted-foreground">
                    {qs
                      .map((q) => countWords(answers[q.id]?.value ?? ""))
                      .map((w, i) => `Task ${i + 1}: ${w} từ`)
                      .join(" · ")}
                  </span>
                ) : (
                  <span className="font-mono text-emerald-600">
                    {answered} / {total} đã làm
                    {flaggedCount > 0 && <span className="text-amber-600"> · {flaggedCount} đánh dấu</span>}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Sau khi xác nhận nộp bài, hệ thống sẽ tự động chấm điểm Listening & Reading. Bạn sẽ không thể
            tiếp tục chỉnh sửa bài làm.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Quay lại làm tiếp
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={submitting} className="font-bold">
            {submitting ? "Đang nộp…" : "Nộp bài ngay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// Mock exam engine (giữ nguyên bản demo cũ)
// ═══════════════════════════════════════════════════════════════
function MockExamEngine({ attemptId }: { attemptId: string }) {
  const router = useRouter()
  const exam = DEMO_EXAM_MOCK_01
  const [activeSectionIndex, setActiveSectionIndex] = React.useState<number>(0)
  const currentSection = exam.sections[activeSectionIndex] || exam.sections[0]
  const [answers, setAnswers] = React.useState<Record<string, string>>({
    "q-l1": "Sarah Jenkins",
    "q-l2": "42 Bridge",
    "q-r1": "TRUE",
  })
  const [flagged, setFlagged] = React.useState<Record<string, boolean>>({ "q-l3": true })
  const [writingTask, setWritingTask] = React.useState<"task1" | "task2">("task1")
  const [writing1, setWriting1] = React.useState<string>(
    "The chart illustrates the proportion of renewable energy consumption in four European countries between 2010 and 2024..."
  )
  const [writing2, setWriting2] = React.useState<string>("")
  const [secondsLeft, setSecondsLeft] = React.useState<number>(48 * 60 + 32)
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving">("saved")
  const [isSubmitOpen, setIsSubmitOpen] = React.useState<boolean>(false)
  const [fontScale, setFontScale] = React.useState<number>(1)
  const [colorTheme, setColorTheme] = React.useState<"white" | "cream">("white")

  React.useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        toast.warning("Nhắc nhở làm bài", {
          description: "Vui lòng tập trung làm bài ở chế độ toàn màn hình và không chuyển đổi tab.",
        })
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleAnswerChange = (questionId: string, val: string) => {
    setSaveStatus("saving")
    setAnswers((prev) => ({ ...prev, [questionId]: val }))
    setTimeout(() => setSaveStatus("saved"), 600)
  }

  const handleSubmit = () => {
    setIsSubmitOpen(false)
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
    toast.success("Đã nộp bài thi thành công!")
    router.push(`/exam/${attemptId}/submitted`)
  }

  const allQuestions = exam.sections.flatMap((s, sIdx) =>
    s.questions.map((q, qIdx) => ({ ...q, sectionIndex: sIdx, displayNumber: qIdx + 1 }))
  )
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length
  const totalQuestions = allQuestions.length

  return (
    <div
      className={cn(
        "flex h-screen flex-col overflow-hidden transition-colors duration-200",
        colorTheme === "cream" ? "bg-[#FAF8F5] text-[#2D2A26]" : "bg-background text-foreground"
      )}
    >
      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-between border-b px-6 select-none z-30",
          colorTheme === "cream" ? "border-[#E8E4DD] bg-[#FAF8F5]" : "border-border bg-background"
        )}
      >
        <div className="flex items-center gap-6">
          <BrandLogo href="/student" compact />
          <div className="h-4 w-px bg-border hidden sm:block" />
          <span className="font-heading font-semibold text-sm text-foreground truncate max-w-[260px]">
            {exam.title}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          {exam.sections.map((sec, idx) => (
            <button
              key={sec.skill}
              onClick={() => setActiveSectionIndex(idx)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors",
                idx === activeSectionIndex
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {sec.skill}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" ? (
              <span className="animate-pulse">Đang lưu...</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                Đã lưu
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 border border-border px-3 py-1 font-mono text-xs sm:text-sm font-semibold">
            <HugeiconsIcon icon={Timer01Icon} size={15} className="text-primary" />
            <span className={secondsLeft < 300 ? "text-destructive font-bold animate-pulse" : "text-foreground"}>
              {formatTimer(secondsLeft)}
            </span>
          </div>
          <div className="hidden sm:flex items-center rounded-xl border border-border p-0.5 text-xs">
            <button
              onClick={() => setColorTheme("white")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors",
                colorTheme === "white" ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              Trắng
            </button>
            <button
              onClick={() => setColorTheme("cream")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors",
                colorTheme === "cream" ? "bg-[#EFECE6] font-semibold text-[#2D2A26]" : "text-muted-foreground"
              )}
            >
              Ngà
            </button>
          </div>
          <div className="hidden sm:flex items-center rounded-xl border border-border p-0.5 text-xs">
            {[1, 1.15, 1.25].map((scale, i) => (
              <button
                key={scale}
                onClick={() => setFontScale(scale)}
                className={cn(
                  "px-2 py-0.5 rounded-lg font-mono text-[11px]",
                  fontScale === scale ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                )}
              >
                {["A", "A+", "A++"][i]}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setIsSubmitOpen(true)} className="font-medium text-xs h-8 px-3">
            Nộp bài
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden" style={{ fontSize: `${fontScale * 100}%` }}>
        {currentSection.skill === "listening" && (
          <div className="flex h-full flex-col overflow-y-auto">
            <div
              className={cn(
                "sticky top-0 z-20 flex items-center justify-between border-b px-8 py-3",
                colorTheme === "cream" ? "border-[#E8E4DD] bg-[#FAF8F5]/95" : "border-border bg-card/95"
              )}
            >
              <div className="flex items-center gap-4 flex-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="flex size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-foreground">Audio đang phát (Tự động)</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Part 1 Listening Track (Chuẩn thi máy)</span>
                    <span>02:15 / 06:40</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "34%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-3xl p-8 space-y-8">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
                <h3 className="font-heading font-bold text-base text-foreground">{currentSection.title}</h3>
                <p className="text-xs text-muted-foreground">{currentSection.instructions}</p>
              </div>

              <div className="space-y-6">
                {currentSection.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm text-foreground">{q.prompt}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("size-7", flagged[q.id] ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground")}
                        onClick={() => setFlagged((p) => ({ ...p, [q.id]: !p[q.id] }))}
                      >
                        <HugeiconsIcon icon={Flag01Icon} size={14} />
                      </Button>
                    </div>
                    {q.type === "form_completion" && (
                      <div className="pt-1">
                        <Input
                          value={answers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Nhập câu trả lời của bạn..."
                          className="h-10 text-sm max-w-md font-medium"
                        />
                      </div>
                    )}
                    {q.type === "multiple_choice" && q.data?.options && (
                      <div className="space-y-2 pt-1">
                        {(q.data.options as Array<{ id: string; text: string }>).map((opt) => (
                          <label
                            key={opt.id}
                            onClick={() => handleAnswerChange(q.id, opt.id)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-xs font-medium",
                              answers[q.id] === opt.id
                                ? "border-primary bg-primary/5 text-primary font-semibold"
                                : "border-border hover:bg-muted/30 text-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full border text-[11px] font-mono font-bold",
                                answers[q.id] === opt.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
                              )}
                            >
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentSection.skill === "reading" && (
          <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={50} minSize={30} className="overflow-y-auto bg-card border-r border-border">
              <div className="p-8 max-w-2xl mx-auto space-y-6">
                <div className="border-b border-border pb-4">
                  <Badge variant="outline" className="text-primary font-semibold text-xs mb-2">
                    {currentSection.title}
                  </Badge>
                  <h2 className="font-heading text-xl font-extrabold text-foreground leading-tight">
                    The Evolutionary Marvel of Cetacean Acoustic Biology
                  </h2>
                </div>
                <div className="font-serif text-sm leading-[1.8] text-foreground/90 whitespace-pre-line space-y-4 select-text">
                  {currentSection.passageText}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30} className="overflow-y-auto bg-muted/10">
              <div className="p-8 max-w-2xl mx-auto space-y-6">
                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                  <h3 className="font-heading font-bold text-sm text-foreground">Questions 1–3</h3>
                  <p className="text-xs text-muted-foreground">{currentSection.instructions}</p>
                </div>
                <div className="space-y-6">
                  {currentSection.questions.map((q, idx) => (
                    <div key={q.id} className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-sm text-foreground">{q.prompt}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("size-7", flagged[q.id] ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground")}
                          onClick={() => setFlagged((p) => ({ ...p, [q.id]: !p[q.id] }))}
                        >
                          <HugeiconsIcon icon={Flag01Icon} size={14} />
                        </Button>
                      </div>
                      {q.type === "true_false_not_given" && (
                        <div className="flex flex-wrap gap-2 pt-1 font-mono">
                          {["TRUE", "FALSE", "NOT GIVEN"].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, val)}
                              className={cn(
                                "h-9 px-4 rounded-lg text-xs font-bold transition-colors",
                                answers[q.id] === val
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "border border-border bg-card text-foreground hover:bg-muted"
                              )}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.type === "matching_headings" && q.data?.headings && (
                        <div className="space-y-2 pt-1">
                          {(q.data.headings as Array<{ id: string; text: string }>).map((h) => (
                            <label
                              key={h.id}
                              onClick={() => handleAnswerChange(q.id, h.id)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-xs font-medium",
                                answers[q.id] === h.id
                                  ? "border-primary bg-primary/5 text-primary font-semibold"
                                  : "border-border hover:bg-muted/30 text-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-5 items-center justify-center rounded-full border text-[11px] font-mono font-bold",
                                  answers[q.id] === h.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
                                )}
                              >
                                {h.id}
                              </span>
                              <span>{h.text}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {currentSection.skill === "writing" && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex h-full divide-x divide-border">
              <div className="w-1/2 overflow-y-auto p-8 space-y-6 bg-card">
                <div className="flex gap-2 border-b border-border pb-3">
                  <button
                    onClick={() => setWritingTask("task1")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                      writingTask === "task1"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Writing Task 1 (Report)
                  </button>
                  <button
                    onClick={() => setWritingTask("task2")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                      writingTask === "task2"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Writing Task 2 (Essay)
                  </button>
                </div>
                {writingTask === "task1" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <h3 className="font-heading font-bold text-sm text-foreground mb-1">Task 1 Instructions</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-medium">
                        The chart below illustrates the proportion of renewable energy consumption in four European countries from 2010 to 2024.
                        {"\n\n"}Summarise the information by selecting and reporting the main features. Write at least 150 words.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <h3 className="font-heading font-bold text-sm text-foreground mb-1">Task 2 Instructions</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-medium">
                        Some people believe that artificial intelligence will soon replace human teachers in education.
                        {"\n\n"}Discuss both views and give your own opinion. Write at least 250 words.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="w-1/2 flex flex-col bg-background">
                <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-foreground">
                      {writingTask === "task1" ? countWords(writing1) : countWords(writing2)} words
                    </span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {writingTask === "task1" ? "Tối thiểu 150 từ" : "Tối thiểu 250 từ"}
                    </Badge>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">✓ Đã tự động lưu</span>
                </div>
                <div className="flex-1 p-6">
                  <Textarea
                    value={writingTask === "task1" ? writing1 : writing2}
                    onChange={(e) => (writingTask === "task1" ? setWriting1(e.target.value) : setWriting2(e.target.value))}
                    placeholder="Bắt đầu gõ bài viết của bạn tại đây..."
                    className="h-full w-full resize-none border-0 focus-visible:ring-0 font-serif text-sm leading-[1.8] select-text"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border bg-background px-6 select-none z-30">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
            Tiến độ: <strong className="text-foreground font-mono">{answeredCount}/{totalQuestions}</strong> câu
          </span>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {allQuestions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setActiveSectionIndex(q.sectionIndex)}
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all",
                  answers[q.id]?.trim()
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-card text-foreground hover:bg-muted",
                  q.sectionIndex === activeSectionIndex ? "ring-2 ring-primary ring-offset-1" : "opacity-80"
                )}
              >
                {idx + 1}
                {flagged[q.id] && (
                  <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-1 ring-background" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === 0}
            onClick={() => setActiveSectionIndex((p) => Math.max(0, p - 1))}
            className="h-8 gap-1 text-xs"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span className="hidden sm:inline">Phần trước</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === exam.sections.length - 1}
            onClick={() => setActiveSectionIndex((p) => Math.min(exam.sections.length - 1, p + 1))}
            className="h-8 gap-1 text-xs"
          >
            <span className="hidden sm:inline">Phần tiếp theo</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Button>
        </div>
      </footer>

      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Xác nhận nộp bài thi</DialogTitle>
            <DialogDescription className="text-xs">
              Vui lòng rà soát lại tiến độ làm bài trước khi gửi kết quả cuối cùng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-xl border border-border p-3 space-y-1.5 bg-muted/20">
              <div className="flex justify-between font-medium">
                <span>Listening (4 câu)</span>
                <span className="font-mono text-emerald-600">4 / 4 đã làm</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Reading (3 câu)</span>
                <span className="font-mono text-emerald-600">3 / 3 đã làm</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Writing Task 1</span>
                <span className="font-mono">{countWords(writing1)} từ (≥ 150)</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Writing Task 2</span>
                <span className="font-mono text-amber-600">{countWords(writing2)} từ (Dưới 250)</span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sau khi xác nhận nộp bài, hệ thống sẽ tự động chấm điểm Listening & Reading.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSubmitOpen(false)}>
              Quay lại làm tiếp
            </Button>
            <Button size="sm" onClick={handleSubmit} className="font-bold">
              Nộp bài ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
