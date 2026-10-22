"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  EyeIcon,
  Flag01Icon,
  MusicNote01Icon,
  PlayIcon,
  RefreshIcon,
  Timer01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/layout/brand-logo"
import { RichText } from "@/features/exam-engine/components/rich-text"
import { ApiError } from "@/lib/api/client"
import { useTeacherExamDetailQuery } from "@/hooks/use-exams"
import type { MediaItem, SkillType } from "@/lib/api/types"

interface PreviewQuestion {
  id: string
  type: string
  prompt: string
  part?: number
  data?: Record<string, unknown>
  acceptedAnswers?: string[]
}

interface PreviewSection {
  skill: SkillType
  part: number
  title: string
  instructions?: string | null
  passageText?: string | null
  mediaIds?: string[]
  media?: Array<{ id: string; url: string; type: string; originalName?: string }>
  questionGroups?: Array<{ id: string; groupType: string; media?: MediaItem[] }>
  questions: PreviewQuestion[]
}

/** Flatten a section's question groups into preview questions. */
function flattenGroupsToPreviewQuestions(section: {
  questionGroups?: Array<{
    groupType: string
    config?: Record<string, unknown>
    questions?: Array<{ id: string; prompt: string; acceptedAnswers?: string[] }>
  }>
}): PreviewQuestion[] {
  return (section.questionGroups ?? []).flatMap((g) =>
    (g.questions ?? []).map((q) => ({
      id: q.id,
      type: g.groupType,
      prompt: q.prompt,
      data: (g.config ?? {}) as Record<string, unknown>,
      acceptedAnswers: q.acceptedAnswers ?? [],
    }))
  )
}

