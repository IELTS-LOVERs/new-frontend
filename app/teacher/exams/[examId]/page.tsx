"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ExamStatusBadge, AssignmentStatusBadge } from "@/components/shared/status-badge"
import { BarChart, HBarChart } from "@/components/shared/charts"
import { AssignDialog } from "@/components/shared/assign-dialog"
import { DeleteExamDialog } from "@/components/shared/delete-exam-dialog"
import { EditExamButton } from "@/components/shared/edit-exam-button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Book02Icon,
  Clock01Icon,
  Delete02Icon,
  EyeIcon,
  HeadphonesIcon,
  MusicNote01Icon,
  PenTool01Icon,
  PencilEdit02Icon,
  RefreshIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import {
  useReopenExamMutation,
  useTeacherExamDetailQuery,
} from "@/hooks/use-exams"
import { useTeacherAssignmentsQuery } from "@/hooks/use-assignments"
import { useExamAnalyticsQuery } from "@/hooks/use-analytics"
import { RichText } from "@/features/exam-engine/components/rich-text"
import { SKILL_LABEL, formatDate, formatBand } from "@/lib/format"
import type { SkillType } from "@/lib/api/types"
import type { TeacherExamSection } from "@/lib/api/exams"
import { useAuthStore } from "@/stores/auth.store"

const SKILL_ICON: Record<SkillType, React.ComponentProps<typeof HugeiconsIcon>["icon"]> = {
  listening: HeadphonesIcon,
  reading: Book02Icon,
  writing: PenTool01Icon,
}

