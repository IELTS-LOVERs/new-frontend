"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { WritingPendingBadge, SuspiciousBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft01Icon,
  Award01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  Flag01Icon,
  MaximizeScreenIcon,
  RefreshIcon,
  Shield01Icon,
  WifiOff01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { formatBand, formatDate } from "@/lib/format"
import type { AntiCheatEvent, AttemptResult } from "@/lib/api/types"
import { DEMO_ANTI_CHEAT_EVENTS, DEMO_ATTEMPT_RESULT, DEMO_QUESTION_BANK, DEMO_PENDING_GRADING, DEMO_SUSPICIOUS_SUBMISSIONS } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { useAttemptResultQuery, useAttemptEventsQuery } from "@/hooks/use-attempts"

const EVENT_META: Record<
  AntiCheatEvent["type"],
  { label: string; icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]; tone: "warning" | "danger" | "neutral" }
> = {
  TAB_SWITCH: { label: "Rời tab / chuyển cửa sổ", icon: Alert02Icon, tone: "warning" },
  WINDOW_BLUR: { label: "Mất focus cửa sổ", icon: Alert02Icon, tone: "warning" },
  FULLSCREEN_EXIT: { label: "Thoát toàn màn hình", icon: MaximizeScreenIcon, tone: "danger" },
  RELOAD: { label: "Tải lại trang", icon: RefreshIcon, tone: "warning" },
  COPY: { label: "Sao chép nội dung", icon: Copy01Icon, tone: "danger" },
  PASTE: { label: "Dán văn bản", icon: Copy01Icon, tone: "danger" },
  CUT: { label: "Cắt văn bản", icon: Copy01Icon, tone: "danger" },
  CONTEXT_MENU: { label: "Mở menu chuột phải", icon: Flag01Icon, tone: "warning" },
  INTERRUPTION: { label: "Gián đoạn kết nối", icon: WifiOff01Icon, tone: "neutral" },
}

const ANSWER_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "wrong", label: "Sai" },
  { value: "correct", label: "Đúng" },
  { value: "blank", label: "Bỏ trống" },
]

function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Không tải được dữ liệu bài nộp."
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

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}

