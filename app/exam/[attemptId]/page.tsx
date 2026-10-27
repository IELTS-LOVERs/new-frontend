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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
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
  PauseIcon,
  VolumeHighIcon,
  VolumeOffIcon,
  Timer01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Flag01Icon,
  Image01Icon,
  RefreshIcon,
  TextFontIcon,
} from "@hugeicons/core-free-icons"
import {
  parseMarkdownTable,
  splitFlowSteps,
} from "@/features/exam-engine/lib/template-layout"
import {
  INLINE_TOKEN_SPLIT,
  buildExamQuestionIndex,
  computeAnsweredCount,
  computeSectionReviews,
  countWords,
  findWritingQuestion,
  formatQuestionRange,
  getGroupViewMeta,
  parseInlineToken,
  resolveInlineBlankQuestion,
} from "@/features/exam-engine/lib/exam-flow"
import {
  HighlightControls,
  HighlightLayer,
  SelectableHighlightedText,
} from "@/features/exam-engine/components/highlight-layer"
import {
  RichText,
  renderRichTextNodes,
} from "@/features/exam-engine/components/rich-text"
import { RichDocView } from "@/features/rich-text/render"
import { SelectableRichDoc } from "@/features/rich-text/selectable"
import { parseRichText } from "@/features/exam-engine/lib/rich-text"
import { questionAnchorId, scrollToQuestion } from "@/features/exam-engine/lib/question-nav"
import { toast } from "sonner"
import { BrandLogo } from "@/components/layout/brand-logo"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { useExamTimer } from "@/features/exam-engine/hooks/use-exam-timer"
import { useAutosave } from "@/features/exam-engine/hooks/use-autosave"
import { useExamRecovery } from "@/features/exam-engine/hooks/use-recovery"
import {
  useExamContentSync,
  type ExamContentUpdateEvent,
} from "@/features/exam-engine/hooks/use-exam-content-sync"
import { useAntiCheat } from "@/features/exam-engine/hooks/use-anti-cheat"
import { useClipboardGuard } from "@/features/exam-engine/hooks/use-clipboard-guard"
import { useExamAudioPlayer, type ExamAudioMode } from "@/features/exam-engine/hooks/use-audio-player"
import { useSubmitAttemptMutation } from "@/hooks/use-attempts"
import { useIsMobile } from "@/hooks/use-mobile"
import { clearAttemptSnapshot } from "@/features/exam-engine/lib/idb"
import { formatDuration } from "@/lib/format"
import type {
  CandidateSection,
  CandidateQuestionGroup,
  CandidateQuestionItem,
  MediaItem,
} from "@/lib/api/types"