export default function TeacherExamDetailPage() {
  const params = useParams<{ examId: string }>()
  const examId = params.examId
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("overview"))
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const router = useRouter()

  const examQuery = useTeacherExamDetailQuery(examId)
  const reopenMutation = useReopenExamMutation(examId)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "admin"
  // TODO(G3): GET /api/assignments chưa hỗ trợ filter examId — lấy tất cả rồi lọc client.
  // Gỡ fallback khi backend thêm filter examId.
  const assignmentsQuery = useTeacherAssignmentsQuery({ limit: 100 })
  const analyticsQuery = useExamAnalyticsQuery(examId, tab === "analytics")

  // ----- Unified shapes -----
  const exam = examQuery.data
    ? {
        ...examQuery.data,
        skills: Array.from(new Set(examQuery.data.sections.map((s) => s.skill))),
      }
    : null

  const assignments = (assignmentsQuery.data?.items ?? []).filter((a) => a.examId === examId)

  const analytics = analyticsQuery.data

  const totalQuestions = exam
    ? exam.sections.reduce(
        (sum, s) =>
          sum + (s.questionGroups ?? []).reduce((a, g) => a + g.questions.length, 0),
        0
      )
    : 0

  const isLoading = examQuery.isLoading
  const isError = examQuery.isError

  const handleReopen = async () => {
    try {
      const result = await reopenMutation.mutateAsync()
      toast.success("Đã mở lại đề thi")
      if (result.clearedCloseAt) {
        toast.info("Thời gian đóng đã qua nên đã được xoá. Đề hiện đang mở.")
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể mở lại đề.")
    }
  }

  const handleDelete = () => {
    setDeleteOpen(false)
    router.push(exam?.kind === "practice" ? "/teacher/practices" : "/teacher/exams")
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !exam) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Không tải được chi tiết đề thi</p>
            <p className="text-xs text-muted-foreground">
              {examQuery.error instanceof ApiError
                ? examQuery.error.message
                : "Đã xảy ra lỗi hoặc đề không tồn tại."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => examQuery.refetch()}
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              <span>Thử lại</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Đề thi", href: "/teacher/exams" },
          { label: exam.title },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {exam.title}
            <ExamStatusBadge status={exam.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              <HugeiconsIcon icon={Clock01Icon} size={13} /> {exam.durationMinutes} phút
            </span>
            <span>· {totalQuestions} câu hỏi</span>
            <span>· {exam.skills.map((s) => SKILL_LABEL[s]).join(", ")}</span>
            {exam.openAt && <span>· Mở {formatDate(exam.openAt)}</span>}
            {exam.closeAt && <span>· Đóng {formatDate(exam.closeAt)}</span>}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/teacher/exams/${examId}/preview`}>
                <HugeiconsIcon icon={EyeIcon} size={15} /> Xem trước
              </Link>
            </Button>
            {exam.status === "draft" ? (
              <Button variant="default" size="sm" className="gap-1.5 font-semibold" asChild>
                <Link href={`/teacher/exams/${examId}/edit`}>
                  <HugeiconsIcon icon={PencilEdit02Icon} size={15} /> Soạn tiếp
                </Link>
              </Button>
            ) : (
              <EditExamButton
                examId={examId}
                status={exam.status}
                hasAttempts={exam.hasAttempts}
                hasAssignments={exam.hasAssignments}
                variant="default"
                size="sm"
                className="gap-1.5 font-semibold"
              />
            )}
            {exam.status === "closed" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-semibold"
                onClick={handleReopen}
                isLoading={reopenMutation.isPending}
              >
                <HugeiconsIcon icon={RefreshIcon} size={15} /> Mở lại
              </Button>
            )}
            {exam.status === "published" && exam.kind !== "practice" && (
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 font-semibold"
                onClick={() => setAssignOpen(true)}
              >
                <HugeiconsIcon icon={Task01Icon} size={15} /> Giao bài
              </Button>
            )}
            {(exam.status !== "published" || isAdmin) && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} size={15} /> Xoá
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs">Tổng quan</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">
            Đợt giao ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Thống kê</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {exam.sections.length === 0 ? (
            <EmptyState
              icon={Book02Icon}
              title="Đề chưa có phần nào"
              description="Mở trình soạn đề để thêm phần và câu hỏi."
              action={
                <Button asChild className="gap-2">
                  <Link href={`/teacher/exams/${examId}/edit`}>Soạn đề</Link>
                </Button>
              }
            />
          ) : (
            exam.sections.map((section, index) => {
              const sectionAny = section as TeacherExamSection & { media?: Array<{ type: string }> }
              const hasAudio =
                (sectionAny.media ?? []).some((m) => m.type === "audio") ||
                (sectionAny.mediaIds?.length ?? 0) > 0
              const questionCount = (section.questionGroups ?? []).reduce(
                (sum, g) => sum + g.questions.length,
                0
              )
              const firstGroupType = section.questionGroups?.[0]?.groupType
              return (
                <Card key={`${section.skill}-${index}`} className="border-border shadow-xs">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon icon={SKILL_ICON[section.skill]} size={19} />
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{section.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {SKILL_LABEL[section.skill]} · {questionCount} câu hỏi
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {section.skill === "listening" && (
                            <Badge variant={hasAudio ? "secondary" : "destructive"} className="gap-1 text-[10px] font-normal">
                              <HugeiconsIcon icon={MusicNote01Icon} size={10} />
                              {hasAudio ? "Có audio" : "Thiếu audio"}
                            </Badge>
                          )}
                          {section.skill === "reading" && (
                            <Badge
                              variant={section.passageText?.trim() ? "secondary" : "destructive"}
                              className="text-[10px] font-normal"
                            >
                              {section.passageText?.trim() ? "Có bài đọc" : "Thiếu bài đọc"}
                            </Badge>
                          )}
                          {questionCount > 0 && firstGroupType && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {firstGroupType.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="h-fit font-mono">
                      {section.skill === "reading"
                        ? `Passage ${section.part}`
                        : section.skill === "writing"
                          ? `Task ${section.part}`
                          : `Part ${section.part}`}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3">
          {assignmentsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={Task01Icon}
              title="Đề chưa được giao"
              description="Giao đề này cho một lớp hoặc học sinh để theo dõi tiến độ."
              action={
                <Button className="gap-2" onClick={() => setAssignOpen(true)}>
                  <HugeiconsIcon icon={Task01Icon} size={16} /> Giao bài
                </Button>
              }
            />
          ) : (
            assignments.map((a) => {
              const stats = a.stats ?? { assigned: 0, submitted: 0, inProgress: 0 }
              const pct = stats.assigned ? Math.round((stats.submitted / stats.assigned) * 100) : 0
              return (
                <Card key={a.id} className="border-border shadow-xs">
                  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{a.className ?? a.targetLabel}</p>
                        <AssignmentStatusBadge status={a.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Giao {formatDate(a.assignedAt)} · Hạn{" "}
                        {a.deadline ? formatDate(a.deadline) : "không giới hạn"}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-40 space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Đã nộp</span>
                          <span className="font-mono">{stats.submitted}/{stats.assigned}</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/assignments/${a.id}`}>Xem tiến độ</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !analytics || analytics.attemptCount === 0 ? (
            <EmptyState
              icon={Task01Icon}
              title="Chưa có dữ liệu thống kê"
              description="Đề này chưa có lượt làm bài nào. Thống kê sẽ xuất hiện sau khi học sinh nộp bài."
            />
          ) : (
            <>
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card className="border-border shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Tổng lượt nộp</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                      {analytics.attemptCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Từ tất cả các lớp</p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Điểm Overall trung bình</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-primary">
                      {formatBand(analytics.averageBand)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Phổ điểm bài thi</p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Accuracy cao nhất</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {analytics.sectionAccuracy.length > 0
                        ? `${Math.max(...analytics.sectionAccuracy.map((s) => s.accuracy))}%`
                        : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {analytics.sectionAccuracy.length > 0
                        ? analytics.sectionAccuracy.reduce((a, b) => (a.accuracy > b.accuracy ? a : b)).label
                        : "Chưa có"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Phần khó nhất</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-destructive">
                      {analytics.sectionAccuracy.length > 0
                        ? `${Math.min(...analytics.sectionAccuracy.map((s) => s.accuracy))}%`
                        : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {analytics.sectionAccuracy.length > 0
                        ? analytics.sectionAccuracy.reduce((a, b) => (a.accuracy < b.accuracy ? a : b)).label
                        : "Chưa có"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-3">
                    <CardTitle className="font-heading text-sm font-bold">Phân bố điểm thi</CardTitle>
                    <CardDescription className="text-xs">
                      Số lượng học sinh theo từng dải band điểm
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <BarChart
                      data={analytics.bandDistribution.map((b) => ({ label: String(b.band), value: b.count }))}
                      formatter={(v) => `${v} hs`}
                      height={220}
                    />
                  </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-3">
                    <CardTitle className="font-heading text-sm font-bold">Tỉ lệ làm đúng theo Part / Section</CardTitle>
                    <CardDescription className="text-xs">
                      Độ chính xác trung bình (Accuracy %) của từng phần thi
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <HBarChart
                      data={analytics.sectionAccuracy.map((s) => ({
                        label: s.label,
                        value: s.accuracy,
                        colorVar: `var(--chart-${s.skill === "listening" ? 1 : s.skill === "reading" ? 2 : 3})`,
                      }))}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 Hardest Questions Table */}
              <Card className="border-border shadow-xs">
                <CardHeader className="border-b border-border pb-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="font-heading text-sm font-bold">
                        Top 10 câu khó nhất (Ưu tiên chữa bài)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Những câu có tỉ lệ sai cao nhất toàn bộ bài thi kèm đáp án chuẩn để giáo viên chữa bài trọng tâm
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit font-mono text-[11px]">
                      {Math.min(10, analytics.hardestQuestions.length)} câu tiêu biểu
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Nội dung câu hỏi</TableHead>
                        <TableHead className="w-36">Kỹ năng & Phần</TableHead>
                        <TableHead className="w-32 text-center">Tỉ lệ sai</TableHead>
                        <TableHead className="min-w-44">Đáp án chuẩn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.hardestQuestions.slice(0, 10).map((q, i) => {
                        const wrongRate = 100 - q.accuracy
                        return (
                          <TableRow key={q.questionId}>
                            <TableCell className="text-center font-mono text-xs font-semibold text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="line-clamp-2 text-xs font-medium text-foreground">
                                <RichText text={q.prompt} />
                              </p>
                              <span className="font-mono text-[10px] text-muted-foreground">ID: {q.questionId}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit text-[10px] font-normal">
                                  {SKILL_LABEL[q.skill]}
                                </Badge>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {q.skill === "reading" ? `Passage ${q.part}` : `Part ${q.part}`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                  "font-mono text-xs font-bold",
                                  wrongRate >= 60 ? "text-destructive" : wrongRate >= 45 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                                )}>
                                  {wrongRate}%
                                </span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      wrongRate >= 60 ? "bg-destructive" : wrongRate >= 45 ? "bg-amber-500" : "bg-primary"
                                    )}
                                    style={{ width: `${wrongRate}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {q.acceptedAnswer ? (
                                <code className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground">
                                  {q.acceptedAnswer}
                                </code>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} initialExamId={examId} />

      <DeleteExamDialog
        exam={
          exam
            ? {
                id: examId,
                title: exam.title,
                status: exam.status,
                kind: exam.kind,
                hasAttempts: exam.hasAttempts,
                hasAssignments: exam.hasAssignments,
              }
            : null
        }
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={handleDelete}
        entityLabel={exam.kind === "practice" ? "bài luyện tập" : "đề thi"}
      />
    </div>
  )
}
