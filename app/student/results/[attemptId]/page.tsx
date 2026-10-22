"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  MultiplicationSignCircleIcon,
  Award01Icon,
  RotateRight01Icon,
  Analytics01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { formatBand, QUESTION_GROUP_TYPE_LABEL } from "@/lib/format"
import { useAttemptResultQuery, useMyAttemptsQuery } from "@/hooks/use-attempts"
import { useExamDetailQuery } from "@/hooks/use-exams"
import { PostSubmissionResources } from "@/features/practice/components/post-submission-resources"
import { RichText } from "@/features/exam-engine/components/rich-text"
import type {
  AttemptResult,
  AttemptResultDetail,
  CandidateExam,
  SkillType,
} from "@/lib/api/types"

const TABS: Array<{ id: SkillType; label: string }> = [
  { id: "listening", label: "Listening" },
  { id: "reading", label: "Reading" },
  { id: "writing", label: "Writing" },
]

const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "wrong", label: "Sai" },
  { value: "correct", label: "Đúng" },
  { value: "blank", label: "Bỏ trống" },
] as const

type FilterValue = (typeof FILTERS)[number]["value"]

export default function StudentResultDetailPage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

  return <RealResultDetail attemptId={attemptId} />
}

// ─── REAL ────────────────────────────────────────────────────────────────────
function RealResultDetail({ attemptId }: { attemptId: string }) {
  const resultQuery = useAttemptResultQuery(attemptId)
  // Ưu tiên examId từ attempt result, fallback sang list tra cứu
  const myAttemptsQuery = useMyAttemptsQuery({ limit: 100 })
  const attemptRow = React.useMemo(
    () => myAttemptsQuery.data?.items.find((a) => a.id === attemptId),
    [myAttemptsQuery.data, attemptId]
  )
  const examId = resultQuery.data?.examId || attemptRow?.exam?.id || ""
  const examQuery = useExamDetailQuery(examId, !!examId)

  const isLoading =
    resultQuery.isLoading || (!!examId && examQuery.isLoading)
  // Kết quả vẫn phải xem được nếu exam detail bị chặn (đề đã đóng/assignment
  // đã archive). Chỉ coi examQuery.error là lỗi chính khi chưa có result.
  const error =
    resultQuery.error ??
    (resultQuery.data ? null : examQuery.error ?? myAttemptsQuery.error)

  const refetch = () => {
    resultQuery.refetch()
    myAttemptsQuery.refetch()
    if (examId) examQuery.refetch()
  }

  return (
    <ResultDetailView
      result={resultQuery.data}
      exam={examQuery.data}
      isLoading={isLoading}
      error={error}
      refetch={refetch}
    />
  )
}