export default function ExamEnginePage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

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
  const setActiveSectionIndex = useExamSessionStore(
    (s) => s.setActiveSectionIndex
  )
  const activeSectionIndex = useExamSessionStore((s) => s.activeSectionIndex)
  const setAnswer = useExamSessionStore((s) => s.setAnswer)
  const toggleFlag = useExamSessionStore((s) => s.toggleFlag)
  const setStoreActiveQuestion = useExamSessionStore((s) => s.setActiveQuestion)
  const setPhase = useExamSessionStore((s) => s.setPhase)
  const increaseFontScale = useExamSessionStore((s) => s.increaseFontScale)
  const decreaseFontScale = useExamSessionStore((s) => s.decreaseFontScale)
  const resetFontScale = useExamSessionStore((s) => s.resetFontScale)
  const setUITheme = useExamSessionStore((s) => s.setUITheme)

  const [isSubmitOpen, setIsSubmitOpen] = React.useState(false)
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = React.useState(false)
  const paletteRef = React.useRef<HTMLDivElement | null>(null)
  const [paletteEdges, setPaletteEdges] = React.useState({
    left: false,
    right: false,
  })
  const [writingTask, setWritingTask] = React.useState<"task1" | "task2">(
    "task1"
  )
  const [activeQuestionId, setActiveQuestionId] = React.useState<
    string | null
  >(null)
  const [contentUpdate, setContentUpdate] =
    React.useState<ExamContentUpdateEvent | null>(null)
  const [pendingScrollQuestionId, setPendingScrollQuestionId] = React.useState<
    string | null
  >(null)
  const submitMutation = useSubmitAttemptMutation()
  const handleSubmitRef = React.useRef<(auto?: boolean) => Promise<void>>(
    async () => {}
  )

  const {
    status: recoveryStatus,
    error: recoveryError,
    needsGesture,
    confirmResume,
  } = useExamRecovery(attemptId)

  const { secondsLeft } = useExamTimer(() => {
    // Hết giờ → submit
    void handleSubmitRef.current(true)
  })

  const { flush } = useAutosave(attemptId, {
    // FIX-10: if autosave learns the attempt is already over, run the real
    // submit flow (which redirects to /submitted) instead of hanging.
    onFatal: () => void handleSubmitRef.current(true),
  })
  const isMock = exam?.kind === "mock"
  const selectionBlocked = exam?.disableTextSelection === true
  useAntiCheat(attemptId, isMock && (phase === "active" || phase === "offline"))
  // #10: mock exams already block + log clipboard events in useAntiCheat.
  // Practice exams block clipboard only when the teacher disabled selection.
  useClipboardGuard(selectionBlocked && !isMock)

  // ─── Live content sync (teacher edited the exam while we are taking it) ───
  const handleExamContentUpdate = React.useCallback(
    (event: ExamContentUpdateEvent) => {
      setContentUpdate(event)
      if (event.activeQuestionRemoved) {
        // `applyExamUpdate` already picked the nearest surviving question.
        setActiveQuestionId(useExamSessionStore.getState().activeQuestionId)
        toast.warning(
          "Câu bạn đang làm đã được giáo viên xoá. Bài làm đã chuyển sang câu gần nhất."
        )
      }

      const time = new Date(event.at).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
      const changes = [
        event.addedQuestions > 0 ? `thêm ${event.addedQuestions} câu` : null,
        event.removedQuestions > 0 ? `xoá ${event.removedQuestions} câu` : null,
      ]
        .filter(Boolean)
        .join(", ")
      toast.info(
        `Giáo viên vừa cập nhật đề lúc ${time}. Nội dung mới đã được áp dụng${
          changes ? ` (${changes})` : ""
        }.`
      )
    },
    []
  )

  useExamContentSync(attemptId, {
    enabled: phase === "active" || phase === "offline",
    onUpdate: handleExamContentUpdate,
  })

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async (auto = false) => {
    if (phase === "submitting" || phase === "finished") return
    setPhase("submitting")
    try {
      // Flush tất cả dirty answers trước (tối đa 10s)
      await Promise.race([
        flush(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("flush-timeout")), 10_000)
        ),
      ]).catch(() => {
        // Nếu flush thất bại vì mạng và không phải hết giờ → cho phép thử lại
        if (!auto) {
          setPhase("active")
          toast.error(
            "Chưa thể đồng bộ đáp án. Kiểm tra kết nối rồi bấm Thử lại."
          )
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

  // ─── Question navigation (palette → scroll inside question panel) ─────────
  const jumpToQuestion = React.useCallback(
    (questionId: string, sectionIndex: number) => {
      setActiveQuestionId(questionId)
      setStoreActiveQuestion(questionId)
      if (sectionIndex !== activeSectionIndex) {
        setPendingScrollQuestionId(questionId)
        setActiveSectionIndex(sectionIndex)
      } else {
        window.requestAnimationFrame(() => scrollToQuestion(questionId))
      }
    },
    [activeSectionIndex, setActiveSectionIndex, setStoreActiveQuestion]
  )

  // After a section switch the question panel mounts asynchronously — scroll on
  // the next frame so the anchor element exists.
  React.useEffect(() => {
    if (pendingScrollQuestionId == null) return
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        scrollToQuestion(pendingScrollQuestionId)
        setPendingScrollQuestionId(null)
      })
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
    }
  }, [pendingScrollQuestionId, activeSectionIndex])

  // Keep the edge fades of the bottom question palette in sync with its
  // overflow, so long exams show that more question numbers are available.
  React.useEffect(() => {
    const el = paletteRef.current
    if (!el) return
    const update = () => {
      setPaletteEdges({
        left: el.scrollLeft > 1,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    observer?.observe(el)
    window.addEventListener("resize", update)
    return () => {
      el.removeEventListener("scroll", update)
      observer?.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [exam, activeSectionIndex])

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
        <HugeiconsIcon
          icon={Alert02Icon}
          size={40}
          className="text-destructive"
        />
        <h1 className="font-heading text-lg font-semibold">
          Không thể mở bài thi
        </h1>
        <p className="text-sm text-muted-foreground">{recoveryError}</p>
        <Button asChild variant="outline">
          <Link href={exam?.kind === "practice" ? "/student/practice" : "/student/exams"}>
            {exam?.kind === "practice" ? "Về danh mục luyện tập" : "Về danh sách đề thi"}
          </Link>
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
        <p className="text-sm text-muted-foreground">
          Không có dữ liệu đề thi.
        </p>
      </div>
    )
  }

  const currentSection = exam.sections[activeSectionIndex] ?? exam.sections[0]
  const allQuestions = buildExamQuestionIndex(exam)
  const answeredCount = computeAnsweredCount(answers)
  const totalQuestions = allQuestions.length

  return (
    <div
      className={cn(
        "flex h-dvh flex-col overflow-hidden transition-colors duration-200",
        ui.theme === "cream"
          ? "bg-[#FAF8F5] text-[#2D2A26]"
          : "bg-background text-foreground"
      )}
    >
      {/* TOP BAR */}
      <header
        className={cn(
          "z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 select-none sm:gap-4 sm:px-6",
          ui.theme === "cream"
            ? "border-[#E8E4DD] bg-[#FAF8F5]"
            : "border-border bg-background"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-6">
          <BrandLogo href="/student" compact />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span
            className="min-w-0 truncate font-heading text-xs font-semibold text-foreground sm:max-w-[260px] sm:text-sm"
            title={exam.title}
          >
            {exam.title}
          </span>
        </div>

        <div className="hidden items-center gap-1 rounded-xl bg-muted/50 p-1 lg:flex">
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Autosave status */}
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
            {saveStatus === "saving" ? (
              <span className="animate-pulse">Đang lưu...</span>
            ) : saveStatus === "saved" ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                Đã lưu
              </span>
            ) : saveStatus === "offline" ? (
              <span className="flex items-center gap-1 font-medium text-amber-600">
                <HugeiconsIcon icon={Alert02Icon} size={14} />
                Chưa đồng bộ
              </span>
            ) : saveStatus === "error" ? (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <HugeiconsIcon icon={Alert02Icon} size={14} />
                Lỗi lưu
              </span>
            ) : (
              <span>—</span>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-2 py-1 font-mono text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm">
            <HugeiconsIcon
              icon={Timer01Icon}
              size={15}
              className="text-primary"
            />
            <span
              className={cn(
                secondsLeft <= 60
                  ? "animate-pulse font-bold text-destructive"
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
          <div className="hidden items-center rounded-xl border border-border p-0.5 text-xs sm:flex">
            <button
              onClick={() => setUITheme("white")}
              className={cn(
                "rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors",
                ui.theme === "white"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Trắng
            </button>
            <button
              onClick={() => setUITheme("cream")}
              className={cn(
                "rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors",
                ui.theme === "cream"
                  ? "bg-[#EFECE6] font-semibold text-[#2D2A26]"
                  : "text-muted-foreground"
              )}
            >
              Ngà
            </button>
          </div>

          {/* Điều chỉnh cỡ chữ to/nhỏ */}
          <div className="hidden items-center rounded-xl border border-border bg-muted/20 p-0.5 text-xs sm:flex">
            <button
              type="button"
              onClick={decreaseFontScale}
              disabled={ui.fontScale <= 0.85}
              className="flex size-6 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              title="Giảm cỡ chữ"
              aria-label="Giảm cỡ chữ"
            >
              -
            </button>
            <button
              type="button"
              onClick={resetFontScale}
              className="px-1.5 font-mono text-[11px] font-semibold text-foreground hover:underline"
              title="Đặt lại cỡ chữ mặc định (100%)"
            >
              {Math.round(ui.fontScale * 100)}%
            </button>
            <button
              type="button"
              onClick={increaseFontScale}
              disabled={ui.fontScale >= 1.4}
              className="flex size-6 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              title="Tăng cỡ chữ"
              aria-label="Tăng cỡ chữ"
            >
              +
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setIsDisplaySettingsOpen(true)}
            className="size-10 sm:hidden"
            title="Cỡ chữ và giao diện"
            aria-label="Cỡ chữ và giao diện"
          >
            <HugeiconsIcon icon={TextFontIcon} size={16} />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsSubmitOpen(true)}
            className="h-10 px-2.5 text-xs font-medium sm:h-8 sm:px-3"
            aria-label="Nộp bài"
          >
            <span className="sm:hidden">Nộp</span>
            <span className="hidden sm:inline">Nộp bài</span>
          </Button>
        </div>
      </header>

      {contentUpdate && (
        <div className="flex items-start gap-2 border-b border-primary/20 bg-primary/5 px-3 py-2 sm:px-6">
          <HugeiconsIcon
            icon={RefreshIcon}
            size={16}
            className="mt-0.5 shrink-0 text-primary"
          />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium text-foreground">
              Giáo viên vừa cập nhật đề lúc{" "}
              {new Date(contentUpdate.at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Nội dung mới đã được áp dụng.
            </p>
            {(contentUpdate.addedQuestions > 0 ||
              contentUpdate.removedQuestions > 0) && (
              <p className="text-muted-foreground">
                {contentUpdate.addedQuestions > 0 &&
                  `Thêm ${contentUpdate.addedQuestions} câu. `}
                {contentUpdate.removedQuestions > 0 &&
                  `Xoá ${contentUpdate.removedQuestions} câu. `}
                Đồng hồ và các câu trả lời còn lại không thay đổi.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setContentUpdate(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Đóng
          </button>
        </div>
      )}

      <Sheet open={isDisplaySettingsOpen} onOpenChange={setIsDisplaySettingsOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-base">Hiển thị bài thi</SheetTitle>
            <SheetDescription className="text-xs">
              Điều chỉnh cỡ chữ và màu nền cho dễ đọc hơn.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Cỡ chữ</Label>
                <button
                  type="button"
                  onClick={resetFontScale}
                  className="h-11 px-2 text-xs font-medium text-primary hover:underline"
                >
                  Đặt lại
                </button>
              </div>
              <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={decreaseFontScale}
                  disabled={ui.fontScale <= 0.85}
                  className="h-11 w-11 p-0 text-base font-bold"
                  aria-label="Giảm cỡ chữ"
                >
                  −
                </Button>
                <div className="flex h-11 items-center justify-center rounded-lg border border-border bg-muted/20 font-mono text-sm font-semibold tabular-nums">
                  {Math.round(ui.fontScale * 100)}%
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={increaseFontScale}
                  disabled={ui.fontScale >= 1.4}
                  className="h-11 w-11 p-0 text-base font-bold"
                  aria-label="Tăng cỡ chữ"
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Màu nền</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={ui.theme === "white"}
                  onClick={() => setUITheme("white")}
                  className={cn(
                    "h-11",
                    ui.theme === "white" &&
                      "border-primary bg-primary/10 font-semibold text-primary"
                  )}
                >
                  Trắng
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={ui.theme === "cream"}
                  onClick={() => setUITheme("cream")}
                  className={cn(
                    "h-11",
                    ui.theme === "cream" &&
                      "border-primary bg-primary/10 font-semibold text-primary"
                  )}
                >
                  Ngà
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* BODY */}
      {/* Tailwind dùng đơn vị rem cho text-*, nên font-size % trên <main>
          không làm chữ to lên. `zoom` scale toàn bộ nội dung bài thi. */}
      <main
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          selectionBlocked && "exam-no-select"
        )}
        style={{ zoom: ui.fontScale }}
      >
        {currentSection.skill === "listening" && (
          <ListeningSection
            section={currentSection}
            sectionIndex={activeSectionIndex}
            answers={answers}
            flagged={flagged}
            onAnswer={(qid, v) => setAnswer(qid, v)}
            onToggleFlag={toggleFlag}
            uiTheme={ui.theme}
            audioMode={exam?.kind === "practice" ? "practice" : "exam"}
            audioScope={attemptId}
          />
        )}
        {currentSection.skill === "reading" && (
          <ReadingSection
            section={currentSection}
            sectionIndex={activeSectionIndex}
            answers={answers}
            flagged={flagged}
            onAnswer={(qid, v) => setAnswer(qid, v)}
            onToggleFlag={toggleFlag}
            selectionDisabled={selectionBlocked}
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
      </main>

      {/* BOTTOM PALETTE */}
      <footer className="z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-3 pb-[env(safe-area-inset-bottom)] select-none sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:inline">
            Tiến độ:{" "}
            <strong className="font-mono text-foreground">
              {answeredCount}/{totalQuestions}
            </strong>{" "}
            câu
          </span>
          <div className="hidden h-4 w-px shrink-0 bg-border sm:block" />
          <div className="relative min-w-0 flex-1">
            <div
              ref={paletteRef}
              className="scrollbar-clean flex min-w-0 items-center gap-1.5 overflow-x-auto py-1"
            >
              {allQuestions.map((q, idx) => {
                const isAnswered = !!answers[q.id]?.value?.trim()
                const isFlag = !!flagged[q.id]
                const isCurrentSec = q.sectionIndex === activeSectionIndex
                const qNum = q.questionNumber ?? idx + 1
                const isActiveQuestion = activeQuestionId === q.id
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(q.id, q.sectionIndex)}
                    aria-current={isActiveQuestion ? "true" : undefined}
                    title={`Câu ${qNum}`}
                    className={cn(
                      "relative flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all",
                      isAnswered
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border bg-card text-foreground hover:bg-muted",
                      isActiveQuestion
                        ? "ring-2 ring-amber-500 ring-offset-2"
                        : isCurrentSec
                          ? "ring-2 ring-primary ring-offset-1"
                          : "opacity-80"
                    )}
                  >
                    {qNum}
                    {isFlag && (
                      <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-1 ring-background" />
                    )}
                  </button>
                )
              })}
            </div>
            {paletteEdges.left && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent"
              />
            )}
            {paletteEdges.right && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent"
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === 0}
            onClick={() =>
              setActiveSectionIndex(Math.max(0, activeSectionIndex - 1))
            }
            className="h-10 gap-1 text-xs sm:h-8"
            aria-label="Phần trước"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span className="hidden sm:inline">Phần trước</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === exam.sections.length - 1}
            onClick={() =>
              setActiveSectionIndex(
                Math.min(exam.sections.length - 1, activeSectionIndex + 1)
              )
            }
            className="h-10 gap-1 text-xs sm:h-8"
            aria-label="Phần tiếp theo"
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
  sectionIndex?: number
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  uiTheme?: "white" | "cream"
  selectionDisabled?: boolean
  /** `practice` cho phép phát/dừng/tua; `exam` chỉ nghe 1 lần như thi thật. */
  audioMode?: ExamAudioMode
  /** Phạm vi nhớ vị trí audio (attemptId) — tránh lẫn giữa các lượt thi. */
  audioScope?: string
}

/**
 * Render illustration images (presigned URLs from the API) for a section or a
 * question group. Renders nothing when there are no image items.
 */
function MediaImages({
  media,
  className,
}: {
  media?: MediaItem[]
  className?: string
}) {
  const images = (media ?? []).filter((m) => m.type === "image")
  if (images.length === 0) return null
  return (
    <div className={cn("space-y-3", className)}>
      {images.map((m) => (
        <ExamImage
          key={m.id}
          src={m.url}
          alt={m.originalName || "Hình ảnh minh hoạ"}
          className="w-full rounded-xl border border-border"
        />
      ))}
    </div>
  )
}

/**
 * #12: exam images can fail on mobile (expired presign, flaky network). Retry
 * once, then show a readable placeholder instead of a broken-image icon.
 * HTTPS pages also surface mixed-content HTTP URLs clearly.
 *
 * Presigned MinIO/S3 URLs sign their whole query string, so appending a
 * cache-buster would make the retry 403. For those we remount the <img> with
 * the same URL instead; only unsigned (public) URLs get `_retry=`.
 */
function ExamImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [reloadKey, setReloadKey] = React.useState(0)
  const [failed, setFailed] = React.useState(false)
  const [mixedContent, setMixedContent] = React.useState(false)
  const [prevSrc, setPrevSrc] = React.useState(src)

  // Reset retry state when the API hands us a new presigned URL.
  if (prevSrc !== src) {
    setPrevSrc(src)
    setReloadKey(0)
    setFailed(false)
    setMixedContent(false)
  }

  const retry = () => {
    setFailed(false)
    setMixedContent(false)
    setReloadKey((value) => value + 1)
  }

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center",
          className
        )}
      >
        <HugeiconsIcon
          icon={Image01Icon}
          size={24}
          className="text-muted-foreground"
        />
        <p className="text-xs font-semibold text-foreground">
          Không tải được hình ảnh
        </p>
        <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
          {mixedContent
            ? "Hình ảnh đang dùng liên kết HTTP nên bị trình duyệt chặn khi trang chạy HTTPS. Vui lòng báo giáo viên."
            : "Kết nối có thể bị gián đoạn. Hãy thử tải lại hình ảnh."}
        </p>
        {!mixedContent && (
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            <HugeiconsIcon icon={RefreshIcon} size={13} className="mr-1" />
            Thử lại
          </Button>
        )}
      </div>
    )
  }

  const isPresigned = /[?&](X-Amz-Signature|Signature)=/i.test(src)
  const url =
    reloadKey > 0 && !isPresigned
      ? `${src}${src.includes("?") ? "&" : "?"}_retry=${reloadKey}`
      : src

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={reloadKey}
      src={url}
      alt={alt}
      loading="eager"
      decoding="async"
      className={className}
      onError={() => {
        if (reloadKey < 1) {
          setReloadKey(reloadKey + 1)
          return
        }
        setMixedContent(
          typeof window !== "undefined" &&
            window.location.protocol === "https:" &&
            /^http:\/\//i.test(src)
        )
        setFailed(true)
      }}
    />
  )
}

function ListeningSection({
  section,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  uiTheme,
  audioMode = "exam",
  audioScope,
}: SectionProps) {
  const audioMedia = section.media?.find((m) => m.type === "audio")
  const isPractice = audioMode === "practice"
  const audio = useExamAudioPlayer(audioMedia?.url ?? null, {
    mode: audioMode,
    // Thi máy: audio tự chạy. Luyện tập: học sinh tự bấm phát.
    autoplay: !isPractice,
    // Cùng một file audio chỉ phát 1 lần trong một lượt thi.
    scope: audioScope,
  })

  const progressPercent =
    audio.duration > 0 ? (audio.position / audio.duration) * 100 : 0

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Sticky audio player */}
      {audioMedia?.url && (
        <div
          className={cn(
            "sticky top-0 z-20 flex flex-col gap-2 border-b px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-8 sm:py-3",
            uiTheme === "cream"
              ? "border-[#E8E4DD] bg-[#FAF8F5]/95"
              : "border-border bg-card/95"
          )}
        >
          {/* Điều khiển (chỉ có ở chế độ luyện tập) + tiến trình */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {isPractice && (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={audio.togglePlay}
                  disabled={audio.error !== null}
                  aria-label={audio.isPlaying ? "Tạm dừng" : "Phát"}
                  title={audio.isPlaying ? "Tạm dừng" : "Phát"}
                  className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={audio.isPlaying ? PauseIcon : PlayIcon}
                    size={18}
                  />
                </button>
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      audio.error
                        ? "bg-destructive"
                        : audio.isPlaying
                          ? "animate-pulse bg-emerald-500"
                          : "bg-muted-foreground/40"
                    )}
                  />
                  {/* Không còn nhãn "Audio đang phát (Tự động)": chỉ hiện tên file. */}
                  <span className="truncate text-xs font-medium text-foreground">
                    {audioMedia.originalName || `${section.title} audio`}
                  </span>
                </span>
                <span className="shrink-0">
                  {formatDuration(Math.floor(audio.position))} /{" "}
                  {formatDuration(Math.floor(audio.duration))}
                </span>
              </div>

              {isPractice ? (
                <input
                  type="range"
                  min={0}
                  max={audio.duration > 0 ? audio.duration : 0}
                  step={0.1}
                  value={Math.min(audio.position, audio.duration || 0)}
                  onChange={(e) => audio.seek(Number(e.target.value))}
                  disabled={audio.duration <= 0 || audio.error !== null}
                  aria-label="Tua audio"
                  className="h-6 w-full cursor-pointer touch-none accent-primary disabled:cursor-not-allowed"
                />
              ) : (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Âm lượng */}
          <div className="flex shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground sm:gap-3 sm:pl-4">
            {audio.error && (
              <Button
                variant="outline"
                size="sm"
                onClick={audio.retry}
                className="h-7 text-xs"
              >
                Thử lại
              </Button>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={audio.toggleMute}
                aria-label={audio.isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                title={audio.isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={
                    audio.isMuted || !audio.volumeControlSupported
                      ? VolumeOffIcon
                      : VolumeHighIcon
                  }
                  size={16}
                  className={audio.isMuted ? "text-destructive" : ""}
                />
              </button>

              {audio.volumeControlSupported ? (
                <>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={audio.isMuted ? 0 : Math.round(audio.volume * 100)}
                    onChange={(e) =>
                      audio.setVolume(Number(e.target.value) / 100)
                    }
                    aria-label="Điều chỉnh âm lượng"
                    title="Điều chỉnh âm lượng"
                    className="h-6 w-24 cursor-pointer touch-none accent-primary sm:w-28"
                  />
                  <span className="w-9 shrink-0 text-right font-mono text-xs">
                    {audio.isMuted ? "0%" : `${Math.round(audio.volume * 100)}%`}
                  </span>
                </>
              ) : (
                // iOS không cho đổi âm lượng bằng JS → hướng dẫn thay vì thanh kéo chết.
                <span className="text-[11px] leading-tight text-muted-foreground">
                  Dùng phím âm lượng
                  <br className="sm:hidden" /> của thiết bị
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6 md:p-8">
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
            {section.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <RichText text={section.instructions} />
          </p>
        </div>

        <MediaImages media={section.media} />

        <div className="space-y-8">
          {(section.questionGroups ?? []).map((group) => (
            <GroupRenderer
              key={group.id}
              group={group}
              answers={answers}
              flagged={flagged}
              onAnswer={onAnswer}
              onToggleFlag={onToggleFlag}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ReadingSection({
  section,
  sectionIndex = 0,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  selectionDisabled = false,
}: SectionProps) {
  const highlights = useExamSessionStore((s) => s.highlights)
  const setHighlights = useExamSessionStore((s) => s.setHighlights)
  const isMobile = useIsMobile()

  const passageContent = (
    <div className="w-full space-y-4 p-4 sm:space-y-6 sm:p-6 md:px-8 md:py-6 lg:px-10 lg:py-8">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur-xs sm:-mx-6 sm:-mt-6 sm:mb-6 sm:px-6 sm:py-3 md:-mx-8 md:-mt-6 md:mb-6 md:px-8 md:py-3.5 lg:-mx-10 lg:px-10">
        <Badge
          variant="outline"
          className="text-xs sm:text-sm font-semibold text-primary truncate max-w-[160px] sm:max-w-none"
        >
          {section.title}
        </Badge>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">
            {selectionDisabled
              ? "Vẫn có thể bôi đen để highlight / ghi chú · Không thể sao chép"
              : "Bôi đen để highlight / ghi chú"}
          </span>
          <HighlightControls />
        </div>
      </div>
      <MediaImages media={section.media} className="mb-4" />

      <div className="space-y-6 font-serif text-[15px] sm:text-base md:text-[17px] lg:text-[18px] leading-[1.85] whitespace-pre-line text-foreground/95 select-text tracking-normal">
        {section.passageDoc ? (
          <SelectableRichDoc targetId="passage" doc={section.passageDoc} />
        ) : (
          <SelectableHighlightedText
            targetId="passage"
            text={section.passageText ?? ""}
          />
        )}
      </div>
    </div>
  )

  const questionsContent = (
    <div className="w-full space-y-4 p-4 sm:space-y-6 sm:p-6 md:px-8 md:py-6 lg:px-10 lg:py-8">
      <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
          {section.title}
        </h3>
        {section.instructionsDoc ? (
          <RichDocView
            doc={section.instructionsDoc}
            className="text-xs sm:text-sm text-muted-foreground"
          />
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <RichText text={section.instructions} />
          </p>
        )}
      </div>

      <div className="space-y-6 sm:space-y-8">
        {(section.questionGroups ?? []).map((group) => (
          <GroupRenderer
            key={group.id}
            group={group}
            answers={answers}
            flagged={flagged}
            onAnswer={onAnswer}
            onToggleFlag={onToggleFlag}
          />
        ))}
      </div>
    </div>
  )

  return (
    <HighlightLayer
      sectionIndex={sectionIndex}
      items={highlights}
      onItemsChange={setHighlights}
      disabled={false}
      className="h-full"
    >
      <ResizablePanelGroup
        key={isMobile ? "vertical" : "horizontal"}
        orientation={isMobile ? "vertical" : "horizontal"}
        className="h-full w-full"
      >
        <ResizablePanel
          defaultSize={50}
          minSize={25}
          className="overflow-y-auto border-b md:border-b-0 md:border-r border-border bg-card"
        >
          {passageContent}
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="touch-none bg-border/80 hover:bg-primary/50 transition-colors aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:after:h-6 aria-[orientation=vertical]:w-2 aria-[orientation=vertical]:after:w-6"
        />

        <ResizablePanel
          defaultSize={50}
          minSize={25}
          className="overflow-y-auto bg-muted/10"
        >
          {questionsContent}
        </ResizablePanel>
      </ResizablePanelGroup>
    </HighlightLayer>
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
  const task1Q = findWritingQuestion(section, "writing_task_1")
  const task2Q = findWritingQuestion(section, "writing_task_2")
  // Đề luyện tập Writing có thể chỉ có Task 1 hoặc chỉ Task 2; mặc định
  // "task1" không được để trống editor khi section thiếu task đó.
  const effectiveTask: "task1" | "task2" =
    writingTask === "task1" && !task1Q && task2Q ? "task2" : writingTask
  const currentQ = effectiveTask === "task1" ? task1Q : task2Q
  const text = currentQ ? (answers[currentQ.id]?.value ?? "") : ""
  const wordCount = countWords(text)
  const minWords = effectiveTask === "task1" ? 150 : 250

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-full flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Left / Top: prompt */}
        <div className="h-1/2 md:h-full w-full md:w-1/2 space-y-4 md:space-y-6 overflow-y-auto bg-card p-4 sm:p-6 md:p-8">
          <div className="flex gap-2 border-b border-border pb-3">
            {task1Q && (
              <button
                onClick={() => onSwitchTask("task1")}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-colors",
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
                  "rounded-lg px-4 py-2 text-xs font-bold transition-colors",
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
                <h3 className="mb-1 font-heading text-sm font-bold text-foreground">
                  {effectiveTask === "task1"
                    ? "Task 1 Instructions"
                    : "Task 2 Instructions"}
                </h3>
                {currentQ.promptDoc ? (
                  <RichDocView
                    doc={currentQ.promptDoc}
                    className="text-xs leading-relaxed font-medium text-muted-foreground"
                  />
                ) : (
                  <p className="text-xs leading-relaxed font-medium whitespace-pre-line text-muted-foreground">
                    <RichText text={currentQ.prompt} />
                  </p>
                )}
                {currentQ.content ? (
                  <p className="text-xs leading-relaxed font-medium whitespace-pre-line text-muted-foreground">
                    <RichText text={currentQ.content} />
                  </p>
                ) : null}
              </div>
              {currentQ.media?.map((m) =>
                m.type === "image" ? (
                  <ExamImage
                    key={m.id}
                    src={m.url}
                    alt={m.originalName ?? "Task image"}
                    className="rounded-xl border border-border"
                  />
                ) : null
              )}
            </div>
          )}

          <MediaImages media={section.media} />
        </div>

        {/* Right / Bottom: editor */}
        <div className="flex h-1/2 md:h-full w-full md:w-1/2 flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-foreground">
                {wordCount} words
              </span>
              <Badge variant="outline" className="font-mono text-[11px]">
                Tối thiểu {minWords} từ
              </Badge>
              {wordCount > 0 && wordCount < minWords && (
                <span className="text-[11px] font-medium text-amber-600">
                  còn thiếu {minWords - wordCount} từ
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-6">
            {currentQ ? (
              <Textarea
                value={text}
                onChange={(e) => onAnswer(currentQ.id, e.target.value)}
                placeholder={`Bắt đầu gõ bài viết ${effectiveTask === "task1" ? "Task 1" : "Task 2"} của bạn tại đây...`}
                spellCheck={false}
                className="h-full w-full resize-none border-0 font-serif text-sm leading-[1.8] select-text focus-visible:ring-0"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Không có câu hỏi {writingTask}.
              </p>
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

type BlankAnswers = Record<
  string,
  { value: string; updatedAt: number; dirty: boolean }
>

interface BlankRenderContext {
  questions: CandidateQuestionItem[]
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  optionsPool?: Array<{ id: string; text: string }>
  maxWords?: number
  /** #14: false → once a summary answer is selected it cannot be changed. */
  allowChangeAnswer?: boolean
  matched: Set<number>
}

/**
 * Inline `[X]` / `{{qX}}` blanks are split by `INLINE_TOKEN_SPLIT` (imported
 * from the exam-flow lib) and each token's question number is read by
 * `parseInlineToken`.
 */

function InlineBlank({
  q,
  ctx,
  compact,
}: {
  q: CandidateQuestionItem
  ctx: BlankRenderContext
  compact?: boolean
}) {
  const answer = ctx.answers[q.id]?.value ?? ""
  const isFlag = !!ctx.flagged[q.id]
  const answerLocked = ctx.allowChangeAnswer === false && answer !== ""
  return (
    <span
      id={questionAnchorId(q.id)}
      data-question-id={q.id}
      className={cn(
        "inline-flex items-center gap-1.5 align-baseline",
        compact ? "mx-0.5" : "mx-1.5 my-1"
      )}
    >
      {!compact && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
          {q.questionNumber}
        </span>
      )}
      {ctx.optionsPool && ctx.optionsPool.length > 0 ? (
        <select
          value={answer}
          onChange={(e) => ctx.onAnswer(q.id, e.target.value)}
          disabled={answerLocked}
          title={
            answerLocked ? "Đã chọn đáp án, không thể đổi" : undefined
          }
          className={cn(
            "h-11 rounded-md border border-border bg-background font-mono text-base font-medium focus:border-primary focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 md:h-8",
            compact ? "px-2" : "px-2.5"
          )}
        >
          <option value="">[{q.questionNumber}]</option>
          {ctx.optionsPool.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.id} {opt.text && opt.text !== opt.id ? `- ${opt.text}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => ctx.onAnswer(q.id, e.target.value)}
          placeholder={
            ctx.maxWords ? `≤ ${ctx.maxWords} từ` : `[${q.questionNumber}]`
          }
          className={cn(
            "h-11 rounded-md border border-border bg-background text-sm font-medium focus:border-primary focus:outline-hidden md:h-8",
            compact ? "w-28 px-2" : "w-32 px-2.5 sm:w-44"
          )}
        />
      )}
      {answerLocked && ctx.optionsPool && ctx.optionsPool.length > 0 && !compact && (
        <span className="whitespace-nowrap text-[10px] font-medium text-muted-foreground">
          Đã chọn đáp án, không thể đổi
        </span>
      )}
      <button
        type="button"
        onClick={() => ctx.onToggleFlag(q.id)}
        className={cn(
          "p-0.5",
          isFlag
            ? "text-amber-500"
            : "text-muted-foreground/30 hover:text-muted-foreground"
        )}
        title="Đánh dấu câu"
      >
        <HugeiconsIcon icon={Flag01Icon} size={13} />
      </button>
    </span>
  )
}

function renderPlainTextBlanks(
  text: string,
  ctx: BlankRenderContext,
  keyPrefix: string,
  compact = false
): React.ReactNode[] {
  const parts = text.split(INLINE_TOKEN_SPLIT)
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    const num = parseInlineToken(part)
    if (num !== null) {
      const q = resolveInlineBlankQuestion(ctx.questions, num)
      if (q) {
        ctx.matched.add(q.questionNumber)
        nodes.push(
          <InlineBlank
            key={`${keyPrefix}-q-${q.id}-${i}`}
            q={q}
            ctx={ctx}
            compact={compact}
          />
        )
      } else {
        nodes.push(
          <span
            key={`${keyPrefix}-miss-${i}`}
            className="font-mono text-muted-foreground"
          >
            [{num}]
          </span>
        )
      }
    } else {
      nodes.push(
        <span
          key={`${keyPrefix}-txt-${i}`}
          className="leading-relaxed whitespace-pre-wrap"
        >
          {part}
        </span>
      )
    }
  }
  return nodes
}

function renderInlineBlanks(
  text: string,
  ctx: BlankRenderContext,
  keyPrefix: string,
  compact = false
): React.ReactNode[] {
  return renderRichTextNodes(
    parseRichText(text),
    keyPrefix,
    (value, key) => renderPlainTextBlanks(value, ctx, key, compact)
  )
}

function UnplacedQuestionsList({
  questions,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  questions: CandidateQuestionItem[]
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="space-y-2.5 pt-2">
      {questions.map((q) => {
        const answer = answers[q.id]?.value ?? ""
        const isFlag = !!flagged[q.id]
        return (
          <div
            key={q.id}
            id={questionAnchorId(q.id)}
            data-question-id={q.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
              {q.questionNumber}
            </span>
            <span className="flex-1 text-xs text-foreground"><RichText text={q.prompt} /></span>
            <Input
              value={answer}
              onChange={(e) => onAnswer(q.id, e.target.value)}
              placeholder="Nhập câu trả lời..."
              className="h-11 w-44 text-xs font-medium md:h-8"
            />
            <button
              type="button"
              onClick={() => onToggleFlag(q.id)}
              className={cn(
                "p-1",
                isFlag
                  ? "text-amber-500"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              <HugeiconsIcon icon={Flag01Icon} size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function InlineTemplateRenderer({
  template,
  questions,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  optionsPool,
  maxWords,
  allowChangeAnswer,
}: {
  template: string
  questions: CandidateQuestionItem[]
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  optionsPool?: Array<{ id: string; text: string }>
  maxWords?: number
  allowChangeAnswer?: boolean
}) {
  const matched = new Set<number>()
  const ctx: BlankRenderContext = {
    questions,
    answers,
    flagged,
    onAnswer,
    onToggleFlag,
    optionsPool,
    maxWords,
    allowChangeAnswer,
    matched,
  }
  const renderedTokens = renderInlineBlanks(template, ctx, "inline")
  const unplacedQuestions = questions.filter(
    (q) => !matched.has(q.questionNumber)
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/80 bg-muted/10 p-5 sm:p-6 font-serif text-[15px] sm:text-base md:text-[17px] leading-[2.4] text-foreground select-text">
        {renderedTokens}
      </div>

      <UnplacedQuestionsList
        questions={unplacedQuestions}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    </div>
  )
}

// ─── Table Completion — real HTML table ──────────────────────────────────────
function TableCompletionRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  maxWords,
}: {
  group: CandidateQuestionGroup
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  maxWords?: number
}) {
  const template = (group.config?.template as string) ?? ""
  const parsed = React.useMemo(() => parseMarkdownTable(template), [template])
  if (!parsed) return null

  const matched = new Set<number>()
  const ctx: BlankRenderContext = {
    questions: group.questions,
    answers,
    flagged,
    onAnswer,
    onToggleFlag,
    maxWords,
    matched,
  }

  const headerCells = parsed.header.map((cell, i) => (
    <th
      key={i}
      className="border border-border bg-muted/40 px-3 py-2.5 text-left text-xs font-bold text-foreground"
    >
      {renderInlineBlanks(cell, ctx, `th-${i}`, true)}
    </th>
  ))

  const bodyRows = parsed.rows.map((row, r) => (
    <tr key={r} className="align-top transition-colors hover:bg-muted/20">
      {row.map((cell, c) => (
        <td
          key={c}
          className="border border-border p-2.5 align-top text-[15px] leading-relaxed text-foreground sm:p-3 sm:text-base md:text-[17px]"
        >
          {renderInlineBlanks(cell, ctx, `td-${r}-${c}`, true)}
        </td>
      ))}
    </tr>
  ))

  const unplacedQuestions = group.questions.filter(
    (q) => !matched.has(q.questionNumber)
  )

  return (
    <div className="space-y-3">
      {parsed.preamble && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {parsed.preamble}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>{headerCells}</tr>
          </thead>
          <tbody>{bodyRows}</tbody>
        </table>
      </div>

      {parsed.trailing && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {parsed.trailing}
        </p>
      )}

      <UnplacedQuestionsList
        questions={unplacedQuestions}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    </div>
  )
}

// ─── Flow Chart Completion — step cards joined by arrows ──────────────────────
function FlowChartRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  maxWords,
}: {
  group: CandidateQuestionGroup
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  maxWords?: number
}) {
  const template = (group.config?.template as string) ?? ""
  const steps = React.useMemo(() => splitFlowSteps(template), [template])

  const matched = new Set<number>()
  const ctx: BlankRenderContext = {
    questions: group.questions,
    answers,
    flagged,
    onAnswer,
    onToggleFlag,
    maxWords,
    matched,
  }

  const stepNodes = steps.map((step, i) => (
    <React.Fragment key={i}>
      {i > 0 && (
        <div className="flex justify-center py-0.5 text-muted-foreground/70">
          <HugeiconsIcon icon={ArrowDown01Icon} size={22} />
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex-1 text-[15px] leading-relaxed text-foreground sm:text-base md:text-[17px]">
            {renderInlineBlanks(step, ctx, `step-${i}`)}
          </div>
        </div>
      </div>
    </React.Fragment>
  ))

  const unplacedQuestions = group.questions.filter(
    (q) => !matched.has(q.questionNumber)
  )

  return (
    <div className="space-y-0.5">
      {stepNodes}
      <UnplacedQuestionsList
        questions={unplacedQuestions}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    </div>
  )
}

// ─── Matching Features — matrix (≤5) or pill list (>5) ────────────────────────
function MatchingFeaturesRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  group: CandidateQuestionGroup
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  const config = group.config || {}
  const features =
    (config.featuresPool as Array<{ id: string; text: string }>) ?? []
  const allowReuse = (config.allowReuse as boolean | undefined) ?? true

  const header = (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {formatQuestionRange(group.questions)}
      </p>
      {group.instructionsDoc ? (
        <RichDocView
          doc={group.instructionsDoc}
          className="text-sm font-medium text-foreground"
        />
      ) : (
        <p className="text-sm font-medium whitespace-pre-line text-foreground">
          <RichText text={group.instructions} />
        </p>
      )}
      {allowReuse && (
        <p className="text-xs font-semibold text-primary">
          NB: You may use any letter more than once.
        </p>
      )}
    </div>
  )

  // Small pool → radio matrix (like matching_information)
  if (features.length <= 5) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        {header}
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur-xs border-b border-r border-border px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  Phát biểu / Nhận định
                </th>
                {features.map((f) => (
                  <th
                    key={f.id}
                    title={f.text}
                    className="w-10 min-w-10 max-w-10 sm:w-12 sm:min-w-12 sm:max-w-12 border-b border-l border-border/60 px-0.5 py-2 text-center align-bottom"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-sm font-bold text-foreground sm:text-base">
                        {f.id}
                      </span>
                      {f.text && (
                        <span
                          className="max-w-16 truncate text-[9px] font-normal text-muted-foreground"
                          title={f.text}
                        >
                          <RichText text={f.text} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.questions.map((q) => {
                const answer = answers[q.id]?.value ?? ""
                const isFlagged = !!flagged[q.id]
                return (
                  <tr
                    key={q.id}
                    id={questionAnchorId(q.id)}
                    data-question-id={q.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="sticky left-0 z-10 bg-card border-r border-border px-3.5 py-2.5 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                          {q.questionNumber}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm leading-snug text-foreground select-text break-words">
                          <SelectableHighlightedText
                            targetId={`q-${q.id}`}
                            text={q.prompt}
                          />
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFlag(q.id)}
                          className={cn(
                            "mt-0.5 shrink-0 transition-colors",
                            isFlagged
                              ? "text-amber-500"
                              : "text-muted-foreground/30 hover:text-muted-foreground"
                          )}
                          title="Đánh dấu câu này"
                        >
                          <HugeiconsIcon icon={Flag01Icon} size={14} />
                        </button>
                      </div>
                    </td>
                    {features.map((f) => {
                      const isSelected = answer === f.id
                      return (
                        <td
                          key={f.id}
                          onClick={() => onAnswer(q.id, f.id)}
                          className="w-10 min-w-10 max-w-10 sm:w-12 sm:min-w-12 sm:max-w-12 border-l border-border/60 px-0.5 py-2 text-center align-middle cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAnswer(q.id, f.id)
                            }}
                            className={cn(
                              "mx-auto flex size-5 sm:size-5.5 items-center justify-center rounded-full border transition-all cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border-strong bg-background hover:border-primary/60"
                            )}
                            aria-label={`Câu ${q.questionNumber}: Chọn ${f.id}`}
                          >
                            {isSelected && (
                              <span className="size-2 rounded-full bg-primary-foreground" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Large pool → fixed list + pill buttons with name preview
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      {header}

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          List of Features
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.id} className="flex gap-2 text-sm">
              <span className="w-5 shrink-0 font-mono font-bold text-primary">
                {f.id}
              </span>
              <span className="text-foreground"><RichText text={f.text} /></span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {group.questions.map((q) => {
          const answer = answers[q.id]?.value ?? ""
          const isFlagged = !!flagged[q.id]
          const selected = features.find((f) => f.id === answer)
          return (
            <div
              key={q.id}
              id={questionAnchorId(q.id)}
              data-question-id={q.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                  {q.questionNumber}
                </span>
                <span className="flex-1 text-sm leading-snug text-foreground">
                  <SelectableHighlightedText
                    targetId={`q-${q.id}`}
                    text={q.prompt}
                  />
                </span>
                <button
                  type="button"
                  onClick={() => onToggleFlag(q.id)}
                  className={cn(
                    "mt-0.5 shrink-0",
                    isFlagged
                      ? "text-amber-500"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  )}
                >
                  <HugeiconsIcon icon={Flag01Icon} size={14} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-9">
                {features.map((f) => {
                  const isSelected = answer === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      title={f.text}
                      onClick={() => onAnswer(q.id, f.id)}
                      className={cn(
                        "min-w-9 rounded-full border px-2.5 py-1 font-mono text-sm font-bold transition-colors sm:text-base",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {f.id}
                    </button>
                  )
                })}
                {selected && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <RichText text={selected.text} />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface GroupRendererProps {
  group: CandidateQuestionGroup
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}

/**
 * Renders the group-level illustration (config.imageMediaId, resolved to a
 * presigned URL by the API) above the type-specific group body.
 */
function GroupRenderer(props: GroupRendererProps) {
  return (
    <div className="space-y-4">
      <MediaImages media={props.group.media} />
      <GroupRendererBody {...props} />
    </div>
  )
}

function GroupRendererBody({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: GroupRendererProps) {
  const config = group.config || {}
  const {
    options,
    optionsPool,
    labelsPool,
    isTFNG,
    isYNNG,
    isMatching,
    isCompletion,
    maxWords,
    wordLimitText,
    matchPool,
  } = getGroupViewMeta(group)
  // #14: summary answers can be locked after the first selection.
  const allowChangeAnswer = config.allowChangeAnswer !== false

  // ─── Multiple Choice Multiple ──────────────────────────────────────────────
  if (group.groupType === "multiple_choice_multiple") {
    const maxSelections =
      (config.maxSelections as number) || group.questions.length || 2
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
          const targetQ = group.questions.find(
            (q) => answers[q.id]?.value?.trim() === optId
          )
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
          const emptyQ = group.questions.find(
            (q) => !answers[q.id]?.value?.trim()
          )
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
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Chọn đúng {maxSelections} đáp án</span>
            <span className="font-mono font-semibold text-foreground">
              {selectedOptionIds.length} / {maxSelections} đã chọn
            </span>
          </div>

          {group.questions[0]?.prompt && (
            <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
              <RichText text={group.questions[0].prompt} />
            </p>
          )}

          <div className="space-y-2">
            {options.map((opt) => {
              const isSelected = selectedOptionIds.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleToggleOption(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs sm:text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 font-semibold text-primary shadow-2xs"
                      : "border-border text-foreground hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-5.5 sm:size-6 shrink-0 items-center justify-center rounded border font-mono text-[11px] sm:text-xs font-bold transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-card"
                    )}
                  >
                    {opt.id}
                  </div>
                  <span className="flex-1"><RichText text={opt.text || opt.id} /></span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
            {group.questions.map((q) => {
              const qAns = answers[q.id]?.value?.trim()
              const isFlag = !!flagged[q.id]
              return (
                <div
                  key={q.id}
                  id={questionAnchorId(q.id)}
                  data-question-id={q.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1 text-xs"
                >
                  <span className="font-mono font-bold text-primary">
                    Câu {q.questionNumber}:
                  </span>
                  <span className="font-mono font-semibold">
                    {qAns || "(Chưa chọn)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleFlag(q.id)}
                    className={cn(
                      "ml-1",
                      isFlag
                        ? "text-amber-500"
                        : "text-muted-foreground/30 hover:text-muted-foreground"
                    )}
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

  // ─── Matching Information — IELTS on Computer radio matrix ─────────────────
  if (group.groupType === "matching_information") {
    const paragraphLabels: string[] =
      Array.isArray(config.paragraphLabels) && config.paragraphLabels.length > 0
        ? (config.paragraphLabels as string[])
        : ["A", "B", "C", "D", "E", "F", "G"]
    const allowReuse = (config.allowReuse as boolean | undefined) ?? true
    const lastLabel = paragraphLabels[paragraphLabels.length - 1]

    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {allowReuse && (
            <p className="text-xs font-semibold text-primary">
              NB: You may use any letter more than once.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Chọn chữ cái của đoạn văn (A–{lastLabel}) có chứa thông tin tương
            ứng với mỗi nhận định.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur-xs border-b border-r border-border px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  Phát biểu / Nhận định
                </th>
                {paragraphLabels.map((label) => (
                  <th
                    key={label}
                    className="w-8 min-w-8 max-w-8 sm:w-10 sm:min-w-10 sm:max-w-10 border-b border-l border-border/60 px-0.5 py-2.5 text-center font-mono text-sm font-bold text-foreground sm:text-base"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.questions.map((q) => {
                const answer = answers[q.id]?.value ?? ""
                const isFlagged = !!flagged[q.id]
                return (
                  <tr
                    key={q.id}
                    id={questionAnchorId(q.id)}
                    data-question-id={q.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="sticky left-0 z-10 bg-card border-r border-border px-3.5 py-2.5 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                          {q.questionNumber}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm leading-snug text-foreground select-text break-words">
                          <SelectableHighlightedText
                            targetId={`q-${q.id}`}
                            text={q.prompt}
                          />
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFlag(q.id)}
                          className={cn(
                            "mt-0.5 shrink-0 transition-colors",
                            isFlagged
                              ? "text-amber-500"
                              : "text-muted-foreground/30 hover:text-muted-foreground"
                          )}
                          title="Đánh dấu câu này"
                        >
                          <HugeiconsIcon icon={Flag01Icon} size={14} />
                        </button>
                      </div>
                    </td>
                    {paragraphLabels.map((label) => {
                      const isSelected = answer === label
                      return (
                        <td
                          key={label}
                          onClick={() => onAnswer(q.id, label)}
                          className="w-8 min-w-8 max-w-8 sm:w-10 sm:min-w-10 sm:max-w-10 border-l border-border/60 px-0.5 py-2 text-center align-middle cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAnswer(q.id, label)
                            }}
                            className={cn(
                              "mx-auto flex size-5 sm:size-5.5 items-center justify-center rounded-full border transition-all cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border-strong bg-background hover:border-primary/60"
                            )}
                            aria-label={`Câu ${q.questionNumber}: Chọn đoạn ${label}`}
                          >
                            {isSelected && (
                              <span className="size-2 rounded-full bg-primary-foreground" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── Matching Features — matrix (≤5) or pill list (>5) ─────────────────────
  if (
    group.groupType === "matching_features" &&
    Array.isArray(config.featuresPool) &&
    (config.featuresPool as unknown[]).length > 0
  ) {
    return (
      <MatchingFeaturesRenderer
        group={group}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    )
  }

  // ─── Table Completion — real HTML table from a Markdown template ────────────
  if (
    group.groupType === "table_completion" &&
    typeof config.template === "string" &&
    parseMarkdownTable(config.template)
  ) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {wordLimitText && (
            <p className="text-xs font-semibold text-primary">
              {wordLimitText}
            </p>
          )}
        </div>
        <TableCompletionRenderer
          group={group}
          answers={answers}
          flagged={flagged}
          onAnswer={onAnswer}
          onToggleFlag={onToggleFlag}
          maxWords={maxWords}
        />
      </div>
    )
  }

  // ─── Flow Chart Completion — step cards joined by arrows ────────────────────
  if (
    group.groupType === "flow_chart_completion" &&
    typeof config.template === "string" &&
    config.template.trim().length > 0
  ) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {wordLimitText && (
            <p className="text-xs font-semibold text-primary">
              {wordLimitText}
            </p>
          )}
        </div>
        <FlowChartRenderer
          group={group}
          answers={answers}
          flagged={flagged}
          onAnswer={onAnswer}
          onToggleFlag={onToggleFlag}
          maxWords={maxWords}
        />
      </div>
    )
  }

  // ─── Inline Template Renderer for Completion Types ─────────────────────────
  if (
    config.template &&
    typeof config.template === "string" &&
    config.template.trim().length > 0
  ) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {wordLimitText && (
            <p className="text-xs font-semibold text-primary">
              {wordLimitText}
            </p>
          )}
        </div>

        {optionsPool.length > 0 && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <span className="text-xs font-bold text-primary uppercase">
              Word Bank / Danh sách từ khóa:
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {optionsPool.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-sm sm:text-base"
                >
                  <span className="text-xs font-bold text-primary sm:text-sm">{item.id}</span>
                  <span className="text-foreground"><RichText text={item.text} /></span>
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
          allowChangeAnswer={
            typeof config.allowChangeAnswer === "boolean"
              ? config.allowChangeAnswer
              : undefined
          }
        />
      </div>
    )
  }

  // ─── Standard Group Renderer ───────────────────────────────────────────────
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="space-y-1.5">
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {formatQuestionRange(group.questions)}
        </p>
        <p className="text-sm sm:text-base font-semibold whitespace-pre-line text-foreground leading-relaxed">
          <RichText text={group.instructions} />
        </p>
        {wordLimitText && (
          <p className="text-xs sm:text-sm font-bold text-primary">{wordLimitText}</p>
        )}
      </div>

      {isMatching && matchPool.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
          {matchPool.map((item) => (
            <div key={item.id} className="flex gap-2 text-xs sm:text-sm">
              <span className="w-6 font-bold text-primary">{item.id}</span>
              <span className="text-foreground"><RichText text={item.text} /></span>
            </div>
          ))}
        </div>
      )}

      {optionsPool.length > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
          <span className="text-xs sm:text-sm font-bold text-primary uppercase">
            Word Bank:
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {optionsPool.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm sm:text-base"
              >
                <span className="text-xs font-bold text-primary sm:text-sm">{item.id}</span>
                <span className="text-foreground"><RichText text={item.text} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {labelsPool.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase">
            Danh sách nhãn:
          </span>
          <div className="flex flex-wrap gap-2">
            {labelsPool.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs sm:text-sm"
              >
                <span className="font-bold text-primary">{l.id}</span>
                <span className="text-foreground">{l.label || l.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {group.questions.map((q) => {
          const answer = answers[q.id]?.value ?? ""
          const isFlagged = !!flagged[q.id]
          const answerLocked = !allowChangeAnswer && answer !== ""
          return (
            <div
              key={q.id}
              id={questionAnchorId(q.id)}
              data-question-id={q.id}
              className="flex items-start gap-3 sm:gap-3.5"
            >
              <span className="mt-0.5 flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs sm:text-sm font-bold text-primary">
                {q.questionNumber}
              </span>
              <div className="flex-1 space-y-2">
                {q.prompt && (
                  <p className="text-sm sm:text-base font-medium leading-relaxed text-foreground">
                    <SelectableHighlightedText
                      targetId={`q-${q.id}`}
                      text={q.prompt}
                    />
                  </p>
                )}
                {isTFNG || isYNNG ? (
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAnswer(q.id, opt.id)}
                        className={cn(
                          "rounded-lg border px-4 py-2 text-xs sm:text-sm font-semibold transition-colors",
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
                  <div className="space-y-1.5">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAnswer(q.id, opt.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-xs sm:text-sm transition-colors",
                          answer === opt.id
                            ? "border-primary bg-primary/5 font-semibold text-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <span className="flex size-5.5 sm:size-6 shrink-0 items-center justify-center rounded-full border text-[11px] sm:text-xs font-bold">
                          {opt.id}
                        </span>
                        <span className="flex-1">
                          <SelectableHighlightedText
                            targetId={`opt-${q.id}-${opt.id}`}
                            text={opt.text || opt.id}
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : isMatching ? (
                  <div className="space-y-1">
                    <select
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      disabled={answerLocked}
                      title={
                        answerLocked
                          ? "Đã chọn đáp án, không thể đổi"
                          : undefined
                      }
                      className="h-11 rounded-lg border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70 sm:text-base md:h-9"
                    >
                      <option value="">—</option>
                      {matchPool.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.id}
                          {opt.text !== opt.id ? " - " + opt.text : ""}
                        </option>
                      ))}
                    </select>
                    {answerLocked && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Đã chọn đáp án, không thể đổi
                      </p>
                    )}
                  </div>
                ) : optionsPool.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      disabled={answerLocked}
                      title={
                        answerLocked
                          ? "Đã chọn đáp án, không thể đổi"
                          : undefined
                      }
                      className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 sm:text-base md:h-9"
                    >
                      <option value="">— Chọn từ khóa —</option>
                      {optionsPool.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.id}: {opt.text}
                        </option>
                      ))}
                    </select>
                    {answerLocked && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Đã chọn đáp án, không thể đổi
                      </p>
                    )}
                  </div>
                ) : labelsPool.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      disabled={answerLocked}
                      title={
                        answerLocked
                          ? "Đã chọn đáp án, không thể đổi"
                          : undefined
                      }
                      className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 sm:text-base md:h-9"
                    >
                      <option value="">— Chọn nhãn —</option>
                      {labelsPool.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.id}: {l.label || l.id}
                        </option>
                      ))}
                    </select>
                    {answerLocked && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Đã chọn đáp án, không thể đổi
                      </p>
                    )}
                  </div>
                ) : (
                  <Input
                    value={answer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="h-11 text-xs sm:text-sm rounded-lg md:h-9"
                    placeholder={
                      isCompletion && maxWords
                        ? `Tối đa ${maxWords} từ`
                        : "Nhập câu trả lời..."
                    }
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => onToggleFlag(q.id)}
                className={cn(
                  "mt-1 shrink-0 p-1 rounded-md transition-colors",
                  isFlagged
                    ? "text-amber-500"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                )}
                title="Đánh dấu câu hỏi"
              >
                <HugeiconsIcon icon={Flag01Icon} size={16} />
              </button>
            </div>
          )
        })}
      </div>
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
  const sections = computeSectionReviews(exam, answers, flagged)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            Xác nhận nộp bài thi
          </DialogTitle>
          <DialogDescription className="text-xs">
            Vui lòng rà soát lại tiến độ làm bài trước khi gửi kết quả cuối
            cùng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-3">
            {sections.map(
              ({
                section: sec,
                total,
                answered,
                flaggedCount,
                isWriting,
                wordCounts,
              }) => (
                <div
                  key={`${sec.skill}-${sec.part}`}
                  className="flex justify-between font-medium"
                >
                  <span className="capitalize">
                    {sec.skill} {sec.part ? `· Part ${sec.part}` : ""} ({total}{" "}
                    câu)
                  </span>
                  {isWriting ? (
                    <span className="font-mono text-muted-foreground">
                      {wordCounts
                        .map((w, i) => `Task ${i + 1}: ${w} từ`)
                        .join(" · ")}
                    </span>
                  ) : (
                    <span className="font-mono text-emerald-600">
                      {answered} / {total} đã làm
                      {flaggedCount > 0 && (
                        <span className="text-amber-600">
                          {" "}
                          · {flaggedCount} đánh dấu
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Sau khi xác nhận nộp bài, hệ thống sẽ tự động chấm điểm Listening &
            Reading. Bạn sẽ không thể tiếp tục chỉnh sửa bài làm.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Quay lại làm tiếp
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={submitting}
            className="font-bold"
          >
            {submitting ? "Đang nộp…" : "Nộp bài ngay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

