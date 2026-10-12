"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { BandBadge } from "@/components/shared/band-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  AssignmentStatusBadge,
  SubmissionStatusBadge,
  SuspiciousBadge,
  WritingPendingBadge,
} from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Alert02Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Download01Icon,
  Refresh01Icon,
  Timer01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatBand, formatDate, formatDuration } from "@/lib/format"
import { ApiError } from "@/lib/api/client"
import { USE_MOCKS } from "@/lib/api/config"
import {
  useAssignmentProgressQuery,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
} from "@/hooks/use-assignments"
import { exportAssignmentCsvApi } from "@/lib/api/assignments"
import type { SubmissionStatus } from "@/lib/api/types"
import { DEMO_ASSIGNMENT_PROGRESS } from "@/mocks/demo-data"

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "submitted", label: "Đã nộp" },
  { value: "in_progress", label: "Đang làm" },
  { value: "not_started", label: "Chưa làm" },
]

export default function AssignmentProgressPage() {
  const params = useParams<{ id: string }>()
  const assignmentId = params.id

  const [filter, setFilter] = useQueryState("status", parseAsString.withDefault("all"))
  // 0 nghĩa là chưa hydrate đồng hồ; interval cập nhật mỗi giây (callback hợp lệ trong effect)
  const [now, setNow] = React.useState(0)

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Data ──────────────────────────────────────────────────────────────────
  const progressQuery = useAssignmentProgressQuery(assignmentId, !USE_MOCKS)
  const progress = USE_MOCKS ? DEMO_ASSIGNMENT_PROGRESS : progressQuery.data

  // ── Mutations & actions ───────────────────────────────────────────────────
  const updateMutation = useUpdateAssignmentMutation(assignmentId)
  const deleteMutation = useDeleteAssignmentMutation()
  const [extendOpen, setExtendOpen] = React.useState(false)
  const [extendDeadline, setExtendDeadline] = React.useState("")
  const [archiveConfirm, setArchiveConfirm] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState(false)
  const [deleteBlocked, setDeleteBlocked] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  const isLoading = !USE_MOCKS && progressQuery.isLoading
  const isError = !USE_MOCKS && progressQuery.isError

  const exportCsv = async () => {
    if (!progress) return
    if (USE_MOCKS) {
      toast.success("Đã xuất file CSV tiến độ")
      return
    }
    setExporting(true)
    try {
      await exportAssignmentCsvApi(assignmentId, `${progress.examTitle}-progress.csv`)
      toast.success("Đã xuất file CSV tiến độ")
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error("Không thể xuất CSV. Vui lòng thử lại.")
    } finally {
      setExporting(false)
    }
  }

  const openExtend = () => {
    const base = progress?.deadline ? new Date(progress.deadline) : new Date()
    base.setDate(base.getDate() + 7)
    const pad = (n: number) => String(n).padStart(2, "0")
    setExtendDeadline(
      `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`
    )
    setExtendOpen(true)
  }

  const handleExtend = async () => {
    if (!extendDeadline) return
    const iso = new Date(extendDeadline).toISOString()
    if (USE_MOCKS) {
      toast.success("Đã gia hạn deadline")
      setExtendOpen(false)
      return
    }
    try {
      await updateMutation.mutateAsync({ deadline: iso })
      toast.success("Đã gia hạn deadline")
      setExtendOpen(false)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error("Không thể gia hạn. Vui lòng thử lại.")
    }
  }

  const handleArchive = async () => {
    if (USE_MOCKS) {
      toast.success("Đã lưu trữ đợt giao bài")
      setArchiveConfirm(false)
      return
    }
    try {
      await updateMutation.mutateAsync({ status: "archived" })
      toast.success("Đã lưu trữ đợt giao bài")
      setArchiveConfirm(false)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error("Không thể lưu trữ. Vui lòng thử lại.")
    }
  }

  const handleDelete = async () => {
    if (USE_MOCKS) {
      toast.success("Đã xoá đợt giao bài")
      setDeleteConfirm(false)
      return
    }
    try {
      await deleteMutation.mutateAsync(assignmentId)
      toast.success("Đã xoá đợt giao bài")
      setDeleteConfirm(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === "ASSIGNMENT_HAS_ACTIVE_ATTEMPTS") {
        setDeleteConfirm(false)
        setDeleteBlocked(true)
      } else if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể xoá. Vui lòng thử lại.")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (isError || !progress) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Tổng quan", href: "/teacher" },
            { label: "Đợt giao bài", href: "/teacher/assignments" },
            { label: "Tiến độ" },
          ]}
          title="Tiến độ đợt giao bài"
        />
        <EmptyState
          icon={Alert02Icon}
          title="Không thể tải tiến độ đợt giao"
          description={
            progressQuery.error instanceof ApiError
              ? progressQuery.error.message
              : "Đợt giao không tồn tại hoặc bạn không có quyền truy cập."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => progressQuery.refetch()}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={15} />
              Thử lại
            </Button>
          }
        />
      </div>
    )
  }

  const students = progress.students
  const submitted = students.filter((s) => s.status === "submitted").length
  const inProgress = students.filter((s) => s.status === "in_progress").length
  const notStarted = students.filter((s) => s.status === "not_started").length
  const total = students.length
  const pct = total ? Math.round((submitted / total) * 100) : 0

  const filtered = students.filter((s) => filter === "all" || s.status === filter)

  const deadline = progress.deadline ? new Date(progress.deadline).getTime() : null
  const remaining = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : null
  const overdue = deadline !== null && deadline < now

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Đợt giao bài", href: "/teacher/assignments" },
          { label: progress.examTitle },
        ]}
        title={progress.examTitle}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {progress.className ?? "Học sinh cụ thể"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Số lượt làm tối đa: {progress.maxAttempts}
            </span>
            <AssignmentStatusBadge status={progress.status} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={exporting}>
              <HugeiconsIcon icon={Download01Icon} size={15} />
              {exporting ? "Đang xuất..." : "Xuất CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={openExtend}>
              Gia hạn
            </Button>
            {progress.status === "active" ? (
              <Button variant="outline" size="sm" onClick={() => setArchiveConfirm(true)}>
                Lưu trữ
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              Xoá
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Đã nộp"
          value={`${submitted}/${total}`}
          icon={CheckmarkCircle02Icon}
          accent
          hint={`${pct}% hoàn thành`}
        />
        <StatCard label="Đang làm" value={inProgress} icon={Timer01Icon} hint="Học sinh đang thi" />
        <StatCard label="Chưa làm" value={notStarted} icon={UserIcon} hint="Chưa bắt đầu" />
        <StatCard label="Band TB" value={formatBand(progress.averageBand)} icon={CheckmarkCircle02Icon} hint="Điểm Overall trung bình" />
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-heading text-sm font-bold">Tiến độ tổng thể</CardTitle>
              <CardDescription className="text-xs">
                {submitted}/{total} học sinh đã hoàn thành bài
              </CardDescription>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-sm font-bold",
                overdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              )}
            >
              <HugeiconsIcon icon={overdue ? Alert02Icon : Clock01Icon} size={16} />
              {overdue
                ? "Đã quá hạn"
                : remaining !== null
                  ? `Còn ${formatDuration(remaining)}`
                  : "Không giới hạn"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          <Progress value={pct} className="h-2.5" />
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Calendar01Icon} size={13} /> Hạn nộp:{" "}
              {progress.deadline ? formatDate(progress.deadline) : "Không giới hạn"}
            </span>
          </div>
        </CardContent>
      </Card>

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
          </button>
        ))}
      </div>

      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học sinh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center font-mono">L</TableHead>
                <TableHead className="text-center font-mono">R</TableHead>
                <TableHead className="text-center font-mono">W</TableHead>
                <TableHead className="text-center font-mono">Overall</TableHead>
                <TableHead>Nộp lúc</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Không có học sinh ở trạng thái này.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.studentId || s.studentEmail}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.studentName}</span>
                        {s.needsCheck && <SuspiciousBadge />}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{s.studentEmail}</span>
                    </TableCell>
                    <TableCell>
                      <SubmissionStatusBadge status={s.status as SubmissionStatus} />
                    </TableCell>
                    <TableCell className="text-center">
                      <BandBadge value={s.listening} skill="listening" size="sm" />
                    </TableCell>
                    <TableCell className="text-center">
                      <BandBadge value={s.reading} skill="reading" size="sm" />
                    </TableCell>
                    <TableCell className="text-center">
                      <BandBadge value={s.writing} skill="writing" size="sm" />
                    </TableCell>
                    <TableCell className="text-center">
                      <BandBadge value={s.overall} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.submittedAt ? formatDate(s.submittedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {/*
                        G2: API /assignments/:id/progress không trả attemptId →
                        ẩn "Xem bài" / "Chấm Writing" khi không có attemptId,
                        hướng dẫn dùng tab Bài nộp.
                      */}
                      {s.status === "submitted" ? (
                        s.attemptId ? (
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                              <Link href={`/teacher/submissions/${s.attemptId}`}>Xem bài</Link>
                            </Button>
                            {s.writing == null && (
                              <Button size="sm" className="h-7 text-xs font-semibold" asChild>
                                <Link href={`/teacher/grading/${s.attemptId}`}>Chấm Writing</Link>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Xem bài làm tại trang Bài nộp"
                          >
                            —
                          </span>
                        )
                      ) : s.status === "in_progress" ? (
                        <WritingPendingBadge className="ml-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Gia hạn */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold">Gia hạn deadline</DialogTitle>
            <DialogDescription className="text-xs">
              Chọn thời hạn mới cho đợt giao <strong>{progress.examTitle}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">Hạn nộp mới</Label>
            <Input
              type="datetime-local"
              value={extendDeadline}
              onChange={(e) => setExtendDeadline(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setExtendOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" className="font-semibold" onClick={handleExtend} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Đang lưu..." : "Gia hạn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Lưu trữ */}
      <Dialog open={archiveConfirm} onOpenChange={setArchiveConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Lưu trữ đợt giao bài?</DialogTitle>
            <DialogDescription className="text-xs">
              Đợt giao sẽ chuyển sang trạng thái Lưu trữ, học sinh không thể bắt đầu lượt làm mới.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setArchiveConfirm(false)}>
              Hủy
            </Button>
            <Button size="sm" className="font-semibold" onClick={handleArchive} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Đang lưu..." : "Lưu trữ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Xoá */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-destructive">
              Xác nhận xoá đợt giao bài
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Bạn có chắc chắn muốn xoá đợt giao{" "}
              <strong className="text-foreground">{progress.examTitle}</strong>? Hành động này không
              thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="font-bold"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xoá..." : "Xoá đợt giao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Xoá bị chặn */}
      <Dialog open={deleteBlocked} onOpenChange={setDeleteBlocked}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              Không thể xoá đợt giao bài
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Đợt giao đang có học sinh làm bài. Vui lòng lưu trữ thay vì xoá.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteBlocked(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
