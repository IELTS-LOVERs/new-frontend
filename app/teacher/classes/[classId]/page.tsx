"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { AssignDialog } from "@/components/shared/assign-dialog"
import {
  BarChart,
  RadarChart,
  DonutChart,
  RadialProgressChart,
  AreaChart,
} from "@/components/shared/charts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Analytics01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download04Icon,
  Link01Icon,
  MoreHorizontalIcon,
  Refresh01Icon,
  SchoolIcon,
  Task01Icon,
  UserAdd01Icon,
  UserIcon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { SKILL_LABEL, formatBand, formatDateShort } from "@/lib/format"
import { ApiError } from "@/lib/api/client"
import { USE_MOCKS } from "@/lib/api/config"
import {
  useClassDetailQuery,
  useAddStudentMutation,
  useRemoveStudentMutation,
} from "@/hooks/use-classes"
import { useTeacherAssignmentsQuery } from "@/hooks/use-assignments"
import { useClassAnalyticsQuery, useStudentProgressQuery } from "@/hooks/use-analytics"
import type { ClassRosterStudent, SkillType } from "@/lib/api/types"
import {
  DEMO_ASSIGNMENTS,
  DEMO_CLASSES,
  DEMO_CLASS_ANALYTICS,
  DEMO_CLASS_ROSTERS,
  DEMO_STUDENT_ANALYTICS,
} from "@/mocks/demo-data"

