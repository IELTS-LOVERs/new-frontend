"use client"

import * as React from "react"
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { BandBadge } from "@/components/shared/band-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { BarChart, HBarChart, RadarChart, LineChart } from "@/components/shared/charts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Analytics01Icon,
  Award01Icon,
  Book02Icon,
  ChartHistogramIcon,
  RefreshIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { SKILL_LABEL, formatBand } from "@/lib/format"
import type { ClassAnalytics, ClassRosterStudent, ExamAnalytics } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useClassesQuery, useClassDetailQuery } from "@/hooks/use-classes"
import { useExamsQuery } from "@/hooks/use-exams"
import {
  useClassAnalyticsQuery,
  useExamAnalyticsQuery,
  useStudentProgressQuery,
} from "@/hooks/use-analytics"
import type { ExamListItem } from "@/lib/api/types"

const SKILLS: Array<"listening" | "reading" | "writing"> = ["listening", "reading", "writing"]
const VIEWS = ["class", "exam"] as const

function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Không tải được dữ liệu thống kê."
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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

function rosterFromClassDetail(detail: {
  students: Array<{ id: string; email: string; fullName: string; targetBand?: number | null }>
}): ClassRosterStudent[] {
  return detail.students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    email: s.email,
    targetBand: s.targetBand ?? null,
    attemptsCount: 0,
    listening: null,
    reading: null,
    writing: null,
    overall: null,
  }))
}