export default function TeacherSubmissionDetailPage() {
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

  const resultQuery = useAttemptResultQuery(attemptId, !USE_MOCKS)
  const eventsQuery = useAttemptEventsQuery(attemptId, !USE_MOCKS)

  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("answers"))
  const [answerFilter, setAnswerFilter] = useQueryState("filter", parseAsString.withDefault("all"))

  if (!USE_MOCKS) {
    if (resultQuery.isLoading) return <DetailSkeleton />
    if (resultQuery.isError) {
      return (
        <div className="mx-auto max-w-6xl space-y-6">
          <QueryError error={resultQuery.error} onRetry={() => resultQuery.refetch()} />
        </div>
      )
    }
  }

  const result: AttemptResult | undefined = USE_MOCKS ? DEMO_ATTEMPT_RESULT : resultQuery.data
  if (!result) return null

  const events = USE_MOCKS
    ? DEMO_ANTI_CHEAT_EVENTS
    : (eventsQuery.data?.events ?? [])
  const suspicious = USE_MOCKS
    ? DEMO_ANTI_CHEAT_EVENTS.length >= 3
    : (eventsQuery.data?.suspicious ?? false)
  const eventsSummary = USE_MOCKS ? null : (eventsQuery.data?.summary ?? null)

  // Thông tin học sinh/đề/thời gian nộp: API result không trả về → bổ sung từ
  // danh sách grading/pending hoặc suspicious (nếu trùng attemptId).
  const submissionInfo = USE_MOCKS
    ? (DEMO_PENDING_GRADING.find((p) => p.attemptId === attemptId) ??
       DEMO_SUSPICIOUS_SUBMISSIONS.find((s) => s.attemptId === attemptId) ?? null)
    : null
  const studentName = submissionInfo?.studentName ?? "Học sinh"
  const examTitle = submissionInfo?.examTitle ?? "Bài thi"
  const submittedAt = submissionInfo?.submittedAt ?? null

  const promptById = new Map(DEMO_QUESTION_BANK.map((q) => [q.id, q.prompt]))
  const writingGraded = !!result.writingReview

  const answered = result.details.length
  const correct = result.details.filter((d) => d.isCorrect).length
  const wrong = result.details.filter((d) => !d.isCorrect && d.studentAnswer).length
  const blank = result.details.filter((d) => !d.studentAnswer).length

  const filteredDetails = result.details.filter((d) => {
    if (answerFilter === "correct") return d.isCorrect
    if (answerFilter === "wrong") return !d.isCorrect && !!d.studentAnswer
    if (answerFilter === "blank") return !d.studentAnswer
    return true
  })

  const tabSwitches = eventsSummary
    ? eventsSummary.tabSwitchOrBlur
    : events.filter((e) => e.type === "TAB_SWITCH" || e.type === "WINDOW_BLUR").length
  const pastes = eventsSummary
    ? eventsSummary.paste
    : events.filter((e) => e.type === "PASTE").length
  const fullscreenExits = eventsSummary
    ? eventsSummary.fullscreenExit
    : events.filter((e) => e.type === "FULLSCREEN_EXIT").length
  const totalEvents = eventsSummary ? eventsSummary.totalEvents : events.length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Bài nộp & Chấm điểm", href: "/teacher/submissions" },
          { label: studentName },
        ]}
        title="Chi tiết bài nộp"
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{studentName}</span>
            <span>·</span>
            <span>{examTitle}</span>
            {submittedAt && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <HugeiconsIcon icon={Clock01Icon} size={12} /> Nộp {formatDate(submittedAt)}
                </span>
              </>
            )}
            {suspicious && <SuspiciousBadge label="Cần kiểm tra" />}
            {totalEvents > 0 && !suspicious && (
              <SuspiciousBadge label={`${totalEvents} sự kiện`} />
            )}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href="/teacher/submissions">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={15} /> Danh sách
              </Link>
            </Button>
            {!writingGraded && (
              <Button variant="default" size="sm" className="gap-1.5 font-semibold" asChild>
                <Link href={`/teacher/grading/${attemptId}`}>
                  <HugeiconsIcon icon={Award01Icon} size={15} /> Chấm Writing
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Listening" value={formatBand(result.scores.listeningBand)} icon={Award01Icon} hint={`${result.scores.listeningRaw ?? 0}/40 đúng`} />
        <StatCard label="Reading" value={formatBand(result.scores.readingBand)} icon={Award01Icon} hint={`${result.scores.readingRaw ?? 0}/40 đúng`} />
        <StatCard label="Writing" value={writingGraded ? formatBand(result.scores.writingBand) : "—"} icon={Award01Icon} hint={writingGraded ? "Đã chấm" : "Chờ chấm"} />
        <StatCard label="Overall" value={writingGraded ? formatBand(result.scores.overallBand) : "—"} icon={Award01Icon} accent hint="Điểm tổng" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="answers" className="text-xs">
            Bài làm ({answered})
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5 text-xs">
            <HugeiconsIcon icon={Shield01Icon} size={13} />
            Nhật ký hành vi
            {totalEvents > 0 && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">{totalEvents}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="answers" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {ANSWER_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setAnswerFilter(f.value === "all" ? null : f.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  answerFilter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                {f.value === "correct" && ` (${correct})`}
                {f.value === "wrong" && ` (${wrong})`}
                {f.value === "blank" && ` (${blank})`}
              </button>
            ))}
          </div>

          <Card className="border-border shadow-xs">
            <CardContent className="divide-y divide-border p-0">
              {filteredDetails.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Không có câu trả lời ở mục này.
                </p>
              ) : (
                filteredDetails.map((d) => (
                  <div key={d.questionId} className="flex items-start gap-3 p-4">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                        d.isCorrect ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                      )}
                    >
                      <HugeiconsIcon
                        icon={d.isCorrect ? CheckmarkCircle02Icon : Alert02Icon}
                        size={14}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {promptById.get(d.questionId) ?? d.questionId}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          Bạn:{" "}
                          <span className={cn("font-mono font-semibold", d.isCorrect ? "text-emerald-600" : "text-destructive")}>
                            {d.studentAnswer || "(bỏ trống)"}
                          </span>
                        </span>
                        {!d.isCorrect && (
                          <span className="text-muted-foreground">
                            · Đáp án: <span className="font-mono font-semibold text-foreground">{d.acceptedAnswers.join(" / ")}</span>
                          </span>
                        )}
                      </div>
                      {!d.isCorrect && d.explanation && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="font-medium">Giải thích:</span> {d.explanation}
                        </p>
                      )}
                    </div>
                    {!writingGraded && d.questionId.startsWith("q-w") && (
                      <WritingPendingBadge />
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          {!USE_MOCKS && eventsQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : !USE_MOCKS && eventsQuery.isError ? (
            <QueryError error={eventsQuery.error} onRetry={() => eventsQuery.refetch()} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Tổng sự kiện" value={totalEvents} icon={Shield01Icon} accent />
                <StatCard label="Rời tab" value={tabSwitches} icon={Alert02Icon} hint="Lần chuyển cửa sổ" />
                <StatCard label="Dán văn bản" value={pastes} icon={Copy01Icon} hint="Lần dán" />
                <StatCard label="Thoát fullscreen" value={fullscreenExits} icon={MaximizeScreenIcon} hint="Lần thoát" />
              </div>

              <Card className="border-border shadow-xs">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="font-heading text-sm font-bold">Dòng thời gian sự kiện</CardTitle>
                  <CardDescription className="text-xs">
                    Ghi nhận tự động trong quá trình làm bài. Ngôn ngữ trung tính — cần kiểm tra, không kết luận gian lận.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  {events.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Không ghi nhận sự kiện bất thường nào.
                    </p>
                  ) : (
                    <ol className="relative space-y-5 border-l border-border pl-6">
                      {events.map((ev, idx) => {
                        const meta = EVENT_META[ev.type]
                        return (
                          <li key={ev.id ?? `${ev.type}-${idx}`} className="relative">
                            <span
                              className={cn(
                                "absolute -left-[31px] flex size-6 items-center justify-center rounded-full ring-4 ring-background",
                                meta.tone === "danger"
                                  ? "bg-destructive/10 text-destructive"
                                  : meta.tone === "warning"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              <HugeiconsIcon icon={meta.icon} size={13} />
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{meta.label}</p>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {formatDate(ev.timestamp)}
                              </span>
                            </div>
                            {ev.metadata?.durationMs && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Rời {Math.round(ev.metadata.durationMs / 1000)} giây
                              </p>
                            )}
                            {ev.metadata?.target && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Tại: {String(ev.metadata.target).replace(/_/g, " ")}
                              </p>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