const SKILL_BANDS: Array<{ key: "listening" | "reading" | "writing"; label: string }> = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
]

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>()
  const classId = params.classId
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("students"))

  // ── Data sources ──────────────────────────────────────────────────────────
  const classQuery = useClassDetailQuery(classId, !USE_MOCKS)
  const analyticsQuery = useClassAnalyticsQuery(classId, !USE_MOCKS)
  // G3: không có stats tiến độ trong GET /assignments → tab Bài tập ẩn cột tiến độ
  const assignmentsQuery = useTeacherAssignmentsQuery({ classId }, !USE_MOCKS)

  const klass = USE_MOCKS
    ? (DEMO_CLASSES.find((c) => c.id === classId) ?? DEMO_CLASSES[0])
    : classQuery.data

  // Merge roster + analytics
  const roster: ClassRosterStudent[] = React.useMemo(() => {
    if (USE_MOCKS) {
      return DEMO_CLASS_ROSTERS[classId] ?? DEMO_CLASS_ROSTERS["c-1"]
    }
    const students = classQuery.data?.students ?? []
    // API /api/analytics/classes/:id trả về students[] chứa attempts/listening/... theo audit;
    // nếu backend chưa trả về, fallback về danh sách rỗng (chỉ dùng averages).
    const analyticsStudents =
      ((analyticsQuery.data as unknown as {
        students?: Array<{
          student: { id: string }
          attempts?: number
          listening?: number | null
          reading?: number | null
          writing?: number | null
          overall?: number | null
        }>
      })?.students ?? [])
    const byId = new Map(analyticsStudents.map((s) => [s.student.id, s]))
    return students.map((s) => {
      const stats = byId.get(s.id)
      return {
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        targetBand: s.targetBand ?? null,
        attemptsCount: stats?.attempts ?? 0,
        listening: stats?.listening ?? null,
        reading: stats?.reading ?? null,
        writing: stats?.writing ?? null,
        overall: stats?.overall ?? null,
      }
    })
  }, [classQuery.data, analyticsQuery.data, classId])

  const analytics = USE_MOCKS
    ? (DEMO_CLASS_ANALYTICS[classId] ?? DEMO_CLASS_ANALYTICS["c-1"])
    : {
        classId: analyticsQuery.data?.classId ?? classId,
        className: analyticsQuery.data?.className ?? klass?.name ?? "",
        studentsCount: analyticsQuery.data?.studentsCount ?? roster.length,
        average: analyticsQuery.data?.average ?? {},
        needSupport: analyticsQuery.data?.needSupport ?? [],
      }

  const assignments = USE_MOCKS
    ? DEMO_ASSIGNMENTS.filter((a) => a.classId === classId)
    : (assignmentsQuery.data?.items ?? [])

  const isLoading = !USE_MOCKS && classQuery.isLoading
  const isError = !USE_MOCKS && classQuery.isError

  // ── UI state ──────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = React.useState(false)
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [assignTarget, setAssignTarget] = React.useState<string | undefined>(undefined)
  const [progressStudent, setProgressStudent] = React.useState<ClassRosterStudent | null>(null)
  const [removeTarget, setRemoveTarget] = React.useState<ClassRosterStudent | null>(null)

  const removeMutation = useRemoveStudentMutation(classId)

  const copy = (text: string, message: string) => {
    navigator.clipboard?.writeText(text)
    toast.success(message)
  }

  const inviteText = klass
    ? `Tham gia lớp ${klass.name} trên IELTS LOVERs: https://ieltslovers.app/register?code=${klass.code} (mã lớp: ${klass.code})`
    : ""

  // CSV Export logic (client-side từ data đã có)
  const handleExportCSV = () => {
    if (!klass) return
    const headers = [
      "Họ và tên",
      "Email",
      "Target Band",
      "Lượt làm bài",
      "Listening Band",
      "Reading Band",
      "Writing Band",
      "Overall Band",
    ]
    const rows = roster.map((s) => [
      `"${s.fullName}"`,
      `"${s.email}"`,
      s.targetBand ?? "",
      s.attemptsCount ?? 0,
      s.listening ?? "",
      s.reading ?? "",
      s.writing ?? "",
      s.overall ?? "",
    ])
    const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `bang-diem-${klass.name.toLowerCase().replace(/\s+/g, "-")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Đã xuất bảng điểm lớp học ra file CSV!")
  }

  const ranking = [...roster].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))

  // Radar data for average class skill strengths
  const radarData = [
    { label: "Listening", value: analytics.average.listening ?? 0, max: 9 },
    { label: "Reading", value: analytics.average.reading ?? 0, max: 9 },
    { label: "Writing", value: analytics.average.writing ?? 0, max: 9 },
    { label: "Overall", value: analytics.average.overall ?? 0, max: 9 },
  ]

  // Distribution by band brackets
  const bandDistributionData = [
    { label: "< 5.0", value: roster.filter((s) => (s.overall ?? 0) < 5.0).length, colorVar: "var(--chart-1)" },
    { label: "5.0–6.0", value: roster.filter((s) => (s.overall ?? 0) >= 5.0 && (s.overall ?? 0) <= 6.0).length, colorVar: "var(--chart-2)" },
    { label: "6.5–7.0", value: roster.filter((s) => (s.overall ?? 0) >= 6.5 && (s.overall ?? 0) <= 7.0).length, colorVar: "var(--chart-3)" },
    { label: "7.5+", value: roster.filter((s) => (s.overall ?? 0) >= 7.5).length, colorVar: "var(--chart-4)" },
  ]

  // Target achievement stats
  const achievedTargetCount = roster.filter((s) => (s.overall ?? 0) >= (s.targetBand ?? 6.5)).length
  const belowTargetCount = roster.length - achievedTargetCount
  const targetDonutData = [
    { label: "Đạt mục tiêu", value: achievedTargetCount, colorVar: "var(--primary)" },
    { label: "Dưới mục tiêu", value: belowTargetCount, colorVar: "var(--muted)" },
  ]

  const handleConfirmRemove = async () => {
    if (!removeTarget) return
    if (USE_MOCKS) {
      toast.success(`Đã xoá ${removeTarget.fullName} khỏi lớp`)
      setRemoveTarget(null)
      return
    }
    try {
      await removeMutation.mutateAsync(removeTarget.id)
      toast.success(`Đã xoá ${removeTarget.fullName} khỏi lớp`)
      setRemoveTarget(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể xoá học sinh. Vui lòng thử lại.")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (isError || !klass) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Lớp học", href: "/teacher/classes" },
            { label: "Chi tiết lớp" },
          ]}
          title="Chi tiết lớp học"
        />
        <EmptyState
          icon={SchoolIcon}
          title="Không thể tải thông tin lớp học"
          description={
            classQuery.error instanceof ApiError
              ? classQuery.error.message
              : "Lớp học không tồn tại hoặc bạn không có quyền truy cập."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => classQuery.refetch()}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={15} />
              Thử lại
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Lớp học", href: "/teacher/classes" },
          { label: klass.name },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {klass.name}
            <button
              type="button"
              onClick={() => copy(klass.code, `Đã sao chép mã lớp ${klass.code}`)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              title="Bấm để sao chép mã lớp"
            >
              {klass.code}
              <HugeiconsIcon icon={Copy01Icon} size={13} className="text-muted-foreground" />
            </button>
          </span>
        }
        description={klass.description}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={handleExportCSV}
              title="Tải bảng điểm của lớp học định dạng CSV"
            >
              <HugeiconsIcon icon={Download04Icon} size={14} /> Xuất bảng điểm CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => copy(inviteText, "Đã sao chép lời mời tham gia lớp")}
            >
              <HugeiconsIcon icon={Link01Icon} size={14} /> Copy lời mời
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium" onClick={() => setAddOpen(true)}>
              <HugeiconsIcon icon={UserAdd01Icon} size={14} /> Thêm học sinh
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
              onClick={() => {
                setAssignTarget(undefined)
                setAssignOpen(true)
              }}
            >
              <HugeiconsIcon icon={Task01Icon} size={14} /> Giao bài cho lớp
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Sĩ số" value={roster.length} icon={UserIcon} hint="Học sinh trong lớp" />
        {SKILL_BANDS.slice(0, 2).map((s) => (
          <StatCard
            key={s.key}
            label={s.label}
            value={formatBand(analytics.average[s.key])}
            icon={Analytics01Icon}
            hint="Band trung bình"
          />
        ))}
        <StatCard
          label="Overall TB"
          value={formatBand(analytics.average.overall)}
          icon={SchoolIcon}
          accent
          hint="Điểm trung bình cả lớp"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v)} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="students" className="text-xs">
            Học sinh ({roster.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">
            Bài tập ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            Thống kê lớp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {roster.length === 0 ? (
            <EmptyState
              icon={UserAdd01Icon}
              title="Lớp chưa có học sinh"
              description="Mời học sinh bằng mã lớp hoặc thêm trực tiếp qua danh sách email."
              action={
                <Button className="gap-2" onClick={() => setAddOpen(true)}>
                  <HugeiconsIcon icon={UserAdd01Icon} size={16} /> Thêm học sinh
                </Button>
              }
            />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Học sinh</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-center font-mono text-xs w-20">Target</TableHead>
                    <TableHead className="text-center font-mono text-xs w-16">L</TableHead>
                    <TableHead className="text-center font-mono text-xs w-16">R</TableHead>
                    <TableHead className="text-center font-mono text-xs w-16">W</TableHead>
                    <TableHead className="text-center font-mono text-xs w-20">Overall</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((student) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setProgressStudent(student)}
                    >
                      <TableCell>
                        <span className="font-medium text-xs sm:text-sm text-foreground">
                          {student.fullName}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {student.email}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatBand(student.targetBand)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-medium">
                        {formatBand(student.listening)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-medium">
                        {formatBand(student.reading)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-medium">
                        {formatBand(student.writing)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                        {formatBand(student.overall)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setProgressStudent(student)}>
                              <HugeiconsIcon icon={Analytics01Icon} size={14} /> Xem tiến độ
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAssignTarget(student.id)
                                setAssignOpen(true)
                              }}
                            >
                              <HugeiconsIcon icon={Task01Icon} size={14} /> Giao bài riêng
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setRemoveTarget(student)}
                            >
                              <HugeiconsIcon icon={UserRemove01Icon} size={14} /> Xoá khỏi lớp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3">
          {!USE_MOCKS && assignmentsQuery.isLoading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={Task01Icon}
              title="Chưa có bài tập nào"
              description="Giao bài thi đầu tiên cho lớp học này."
              action={
                <Button className="gap-2" onClick={() => setAssignOpen(true)}>
                  <HugeiconsIcon icon={Task01Icon} size={16} /> Giao bài ngay
                </Button>
              }
            />
          ) : (
            assignments.map((a) => {
              // G3: GET /assignments không có stats → ẩn cột tiến độ khi không có dữ liệu
              const hasStats = a.stats && a.stats.assigned > 0
              const pct = hasStats ? Math.round((a.stats.submitted / a.stats.assigned) * 100) : 0
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm text-foreground">{a.examTitle}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{a.skills?.map((s) => SKILL_LABEL[s]).join(" · ")}</span>
                      <span>·</span>
                      <span>{a.deadline ? `Hạn ${formatDateShort(a.deadline)}` : "Không giới hạn"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Đã nộp</span>
                        <span className="font-mono">
                          {hasStats ? `${a.stats.submitted}/${a.stats.assigned}` : "—"}
                        </span>
                      </div>
                      {hasStats ? (
                        <Progress value={pct} className="h-1.5" />
                      ) : (
                        <div className="h-1.5 rounded-full bg-muted" title="Chưa có thống kê tiến độ" />
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-medium" asChild>
                      <Link href={`/teacher/assignments/${a.id}`}>Xem tiến độ</Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Tab Analytics: Contextual Class Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {!USE_MOCKS && analyticsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Radar Chart: Đánh giá 4 kỹ năng */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div>
                  <h4 className="font-heading font-semibold text-sm text-foreground">
                    Đánh giá 4 kỹ năng
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Điểm trung bình từng kỹ năng của lớp
                  </p>
                </div>
                <div className="py-2 flex justify-center">
                  <RadarChart data={radarData} size={220} />
                </div>
              </div>

              {/* 2. Bar Chart: Phân bố điểm Overall */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div>
                  <h4 className="font-heading font-semibold text-sm text-foreground">
                    Phân bố điểm Overall
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Số lượng học sinh theo từng dải điểm
                  </p>
                </div>
                <div className="pt-4">
                  <BarChart
                    data={bandDistributionData}
                    formatter={(v) => `${v} HS`}
                    height={150}
                  />
                </div>
              </div>

              {/* 3. Donut Chart: Tỷ lệ đạt mục tiêu */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div>
                  <h4 className="font-heading font-semibold text-sm text-foreground">
                    Tỷ lệ đạt mục tiêu (Target)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    So với Target Band từng học sinh
                  </p>
                </div>
                <div className="py-2">
                  <DonutChart
                    data={targetDonutData}
                    centerValue={`${achievedTargetCount}/${roster.length}`}
                    centerLabel="Đạt Target"
                    size={160}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ranking & Leaderboard Table */}
          <div className="space-y-3">
            <div>
              <h4 className="font-heading text-sm sm:text-base font-semibold text-foreground">
                Bảng xếp hạng năng lực học sinh
              </h4>
              <p className="text-xs text-muted-foreground">
                Sắp xếp theo thứ tự điểm Overall từ cao xuống thấp
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs">#</TableHead>
                    <TableHead className="text-xs">Học sinh</TableHead>
                    <TableHead className="text-center font-mono text-xs w-24">Listening</TableHead>
                    <TableHead className="text-center font-mono text-xs w-24">Reading</TableHead>
                    <TableHead className="text-center font-mono text-xs w-24">Writing</TableHead>
                    <TableHead className="text-center font-mono text-xs w-24">Overall</TableHead>
                    <TableHead className="text-center font-mono text-xs w-24">Mục tiêu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((s, i) => (
                    <TableRow key={s.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm text-foreground">{s.fullName}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-medium">{formatBand(s.listening)}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-medium">{formatBand(s.reading)}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-medium">{formatBand(s.writing)}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                        {formatBand(s.overall)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          Target {formatBand(s.targetBand)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AddStudentsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        classId={classId}
      />

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        initialClassId={classId}
        initialStudentId={assignTarget}
      />

      {/* Sheet Tiến độ cá nhân học sinh: Radial, Area, Radar Charts */}
      <StudentProgressSheet
        student={progressStudent}
        onClose={() => setProgressStudent(null)}
      />

      <Dialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Xoá học sinh khỏi lớp?</DialogTitle>
            <DialogDescription className="text-xs">
              {removeTarget?.fullName} sẽ không còn thấy bài tập của lớp. Lịch sử làm bài vẫn được giữ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Đang xoá..." : "Xoá khỏi lớp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sheet tiến độ cá nhân ──────────────────────────────────────────────────
function StudentProgressSheet({
  student,
  onClose,
}: {
  student: ClassRosterStudent | null
  onClose: () => void
}) {
  // Gọi API tiến độ học sinh khi không dùng mock
  const progressQuery = useStudentProgressQuery(student?.id, !USE_MOCKS && !!student)
  const points = USE_MOCKS
    ? DEMO_STUDENT_ANALYTICS.points
    : (progressQuery.data?.points ?? [])

  return (
    <Sheet open={!!student} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold">
            {student?.fullName}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Tiến độ luyện tập, phân tích kỹ năng và độ hoàn thành mục tiêu
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-6 pb-8 pt-3">
          {/* 1. Radial Chart: Hoàn thành mục tiêu */}
          <div className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Mức độ đạt mục tiêu
              </span>
              <p className="font-heading font-semibold text-base text-foreground">
                Target Band: {formatBand(student?.targetBand ?? 6.5)}
              </p>
              <p className="text-xs text-muted-foreground">
                Hiện tại: Band {formatBand(student?.overall ?? 0)}
              </p>
            </div>
            <div className="shrink-0">
              <RadialProgressChart
                current={student?.overall ?? 6.0}
                target={student?.targetBand ?? 6.5}
                size={120}
              />
            </div>
          </div>

          {/* 2. Radar Chart: Phân tích 3 kỹ năng L, R, W */}
          <div className="rounded-xl border border-border p-4 bg-card space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Tương quan kỹ năng cá nhân (L, R, W)
            </span>
            <p className="text-xs text-muted-foreground">
              Nhận diện kỹ năng thế mạnh và kỹ năng cần cải thiện
            </p>
            <div className="py-2 flex justify-center">
              <RadarChart
                data={[
                  { label: "Listening", value: student?.listening ?? 0, max: 9 },
                  { label: "Reading", value: student?.reading ?? 0, max: 9 },
                  { label: "Writing", value: student?.writing ?? 0, max: 9 },
                ]}
                size={200}
              />
            </div>
          </div>

          {/* 3. Area Chart: Diễn biến band điểm theo thời gian */}
          <div className="rounded-xl border border-border p-4 bg-card space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Xu hướng điểm số theo thời gian
            </span>
            <div className="pt-2">
              {!USE_MOCKS && progressQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : points.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Chưa có dữ liệu làm bài.
                </p>
              ) : (
                <AreaChart
                  data={points.map((p) => ({
                    label: new Date(p.submittedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
                    value: p.overall ?? 0,
                  }))}
                  height={160}
                />
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Dialog thêm học sinh (G12: gửi tuần tự từng email + hiển thị tiến trình) ─
function AddStudentsDialog({
  open,
  onOpenChange,
  classId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
}) {
  const [raw, setRaw] = React.useState("")
  const [results, setResults] = React.useState<
    Array<{ email: string; status: "added" | "exists" | "invalid" }>
  >([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const addStudentMutation = useAddStudentMutation(classId)

  const handleSubmit = async () => {
    const emails = raw
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      toast.error("Vui lòng nhập ít nhất một email")
      return
    }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (USE_MOCKS) {
      const parsedResults = emails.map((email, i) => {
        if (!valid.test(email)) return { email, status: "invalid" as const }
        if (i % 4 === 3) return { email, status: "exists" as const }
        return { email, status: "added" as const }
      })
      setResults(parsedResults)
      return
    }

    // G12 fallback: gửi tuần tự từng email, cập nhật kết quả theo tiến trình
    setIsSubmitting(true)
    setResults([])
    for (const email of emails) {
      if (!valid.test(email)) {
        setResults((prev) => [...prev, { email, status: "invalid" }])
        continue
      }
      try {
        await addStudentMutation.mutateAsync(email)
        setResults((prev) => [...prev, { email, status: "added" }])
      } catch (err) {
        if (err instanceof ApiError && err.code === "STUDENT_ALREADY_IN_CLASS") {
          setResults((prev) => [...prev, { email, status: "exists" }])
        } else if (err instanceof ApiError && err.code === "NOT_FOUND") {
          setResults((prev) => [...prev, { email, status: "invalid" }])
        } else {
          setResults((prev) => [...prev, { email, status: "invalid" }])
        }
      }
    }
    setIsSubmitting(false)
    toast.success("Đã xử lý xong danh sách email")
  }

  const reset = () => {
    setRaw("")
    setResults([])
    setIsSubmitting(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isSubmitting) return
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Thêm học sinh bằng email</DialogTitle>
          <DialogDescription className="text-xs">
            Nhập nhiều email, cách nhau bởi dấu phẩy hoặc xuống dòng. Hệ thống sẽ thêm từng tài khoản.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Danh sách email</Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"an.nguyen@gmail.com\nminhanh.tran@gmail.com"}
              rows={4}
              className="resize-none text-sm"
              disabled={isSubmitting}
            />
          </div>
          {results.length > 0 && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs">
                  <span className="truncate font-mono text-muted-foreground">{r.email}</span>
                  {r.status === "added" && (
                    <Badge variant="secondary" className="gap-1 text-emerald-600">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} /> Đã thêm
                    </Badge>
                  )}
                  {r.status === "exists" && (
                    <Badge variant="outline" className="gap-1">
                      <HugeiconsIcon icon={Alert02Icon} size={11} /> Đã ở trong lớp
                    </Badge>
                  )}
                  {r.status === "invalid" && (
                    <Badge variant="destructive" className="gap-1">
                      <HugeiconsIcon icon={Alert02Icon} size={11} /> Chưa có tài khoản
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button onClick={handleSubmit} className="gap-2 font-semibold" disabled={isSubmitting}>
            <HugeiconsIcon icon={UserAdd01Icon} size={15} />
            {isSubmitting ? `Đang thêm (${results.length})...` : "Thêm học sinh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