export default function TeacherAnalyticsPage() {
  const [view, setView] = useQueryState("view", parseAsStringLiteral(VIEWS).withDefault("class"))
  const [id, setId] = useQueryState("id", parseAsString)
  const [progressStudent, setProgressStudent] = React.useState<ClassRosterStudent | null>(null)

  const classesQuery = useClassesQuery()
  const examsQuery = useExamsQuery({ limit: 50 })

  const classes = classesQuery.data ?? []
  const exams: Array<{ id: string; title: string }> = (
    (examsQuery.data?.items ?? []) as ExamListItem[]
  ).map((e) => ({ id: e.id, title: e.title }))

  // Đồng bộ id hợp lệ khi danh sách tải xong / đổi view
  React.useEffect(() => {
    if (view === "class" && classes.length > 0 && !classes.some((c) => c.id === id)) {
      setId(classes[0].id)
    }
    if (view === "exam" && exams.length > 0 && !exams.some((e) => e.id === id)) {
      setId(exams[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, classes.length, exams.length])

  const selectedClassId = view === "class" ? (id ?? classes[0]?.id ?? "") : ""
  const selectedExamId = view === "exam" ? (id ?? exams[0]?.id ?? "") : ""

  const classAnalyticsQuery = useClassAnalyticsQuery(selectedClassId, view === "class")
  const classDetailQuery = useClassDetailQuery(selectedClassId, view === "class")
  const examAnalyticsQuery = useExamAnalyticsQuery(selectedExamId, view === "exam")

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Tổng quan", href: "/teacher" }, { label: "Thống kê" }]}
        title="Thống kê chuyên sâu"
        description="Phân tích kết quả học tập theo lớp hoặc theo từng đề thi."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-full border border-border p-0.5">
              {[
                { value: "class" as const, label: "Theo lớp" },
                { value: "exam" as const, label: "Theo đề" },
              ].map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => {
                    setView(v.value)
                    setId(v.value === "class" ? (classes[0]?.id ?? null) : (exams[0]?.id ?? null))
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                    view === v.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Select value={id ?? ""} onValueChange={setId}>
              <SelectTrigger size="sm" className="w-56">
                <SelectValue placeholder={view === "class" ? "Chọn lớp" : "Chọn đề"} />
              </SelectTrigger>
              <SelectContent>
                {view === "class"
                  ? classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  : exams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {view === "class" ? (
        classesQuery.isLoading || classAnalyticsQuery.isLoading || classDetailQuery.isLoading ? (
          <AnalyticsSkeleton />
        ) : classAnalyticsQuery.isError ? (
          <QueryError error={classAnalyticsQuery.error} onRetry={() => classAnalyticsQuery.refetch()} />
        ) : !classAnalyticsQuery.data ? (
          <EmptyState
            icon={Analytics01Icon}
            title="Chưa có dữ liệu thống kê"
            description="Lớp chưa có bài nộp nào để thống kê."
          />
        ) : (
          <ClassView
            analytics={classAnalyticsQuery.data}
            ranking={rosterFromClassDetail(
              classDetailQuery.data ?? { students: [] }
            ).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))}
            onOpenStudent={setProgressStudent}
          />
        )
      ) : examAnalyticsQuery.isLoading || examsQuery.isLoading ? (
        <AnalyticsSkeleton />
      ) : examAnalyticsQuery.isError ? (
        <QueryError error={examAnalyticsQuery.error} onRetry={() => examAnalyticsQuery.refetch()} />
      ) : !examAnalyticsQuery.data ? (
        <EmptyState
          icon={ChartHistogramIcon}
          title="Chưa có dữ liệu thống kê"
          description="Đề thi chưa có lượt làm nào để thống kê."
        />
      ) : (
        <ExamView data={examAnalyticsQuery.data} />
      )}

      <StudentProgressSheet student={progressStudent} onClose={() => setProgressStudent(null)} />
    </div>
  )
}

function StudentProgressSheet({
  student,
  onClose,
}: {
  student: ClassRosterStudent | null
  onClose: () => void
}) {
  const progressQuery = useStudentProgressQuery(student?.id, !!student)
  const progress = progressQuery.data

  return (
    <Sheet open={!!student} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold">{student?.fullName}</SheetTitle>
          <SheetDescription className="text-xs">Diễn biến band điểm qua các lần làm bài</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-6 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Overall" value={formatBand(student?.overall)} accent />
            <StatCard label="Target" value={formatBand(student?.targetBand)} />
          </div>
          {progressQuery.isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : progressQuery.isError ? (
            <QueryError error={progressQuery.error} onRetry={() => progressQuery.refetch()} />
          ) : !progress || progress.points.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu tiến độ cho học sinh này.
            </p>
          ) : (
            <Card className="border-border shadow-xs">
              <CardContent className="pt-6">
                <LineChart
                  labels={progress.points.map((p) =>
                    new Date(p.submittedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
                  )}
                  target={progress.targetBand}
                  series={[
                    { name: "Overall", colorVar: "var(--chart-4)", points: progress.points.map((p) => p.overall ?? null) },
                    { name: "Listening", colorVar: "var(--chart-1)", points: progress.points.map((p) => p.listening ?? null) },
                    { name: "Reading", colorVar: "var(--chart-2)", points: progress.points.map((p) => p.reading ?? null) },
                    { name: "Writing", colorVar: "var(--chart-3)", points: progress.points.map((p) => p.writing ?? null) },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ClassView({
  analytics,
  ranking,
  onOpenStudent,
}: {
  analytics: ClassAnalytics
  ranking: ClassRosterStudent[]
  onOpenStudent: (student: ClassRosterStudent) => void
}) {
  const skillData = SKILLS.map((s) => ({
    label: SKILL_LABEL[s],
    value: analytics.average[s] ?? 0,
    colorVar: `var(--chart-${s === "listening" ? 1 : s === "reading" ? 2 : 3})`,
  }))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Overall TB" value={formatBand(analytics.average.overall)} icon={Award01Icon} accent />
        {SKILLS.map((s) => (
          <StatCard
            key={s}
            label={SKILL_LABEL[s]}
            value={formatBand(analytics.average[s])}
            icon={Analytics01Icon}
            hint="Band trung bình"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-xs">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-heading text-sm font-bold">So sánh kỹ năng</CardTitle>
            <CardDescription className="text-xs">{analytics.className}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pt-6">
            <RadarChart
              data={[...SKILLS, "overall" as const].map((s) => ({
                label: s === "overall" ? "Overall" : SKILL_LABEL[s],
                value: analytics.average[s] ?? 0,
              }))}
              colorVar="var(--chart-1)"
            />
            <BarChart data={skillData} max={9} height={180} />
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-sm font-bold">
              <HugeiconsIcon icon={Alert02Icon} size={15} className="text-amber-600" />
              Học sinh cần hỗ trợ
            </CardTitle>
            <CardDescription className="text-xs">Band Overall thấp hơn mục tiêu lớp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-5">
            {analytics.needSupport.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Không có học sinh nào cần hỗ trợ đặc biệt.
              </p>
            ) : (
              analytics.needSupport.map((s) => (
                <div
                  key={s.studentId}
                  className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">{s.fullName}</span>
                  <BandBadge value={s.overall} size="sm" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="font-heading text-sm font-bold">Bảng điểm học sinh</CardTitle>
          <CardDescription className="text-xs">Sắp xếp theo Overall giảm dần</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học sinh</TableHead>
                <TableHead className="text-center font-mono">L</TableHead>
                <TableHead className="text-center font-mono">R</TableHead>
                <TableHead className="text-center font-mono">W</TableHead>
                <TableHead className="text-center font-mono">Overall</TableHead>
                <TableHead className="text-center font-mono">Target</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                    Lớp chưa có học sinh nào.
                  </TableCell>
                </TableRow>
              ) : (
                ranking.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => onOpenStudent(s)}>
                    <TableCell className="font-medium text-foreground">{s.fullName}</TableCell>
                    <TableCell className="text-center"><BandBadge value={s.listening} skill="listening" size="sm" /></TableCell>
                    <TableCell className="text-center"><BandBadge value={s.reading} skill="reading" size="sm" /></TableCell>
                    <TableCell className="text-center"><BandBadge value={s.writing} skill="writing" size="sm" /></TableCell>
                    <TableCell className="text-center"><BandBadge value={s.overall} size="sm" /></TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{formatBand(s.targetBand)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Xem tiến độ</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}

function ExamView({ data }: { data: ExamAnalytics }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng lượt làm" value={data.attemptCount} icon={UserIcon} hint="Học sinh đã nộp" />
        <StatCard label="Band TB" value={formatBand(data.averageBand)} icon={Award01Icon} accent />
        <StatCard label="Section khó nhất" value={data.hardestQuestions[0]?.accuracy + "%"} icon={Alert02Icon} hint={SKILL_LABEL[data.hardestQuestions[0]?.skill ?? "listening"]} />
        <StatCard label="Kỹ năng" value={new Set(data.sectionAccuracy.map((s) => s.skill)).size} icon={Book02Icon} hint="Số kỹ năng có trong đề" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-xs">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-sm font-bold">
              <HugeiconsIcon icon={ChartHistogramIcon} size={15} className="text-primary" />
              Phân bố band điểm
            </CardTitle>
            <CardDescription className="text-xs">Số lượt làm theo từng band</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <BarChart
              data={data.bandDistribution.map((b) => ({ label: b.band, value: b.count }))}
              formatter={(v) => String(v)}
              height={190}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-heading text-sm font-bold">Tỉ lệ đúng theo section</CardTitle>
            <CardDescription className="text-xs">Phần trăm câu trả lời đúng</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <HBarChart
              data={data.sectionAccuracy.map((s) => ({
                label: s.label,
                value: s.accuracy,
                colorVar: `var(--chart-${s.skill === "listening" ? 1 : s.skill === "reading" ? 2 : 3})`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="font-heading text-sm font-bold">Top 5 câu hỏi khó nhất</CardTitle>
          <CardDescription className="text-xs">Tỉ lệ trả lời đúng thấp nhất</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Câu hỏi</TableHead>
                <TableHead>Kỹ năng</TableHead>
                <TableHead className="text-center">Part</TableHead>
                <TableHead className="text-right">Tỉ lệ đúng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.hardestQuestions.map((q, i) => (
                <TableRow key={q.questionId}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-foreground">{q.prompt}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{SKILL_LABEL[q.skill]}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">{q.part}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn("font-mono text-sm font-bold", q.accuracy < 50 ? "text-destructive" : "text-foreground")}>
                      {q.accuracy}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
