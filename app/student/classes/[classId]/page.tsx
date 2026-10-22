"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { SubmissionStatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Award01Icon,
  Book02Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Logout01Icon,
  PlayIcon,
  SchoolIcon,
  Timer01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { useClassDetailQuery, useLeaveClassMutation } from "@/hooks/use-classes"
import { useMyAssignmentsQuery } from "@/hooks/use-assignments"
import { useAuthStore } from "@/stores/auth.store"
import { ApiError } from "@/lib/api/client"
import type { ClassDetail, MyAssignment } from "@/lib/api/types"

export default function StudentClassDetailPage() {
  const params = useParams<{ classId: string }>()
  const classId = params.classId

  return <RealClassDetail classId={classId} />
}

// ─── REAL ────────────────────────────────────────────────────────────────────
function RealClassDetail({ classId }: { classId: string }) {
  const classQuery = useClassDetailQuery(classId)
  const assignmentsQuery = useMyAssignmentsQuery({ classId })

  const isLoading = classQuery.isLoading || assignmentsQuery.isLoading
  const isError =
    classQuery.isError || assignmentsQuery.isError
      ? (classQuery.error ?? assignmentsQuery.error)
      : null

  if (isLoading) {
    return <ClassDetailLoading />
  }

  if (isError || !classQuery.data) {
    const message =
      isError instanceof ApiError
        ? isError.message
        : "Không tải được thông tin lớp học."
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Tổng quan", href: "/student" },
            { label: "Lớp học", href: "/student/classes" },
            { label: "Chi tiết lớp" },
          ]}
          title="Chi tiết lớp học"
        />
        <EmptyState
          icon={SchoolIcon}
          title="Không tải được lớp học"
          description={message}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  classQuery.refetch()
                  assignmentsQuery.refetch()
                }}
                className="font-semibold"
              >
                Thử lại
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/student/classes">Về danh sách lớp</Link>
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const classDetail = classQuery.data
  // REQ-001: backend lọc bài tập theo classId (?classId=), không còn lọc theo className.
  const classAssignments = assignmentsQuery.data ?? []

  return <ClassDetailView classDetail={classDetail} classAssignments={classAssignments} />
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function ClassDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