// ─── Shared View ─────────────────────────────────────────────────────────────
interface ResultDetailViewProps {
  result: AttemptResult | undefined
  exam: CandidateExam | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

function ResultDetailView({ result, exam, isLoading, error, refetch }: ResultDetailViewProps) {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("listening"))
  const [filter, setFilter] = useQueryState("filter", parseAsString.withDefault("all"))

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (error || !result) {
    const message =
      error instanceof ApiError ? error.message : "Không tải được kết quả bài thi."
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link href="/student/results">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
            <span>Quay lại danh sách kết quả</span>
          </Link>
        </Button>
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="default" size="sm" onClick={refetch} className="font-semibold">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // CHG-04 fallback: scores = {} khi showScoreAfterSubmit=false → vẫn show review đáp án
  const hasScores = Object.keys(result.scores ?? {}).length > 0
  const isWritingGraded = Boolean(result.writingReview)

  // G11: biết đề có Writing section qua exam.sections (đã lược đáp án)
  const hasWritingSection = !!exam?.sections?.some((s) => s.skill === "writing")
  const examTitle = exam?.title ?? "Bài thi"
  const isExpired = result.status === "expired"

  // TODO(G5): hiện nút làm lại khi backend trả maxAttempts/attemptsUsed
  const hasRetakeInfo = false

  // Map detail by questionId for quick lookup
  const detailByQuestionId = new Map<string, AttemptResultDetail>()
  result.details.forEach((d) => detailByQuestionId.set(d.questionId, d))

  // Build per-skill question lists from exam.sections + match với result.details
  type Row = {
    questionId: string
    order: number
    prompt: string
    groupType?: string
    groupInstructions?: string
    detail?: AttemptResultDetail
  }

  const rowsBySkill: Record<SkillType, Row[]> = { listening: [], reading: [], writing: [] }
  if (exam) {
    let order = 0
    exam.sections.forEach((sec) => {
      const skill = sec.skill as SkillType

      ;(sec.questionGroups ?? []).forEach((g) => {
        g.questions.forEach((q) => {
          order += 1
          rowsBySkill[skill]?.push({
            questionId: q.id,
            order: q.questionNumber ?? order,
            prompt: q.prompt,
            groupType: g.groupType,
            groupInstructions: g.instructions,
            detail: detailByQuestionId.get(q.id),
          })
        })
      })
    })
  }

  // Fallback: nếu exam không có (chưa tải được) → dựng rows trực tiếp từ details
  if (!exam && result.details.length > 0) {
    result.details.forEach((d, idx) => {
      const isWriting = d.groupType?.startsWith("writing_")
      const targetSkill: SkillType = isWriting ? "writing" : "listening"
      rowsBySkill[targetSkill].push({
        questionId: d.questionId,
        order: d.questionNumber ?? idx + 1,
        prompt: d.questionId,
        groupType: d.groupType,
        detail: d,
      })
    })
  }

  const applyFilter = (rows: Row[]): Row[] => {
    if (filter === "all") return rows
    return rows.filter((r) => {
      const d = r.detail
      if (!d) return filter === "blank"
      if (filter === "correct") return d.isCorrect
      if (filter === "wrong") return !d.isCorrect && !!d.studentAnswer
      // blank
      return !d.studentAnswer
    })
  }

  const countFor = (rows: Row[], f: FilterValue) => {
    if (f === "all") return rows.length
    return rows.filter((r) => {
      const d = r.detail
      if (!d) return f === "blank"
      if (f === "correct") return d.isCorrect
      if (f === "wrong") return !d.isCorrect && !!d.studentAnswer
      return !d.studentAnswer
    }).length
  }

  const isPractice =
    result.examKind === "practice" || exam?.kind === "practice"
  const isRawDisplay = isPractice || result.scoreMode === "raw"
  const rawTotal = result.totalPoints ?? result.questionCount ?? 0
  const fallbackCorrect = result.details.filter(
    (d) => !d.groupType?.startsWith("writing") && d.isCorrect
  ).length
  const fallbackBlank = result.details.filter(
    (d) =>
      !d.groupType?.startsWith("writing") &&
      (!d.studentAnswer || d.studentAnswer.trim() === "")
  ).length
  const fallbackWrong = result.details.filter(
    (d) =>
      !d.groupType?.startsWith("writing") &&
      !!d.studentAnswer &&
      d.studentAnswer.trim() !== "" &&
      !d.isCorrect
  ).length
  const correctCount = result.correctCount ?? fallbackCorrect
  const wrongCount = result.wrongCount ?? fallbackWrong
  const blankCount = result.blankCount ?? fallbackBlank
  const countTotal = correctCount + wrongCount + blankCount

  const backHref = isPractice ? "/student/practice" : "/student/exams"
  const backLabel = isPractice ? "Quay lại luyện tập" : "Quay lại đề thi"

  const availableSkills = (["listening", "reading", "writing"] as const).filter(
    (k) => rowsBySkill[k].length > 0
  )
  const currentTab: SkillType = availableSkills.includes(tab as SkillType)
    ? (tab as SkillType)
    : (availableSkills[0] ?? "listening")

  const currentRows = rowsBySkill[currentTab]
  const filteredRows = applyFilter(currentRows)

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link href={backHref}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
            <span>{backLabel}</span>
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {isExpired ? "Hết giờ" : "Đã nộp"}
            </Badge>
            {isPractice && (
              <Badge
                variant="outline"
                className="text-xs border-primary/30 text-primary bg-primary/5"
              >
                Bài luyện tập
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="text-xs">
                Tự động nộp khi hết giờ
              </Badge>
            )}
            {!hasScores && !isPractice && (
              <Badge variant="outline" className="text-xs">
                Giáo viên chưa công bố điểm cho bài này
              </Badge>
            )}
          </div>
          <h1 className="font-heading text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            {isPractice ? "Kết quả luyện tập" : "Kết quả thi"}: {examTitle}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isPractice
              ? "Bài luyện tập hiển thị kết quả và hướng dẫn giải chi tiết bên dưới."
              : "Listening & Reading được chấm tự động ngay sau khi nộp bài."}
          </p>
        </div>