export default function ExamPreviewPage() {
  const params = useParams<{ examId: string }>()
  const examId = params.examId

  const examQuery = useTeacherExamDetailQuery(examId)

  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0)
  const [showAnswers, setShowAnswers] = React.useState(false)

  // Normalize exam data
  const exam: { title: string; sections: PreviewSection[] } | null = examQuery.data
    ? {
        title: examQuery.data.title,
        sections: examQuery.data.sections.map((s) => ({
          ...s,
          questions: flattenGroupsToPreviewQuestions(s),
        })),
      }
    : null

  const current = exam?.sections[activeSectionIndex]
  const selectionBlocked = examQuery.data?.disableTextSelection === true

  const sectionImages = (current?.media ?? []).filter((m) => m.type === "image") as MediaItem[]
  const groupImages = (current?.questionGroups ?? [])
    .flatMap((g) => g.media ?? [])
    .filter((m) => m.type === "image")

  if (examQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
          <HugeiconsIcon icon={EyeIcon} size={14} />
          Chế độ xem trước — không lưu kết quả
        </div>
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-8 w-40" />
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-8">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </main>
      </div>
    )
  }

  if (examQuery.isError || !exam || !current) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
          <HugeiconsIcon icon={EyeIcon} size={14} />
          Chế độ xem trước — không lưu kết quả
        </div>
        <main className="mx-auto w-full max-w-2xl flex-1 py-16">
          <Card className="border-border shadow-xs">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm font-medium text-foreground">Không tải được đề thi</p>
              <p className="text-xs text-muted-foreground">
                {examQuery.error instanceof ApiError
                  ? examQuery.error.message
                  : "Đề không tồn tại hoặc bạn không có quyền xem."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-medium"
                  onClick={() => examQuery.refetch()}
                >
                  <HugeiconsIcon icon={RefreshIcon} size={14} />
                  <span>Thử lại</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link href={`/teacher/exams/${examId}`}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Quay lại
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Preview banner */}
      <div className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
        <HugeiconsIcon icon={EyeIcon} size={14} />
        Chế độ xem trước — không lưu kết quả
      </div>

      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-4">
          <BrandLogo href="/student" compact />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span className="max-w-[260px] truncate font-heading text-sm font-bold text-foreground">
            {exam.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-1 font-mono text-sm font-extrabold md:flex">
            <HugeiconsIcon icon={Timer01Icon} size={15} className="text-primary" />
            <span>--:--</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              showAnswers
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("flex size-4 items-center justify-center rounded-full border", showAnswers ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
              {showAnswers && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />}
            </span>
            Hiện đáp án đúng
          </button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/teacher/exams/${examId}`}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={15} /> Thoát
            </Link>
          </Button>
        </div>
      </header>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-6 py-2">
        {exam.sections.map((sec, idx) => (
          <button
            key={`${sec.skill}-${idx}`}
            onClick={() => setActiveSectionIndex(idx)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              idx === activeSectionIndex
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {sec.skill}
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              {sec.questions.length}
            </span>
          </button>
        ))}
      </div>

      <main
        className={cn(
          "mx-auto w-full max-w-4xl flex-1 space-y-6 p-8",
          selectionBlocked && "exam-no-select"
        )}
      >
        {current.skill === "listening" && (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HugeiconsIcon icon={PlayIcon} size={16} />
            </span>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <HugeiconsIcon icon={MusicNote01Icon} size={13} className="text-primary" />
                {current.media?.[0]?.originalName ??
                  (current.mediaIds?.length ? `${current.mediaIds.length} tệp audio` : "Chưa gắn audio")}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div className="h-full w-1/3 rounded-full bg-primary" />
              </div>
            </div>
            <span className="font-mono text-xs text-muted-foreground">--:-- / --:--</span>
          </div>
        )}

        {current.skill === "reading" && current.passageText && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <Badge variant="outline" className="mb-3 text-primary">{current.title}</Badge>
            <div className="prose prose-sm max-w-none whitespace-pre-line font-serif text-sm leading-[1.8] text-foreground/90">
              <RichText text={current.passageText} />
            </div>
          </div>
        )}

        {current.skill === "writing" && current.questions[0] && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Đề bài</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
              <RichText text={current.questions[0].prompt} />
            </p>
          </div>
        )}

        {/* Section illustration */}
        {sectionImages.length > 0 && (
          <div className="space-y-3">
            {sectionImages.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.url}
                alt={m.originalName || "Ảnh minh hoạ"}
                className="w-full rounded-2xl border border-border"
              />
            ))}
          </div>
        )}

        {/* Group-level images (config.imageMediaId) */}
        {groupImages.length > 0 && (
          <div className="space-y-3">
            {groupImages.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.url}
                alt={m.originalName || "Ảnh của nhóm câu hỏi"}
                className="w-full rounded-2xl border border-border"
              />
            ))}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-heading text-sm font-bold text-foreground">
              Questions 1–{current.questions.length}
            </h3>
            {current.instructions && (
              <p className="text-xs text-muted-foreground"><RichText text={current.instructions} /></p>
            )}
          </div>

          {current.questions.map((q, idx) => {
            const answers = q.acceptedAnswers ?? []
            const options =
              (q.data?.options as Array<{ id: string; text: string }>) ??
              (q.data?.headings as Array<{ id: string; text: string }>) ??
              []
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="mb-3 flex items-start gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground"><RichText text={q.prompt} /></span>
                </div>

                {options.length > 0 ? (
                  <div className="space-y-2">
                    {options.map((opt) => {
                      const isAnswer = showAnswers && answers.includes(opt.id)
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 text-xs font-medium",
                            isAnswer
                              ? "border-primary bg-primary/5 font-semibold text-primary"
                              : "border-border text-foreground"
                          )}
                        >
                          <span className={cn("flex size-5 items-center justify-center rounded-full border font-mono text-[11px] font-bold", isAnswer ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                            {opt.id}
                          </span>
                          <span><RichText text={opt.text} /></span>
                          {isAnswer && <Badge variant="default" className="ml-auto text-[10px]">Đáp án</Badge>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                    {(q.data?.templateText as string) ?? "[Chỗ trả lời của học sinh]"}
                    {showAnswers && answers.length > 0 && (
                      <Badge variant="default" className="ml-2 font-mono text-[10px]">
                        {answers.join(" / ")}
                      </Badge>
                    )}
                  </div>
                )}

                {showAnswers && q.type === "writing_task_1" && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Yêu cầu tối thiểu {(q.data?.minWords as number) ?? 150} từ.
                  </p>
                )}
                {showAnswers && q.type === "writing_task_2" && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Yêu cầu tối thiểu {(q.data?.minWords as number) ?? 250} từ.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === 0}
            onClick={() => setActiveSectionIndex((p) => Math.max(0, p - 1))}
          >
            Phần trước
          </Button>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={13} />
            {current.skill === "listening" ? "Part" : current.skill === "reading" ? "Passage" : "Task"}{" "}
            {current.part}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={activeSectionIndex === exam.sections.length - 1}
            onClick={() => setActiveSectionIndex((p) => Math.min(exam.sections.length - 1, p + 1))}
          >
            Phần tiếp theo
          </Button>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-2 border-t border-border py-3 text-[11px] text-muted-foreground">
        <HugeiconsIcon icon={Flag01Icon} size={12} />
        Đây là bản xem trước dành cho giáo viên. Học sinh không thấy nội dung này.
      </footer>
    </div>
  )
}
