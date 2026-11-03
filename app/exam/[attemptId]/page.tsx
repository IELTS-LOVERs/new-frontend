"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PlayIcon,
  Timer01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  RefreshIcon,
  TextFontIcon,
} from "@hugeicons/core-free-icons"
import {
  buildExamQuestionIndex,
  computeAnsweredCount,
} from "@/features/exam-engine/lib/exam-flow"
import { scrollToQuestion } from "@/features/exam-engine/lib/question-nav"
import { SubmitReviewDialog } from "@/features/exam-engine/components/submit-review-dialog"
import { ListeningSection } from "@/features/exam-engine/components/listening-section"
import { ReadingSection } from "@/features/exam-engine/components/reading-section"
import { WritingSection } from "@/features/exam-engine/components/writing-section"
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
import { useSubmitAttemptMutation } from "@/hooks/use-attempts"
import { clearAttemptSnapshot } from "@/features/exam-engine/lib/idb"
import { formatDuration } from "@/lib/format"

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
    } catch (err: unknown) {
      const errObj = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null
      const message = typeof errObj?.message === "string" ? errObj.message : String(err)
      if (message === "flush-failed") return
      setPhase("active")
      const code = errObj?.code
      if (code === "EXAM_ALREADY_SUBMITTED") {
        // coi như thành công
        setPhase("finished")
        router.replace(`/exam/${attemptId}/submitted`)
        return
      }
      toast.error(message || "Không thể nộp bài. Vui lòng thử lại.")
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