// ─── Shared View ─────────────────────────────────────────────────────────────
function ClassDetailView({
  classDetail,
  classAssignments,
}: {
  classDetail: ClassDetail
  classAssignments: MyAssignment[]
}) {
  const { user } = useAuthStore()
  const router = useRouter()
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("assignments"))
  const [filterStatus, setFilterStatus] = useQueryState("status", parseAsString.withDefault("all"))
  const [copiedCode, setCopiedCode] = React.useState(false)
  const [isLeaveOpen, setIsLeaveOpen] = React.useState(false)
  const leaveMutation = useLeaveClassMutation(classDetail.id)

  const handleLeaveClass = async () => {
    try {
      await leaveMutation.mutateAsync()
      toast.success("Đã rời lớp học", {
        description: `Bạn không còn là thành viên của lớp "${classDetail.name}".`,
      })
      setIsLeaveOpen(false)
      router.push("/student/classes")
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Không thể rời lớp. Thử lại sau."
      toast.error("Rời lớp thất bại", { description: message })
    }
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(classDetail.code)
    setCopiedCode(true)
    toast.success(`Đã sao chép mã lớp "${classDetail.code}"!`)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const completedCount = classAssignments.filter((a) => a.submissionStatus === "submitted").length
  const inProgressCount = classAssignments.filter((a) => a.submissionStatus === "in_progress").length
  const notStartedCount = classAssignments.filter((a) => a.submissionStatus === "not_started").length
  const totalCount = classAssignments.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filteredAssignments = classAssignments.filter((a) => {
    if (filterStatus === "all") return true
    return a.submissionStatus === filterStatus
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/student" },
          { label: "Lớp học", href: "/student/classes" },
          { label: classDetail.name },
        ]}
        title={classDetail.name}
        description={
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {classDetail.teacher?.fullName && (
              <>
                <span className="text-xs text-muted-foreground">
                  Giáo viên: <strong className="text-foreground">{classDetail.teacher.fullName}</strong>
                </span>
                <span className="text-muted-foreground">·</span>
              </>
            )}
            <button
              type="button"
              onClick={copyCode}
              title="Bấm để sao chép mã lớp"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span>Mã: {classDetail.code}</span>
              <HugeiconsIcon
                icon={copiedCode ? CheckmarkCircle02Icon : Copy01Icon}
                size={12}
                className={copiedCode ? "text-emerald-500" : "text-muted-foreground"}
              />
            </button>
            {/* targetBand của lớp chưa có trong model → chưa hiện badge (câu hỏi mở REQ-003) */}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href="/student/classes">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
                <span>Danh sách lớp</span>
              </Link>
            </Button>
            {/* REQ-002: học sinh tự rời lớp (POST /classes/:id/leave) */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setIsLeaveOpen(true)}
            >
              <HugeiconsIcon icon={Logout01Icon} size={15} />
              <span>Rời lớp</span>
            </Button>
          </div>
        }
      />

      {/* Class Highlights Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Tổng số bài tập"
          value={totalCount}
          hint="Đã được giao cho lớp"
          icon={Book02Icon}
        />
        <StatCard
          label="Đã hoàn thành"
          value={`${completedCount}/${totalCount}`}
          hint={`${progressPct}% tỷ lệ hoàn thành`}
          accent
          icon={CheckmarkCircle02Icon}
        />
        <StatCard
          label="Bài đang làm dở"
          value={inProgressCount}
          hint="Cần tiếp tục hoàn thiện"
          icon={Timer01Icon}
        />
        <StatCard
          label="Sĩ số lớp"
          value={`${classDetail.studentsCount} bạn`}
          hint="Cùng luyện tập"
          icon={UserGroupIcon}
        />
      </div>

      {/* Teacher & Overview Banner */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                {(classDetail.teacher?.fullName ?? "GV").slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                    Giáo viên: {classDetail.teacher?.fullName ?? "—"}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    Chủ nhiệm
                  </Badge>
                </div>
                {/* REQ-003 fallback: backend không trả teacher.email → ẩn */}
                <p className="text-xs text-foreground/80 pt-1">
                  {classDetail.description}
                </p>
              </div>
            </div>

            <div className="sm:w-64 space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tiến độ cá nhân:</span>
                <span className="font-mono font-semibold text-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground text-right">
                {completedCount} bài đã nộp · {notStartedCount + inProgressCount} bài cần làm
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Workspace */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="assignments" className="gap-2 text-xs">
              <HugeiconsIcon icon={Book02Icon} size={14} />
              <span>Bài tập & Đề thi ({classAssignments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2 text-xs">
              <HugeiconsIcon icon={UserGroupIcon} size={14} />
              <span>Thành viên ({classDetail.students.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick status filters for assignments */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: "Tất cả" },
              { id: "not_started", label: `Cần làm (${notStartedCount})` },
              { id: "in_progress", label: `Đang làm (${inProgressCount})` },
              { id: "submitted", label: `Đã nộp (${completedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterStatus === f.id
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Assignments */}
        <TabsContent value="assignments" className="space-y-4 m-0">
          {filteredAssignments.length === 0 ? (
            <EmptyState
              icon={Book02Icon}
              title="Không có bài tập nào"
              description="Hiện chưa có bài tập nào thuộc trạng thái này trong lớp học."
            />
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
              {filteredAssignments.map((item) => {
                const isSubmitted = item.submissionStatus === "submitted"
                const isInProgress = item.submissionStatus === "in_progress"
                const isNotStarted = item.submissionStatus === "not_started"

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                          {item.examTitle}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0">
                          {item.durationMinutes} phút
                        </Badge>
                        <SubmissionStatusBadge status={item.submissionStatus} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Calendar01Icon} size={13} />
                          Hạn nộp: {item.deadline ? formatDate(item.deadline) : "Không giới hạn"}
                        </span>
                        <span>·</span>
                        <span>Giáo viên giao: {item.teacherName}</span>
                      </div>

                      {/* Display Score Badge if submitted */}
                      {isSubmitted && item.scores && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">Kết quả:</span>
                          {item.scores.listeningBand && (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              L: {item.scores.listeningBand}
                            </Badge>
                          )}
                          {item.scores.readingBand && (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              R: {item.scores.readingBand}
                            </Badge>
                          )}
                          {item.scores.writingBand && (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              W: {item.scores.writingBand}
                            </Badge>
                          )}
                          <Badge variant="default" className="font-mono text-[11px] font-bold">
                            Overall: {item.scores.overallBand}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="sm:shrink-0">
                      {isNotStarted && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full sm:w-auto gap-2 font-semibold text-xs"
                          asChild
                        >
                          <Link href={`/exam/start/${item.id}`}>
                            <HugeiconsIcon icon={PlayIcon} size={15} />
                            <span>Bắt đầu làm bài</span>
                          </Link>
                        </Button>
                      )}

                      {isInProgress && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full sm:w-auto gap-2 font-semibold text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          asChild
                        >
                          <Link href={`/exam/${item.attemptId || "att-in-progress-03"}`}>
                            <HugeiconsIcon icon={Timer01Icon} size={15} />
                            <span>Tiếp tục làm bài</span>
                          </Link>
                        </Button>
                      )}

                      {isSubmitted && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto gap-1.5 font-medium text-xs"
                          asChild
                        >
                          <Link href={`/student/results/${item.attemptId || "att-101"}`}>
                            <HugeiconsIcon icon={Award01Icon} size={14} />
                            <span>Xem bài giải chi tiết</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Class Members */}
        <TabsContent value="members" className="m-0">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Học sinh</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-center text-xs w-32">Mục tiêu (Band)</TableHead>
                  <TableHead className="text-right text-xs w-28">Vai trò</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classDetail.students.map((student) => {
                  const isMe = !!user && student.id === user.id
                  return (
                    <TableRow key={student.id} className={isMe ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium text-xs sm:text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground">
                            {student.fullName.slice(0, 1)}
                          </div>
                          <span>{student.fullName}</span>
                          {isMe && (
                            <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4.5">
                              Bạn
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {student.email}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                        {student.targetBand ? `Band ${student.targetBand}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {isMe ? "Thành viên" : "Học viên"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* REQ-002: xác nhận rời lớp */}
      <Dialog
        open={isLeaveOpen}
        onOpenChange={(open) => {
          if (!leaveMutation.isPending) setIsLeaveOpen(open)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">
              Rời lớp học?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bạn sẽ không còn thấy bài tập của lớp “{classDetail.name}”. Muốn tham gia lại, hãy
              dùng mã lớp {classDetail.code}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveOpen(false)}
              disabled={leaveMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLeaveClass}
              disabled={leaveMutation.isPending}
            >
              <span>{leaveMutation.isPending ? "Đang rời lớp…" : "Rời lớp"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