        {/* Action buttons: retake TODO(G5), progress, back */}
        <div className="flex flex-wrap items-center gap-2.5">
          {hasRetakeInfo && (
            <Button size="sm" asChild className="gap-1.5 font-medium text-xs">
              <Link href={backHref}>
                <HugeiconsIcon icon={RotateRight01Icon} size={14} />
                <span>Làm lại bài thi</span>
              </Link>
            </Button>
          )}

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
            <Link href="/student/progress">
              <HugeiconsIcon icon={Analytics01Icon} size={14} />
              <span>Xem tiến độ</span>
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>

      {/* Score Cards */}
      {isRawDisplay ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">SỐ CÂU ĐÚNG</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-primary">
                {correctCount}
                <span className="text-base font-normal text-muted-foreground">
                  /{countTotal || rawTotal || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              {countTotal > 0
                ? `${Math.round((correctCount / countTotal) * 100)}% số câu`
                : "Chưa có dữ liệu"}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">SỐ CÂU SAI</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-rose-600 dark:text-rose-400">
                {wrongCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Đã trả lời nhưng chưa đúng
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">BỎ TRỐNG</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-amber-600 dark:text-amber-400">
                {blankCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              Không có câu trả lời
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">TỶ LỆ ĐÚNG</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-foreground">
                {countTotal > 0
                  ? `${Math.round((correctCount / countTotal) * 100)}%`
                  : result.percentage !== undefined
                    ? `${result.percentage}%`
                    : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              {result.rawScore !== undefined
                ? `${result.rawScore}/${rawTotal} điểm`
                : "Điểm số làm bài"}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">THỜI GIAN LÀM</CardDescription>
              <CardTitle className="font-mono text-2xl font-semibold text-foreground">
                {result.durationSeconds != null
                  ? `${Math.floor(result.durationSeconds / 60)}p ${result.durationSeconds % 60}s`
                  : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              {exam?.durationMinutes ? `Giới hạn ${exam.durationMinutes} phút` : "Tự luyện tập"}
            </CardContent>
          </Card>
        </div>
      ) : hasScores ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Overall */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">OVERALL BAND</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-primary">
                {formatBand(result.scores.overallBand)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              {isWritingGraded || !hasWritingSection
                ? "Làm tròn theo chuẩn IELTS 0.5"
                : "Sẽ cập nhật khi Writing được chấm"}
            </CardContent>
          </Card>

          {/* Listening */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">LISTENING</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-foreground">
                {formatBand(result.scores.listeningBand)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              {result.scores.listeningRaw != null
                ? `${result.scores.listeningRaw} / 40 câu đúng`
                : "—"}
            </CardContent>
          </Card>

          {/* Reading */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">READING</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-foreground">
                {formatBand(result.scores.readingBand)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
              {result.scores.readingRaw != null
                ? `${result.scores.readingRaw} / 40 câu đúng`
                : "—"}
            </CardContent>
          </Card>

          {/* Writing */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">WRITING</CardDescription>
              <CardTitle className="font-mono text-3xl font-semibold text-foreground">
                {formatBand(result.scores.writingBand)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-[11px]">
              {isWritingGraded ? (
                <span className="text-muted-foreground">Đã chấm bởi giáo viên</span>
              ) : hasWritingSection ? (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <HugeiconsIcon icon={Clock01Icon} size={12} />
                  Chờ giáo viên chấm
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Giáo viên chưa công bố điểm cho bài này. Bạn vẫn có thể xem lại đáp án chi tiết bên dưới.
          </CardContent>
        </Card>
      )}

      {/* Writing teacher feedback */}
      {hasWritingSection && (
        isWritingGraded && result.writingReview ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HugeiconsIcon icon={Award01Icon} size={18} className="text-primary" />
              <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground">
                Nhận xét & Đánh giá Writing từ Giáo viên
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {result.writingReview.task1 && (
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-foreground">Task 1: Report</span>
                    <Badge variant="outline" className="font-mono font-semibold text-xs">
                      Band {formatBand(result.writingReview.task1.score)}
                    </Badge>
                  </div>
                  {result.writingReview.task1.comment && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {result.writingReview.task1.comment}
                    </p>
                  )}
                </div>
              )}

              {result.writingReview.task2 && (
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-foreground">Task 2: Essay</span>
                    <Badge variant="outline" className="font-mono font-semibold text-xs">
                      Band {formatBand(result.writingReview.task2.score)}
                    </Badge>
                  </div>
                  {result.writingReview.task2.comment && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {result.writingReview.task2.comment}
                    </p>
                  )}
                </div>
              )}
            </div>

            {result.writingReview.generalFeedback && (
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs leading-relaxed">
                <span className="font-semibold text-foreground block mb-1">
                  Nhận xét chung của giáo viên:
                </span>
                <p className="text-muted-foreground">{result.writingReview.generalFeedback}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-2 bg-muted/10">
            <div className="inline-flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <HugeiconsIcon icon={Clock01Icon} size={18} />
            </div>
            <h4 className="font-heading font-semibold text-sm text-foreground">
              Phần thi Writing đang trong hàng đợi chấm điểm
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Giáo viên phụ trách lớp sẽ sớm chấm và nhận xét chi tiết Task 1 & Task 2. Điểm
              Overall chính thức sẽ được cập nhật ngay sau đó.
            </p>
          </div>
        )
      )}

      {/* Post-submission learning resources */}
      {result.postSubmissionResources && (
        <PostSubmissionResources resources={result.postSubmissionResources} />
      )}

      {/* Detailed Question Review with tabs + filter (URL state qua nuqs) */}
      <div className="space-y-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Chi tiết đáp án & giải thích từng câu hỏi
          </h3>
          <p className="text-xs text-muted-foreground">
            Đối chiếu câu trả lời của bạn với đáp án chuẩn
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1 w-fit">
          {TABS.map((t) => {
            const rows = rowsBySkill[t.id]
            if (t.id === "writing" && !hasWritingSection && rows.length === 0) return null
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  currentTab === t.id
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label} ({rows.length})
              </button>
            )
          })}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value === "all" ? null : f.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {f.value !== "all" && ` (${countFor(currentRows, f.value)})`}
            </button>
          ))}
        </div>

        {/* Question rows */}
        <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
          {filteredRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Không có câu hỏi nào ở mục này.
            </p>
          ) : (
            filteredRows.map((row) => {
              const d = row.detail
              const isBlank = !d || !d.studentAnswer
              const isCorrect = d?.isCorrect ?? false

              return (
                <div
                  key={row.questionId}
                  className="p-4 sm:p-5 space-y-2 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-xs sm:text-sm text-foreground shrink-0">
                        Câu {row.order}
                      </span>
                      {row.groupType && (
                        <Badge variant="outline" className="text-[10px] font-medium border-border/80">
                          {QUESTION_GROUP_TYPE_LABEL[row.groupType as keyof typeof QUESTION_GROUP_TYPE_LABEL] ?? row.groupType}
                        </Badge>
                      )}
                      {isBlank ? (
                        <Badge variant="secondary" withDot className="text-[11px]">
                          Bỏ trống
                        </Badge>
                      ) : isCorrect ? (
                        <Badge variant="success" withDot className="text-[11px]">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} className="mr-0.5" />
                          Chính xác
                        </Badge>
                      ) : (
                        <Badge variant="destructive" withDot className="text-[11px]">
                          <HugeiconsIcon icon={MultiplicationSignCircleIcon} size={11} className="mr-0.5" />
                          Chưa chính xác
                        </Badge>
                      )}
                    </div>
                  </div>

                  {row.groupInstructions && (
                    <p className="text-[11px] font-medium text-muted-foreground italic">
                      <RichText text={row.groupInstructions} />
                    </p>
                  )}

                  {row.prompt && row.prompt !== row.questionId && (
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      <RichText text={row.prompt} />
                    </p>
                  )}

                  {d && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                      <div>
                        <span className="text-muted-foreground">Đáp án của bạn: </span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            isBlank
                              ? "text-muted-foreground"
                              : isCorrect
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                          )}
                        >
                          {d.studentAnswer || "(Để trống)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Đáp án chấp nhận: </span>
                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {d.acceptedAnswers.length > 0 ? d.acceptedAnswers.join(" / ") : "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  {d?.explanation && (
                    <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground mt-1.5">
                      <span className="font-medium text-foreground">Giải thích: </span>
                      {d.explanation}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 border-t border-border">
        <Button variant="default" size="sm" asChild className="gap-1.5 font-medium text-xs">
          <Link href="/student/progress">
            <HugeiconsIcon icon={Analytics01Icon} size={14} />
            <span>Xem tiến độ của tôi</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="text-xs">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Skeleton className="h-8 w-44" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-7 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
