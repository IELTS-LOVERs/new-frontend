"use client"

import * as React from "react"
import Link from "next/link"
import { parseAsString, parseAsInteger, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { AssignmentStatusBadge } from "@/components/shared/status-badge"
import { AssignDialog } from "@/components/shared/assign-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Calendar01Icon,
  Download01Icon,
  MoreHorizontalIcon,
  Refresh01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { deadlineLabel, formatDateShort, isDeadlineSoon } from "@/lib/format"
import { ApiError } from "@/lib/api/client"
import { useClassesQuery } from "@/hooks/use-classes"
import {
  useTeacherAssignmentsQuery,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
} from "@/hooks/use-assignments"
import { exportAssignmentCsvApi } from "@/lib/api/assignments"
import type { AssignmentSummary } from "@/lib/api/types"

const PAGE_SIZE = 20

export default function TeacherAssignmentsPage() {
  const [classId, setClassId] = useQueryState("classId", parseAsString.withDefault("all"))
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("all"))
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [assignExam, setAssignExam] = React.useState<string | undefined>(undefined)
  // "Bây giờ" để tính quá hạn — cập nhật mỗi phút qua interval (callback hợp lệ trong effect)
  const [now, setNow] = React.useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ── Data sources ──────────────────────────────────────────────────────────
  const classesQuery = useClassesQuery()
  const assignmentsQuery = useTeacherAssignmentsQuery({
    classId: classId === "all" ? undefined : classId,
    page,
    limit: PAGE_SIZE,
  })

  const classes = classesQuery.data ?? []
  const items: AssignmentSummary[] = assignmentsQuery.data?.items ?? []
  const meta = assignmentsQuery.data?.meta

  // Trạng thái lọc client (server không hỗ trợ filter status)
  const filtered = items.filter((a) => {
    if (status !== "all" && a.status !== status) return false
    return true
  })

  const isLoading = assignmentsQuery.isLoading
  const isError = assignmentsQuery.isError

  // ── Mutations & dialogs ───────────────────────────────────────────────────
  const updateMutation = useUpdateAssignmentMutation("")
  const deleteMutation = useDeleteAssignmentMutation()
  const [extendTarget, setExtendTarget] = React.useState<AssignmentSummary | null>(null)
  const [extendDeadline, setExtendDeadline] = React.useState("")
  const [deleteTarget, setDeleteTarget] = React.useState<AssignmentSummary | null>(null)
  const [deleteBlocked, setDeleteBlocked] = React.useState<AssignmentSummary | null>(null)
  const [exportingId, setExportingId] = React.useState<string | null>(null)

  const exportCsv = async (a: AssignmentSummary) => {
    setExportingId(a.id)
    try {
      await exportAssignmentCsvApi(a.id, `${a.examTitle}-progress.csv`)
      toast.success("Đã xuất file CSV tiến độ")
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error("Không thể xuất file CSV. Vui lòng thử lại.")
    } finally {
      setExportingId(null)
    }
  }

  const toggleArchive = async (a: AssignmentSummary) => {
    const next = a.status === "active" ? "archived" : "active"
    try {
      await updateMutation.mutateAsync({ id: a.id, status: next })
      toast.success(next === "archived" ? "Đã lưu trữ đợt giao bài" : "Đã mở lại đợt giao bài")
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error("Không thể cập nhật trạng thái. Vui lòng thử lại.")
    }
  }

  const openExtend = (a: AssignmentSummary) => {
    setExtendTarget(a)
    const base = a.deadline ? new Date(a.deadline) : new Date()
    base.setDate(base.getDate() + 7)
    const pad = (n: number) => String(n).padStart(2, "0")
    setExtendDeadline(
      `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`
    )
  }

  const handleExtend = async () => {
    if (!extendTarget || !extendDeadline) return
    const iso = new Date(extendDeadline).toISOString()
    try {
      await updateMutation.mutateAsync({ id: extendTarget.id, deadline: iso })
      toast.success("Đã gia hạn deadline")
      setExtendTarget(null)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error("Không thể gia hạn. Vui lòng thử lại.")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(`Đã xóa đợt giao "${deleteTarget.examTitle}"`)
      setDeleteTarget(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === "ASSIGNMENT_HAS_ACTIVE_ATTEMPTS") {
        setDeleteBlocked(deleteTarget)
        setDeleteTarget(null)
      } else if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể xóa đợt giao bài. Vui lòng thử lại.")
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Đợt giao bài" },
        ]}
        title="Quản lý Đợt giao bài"
        description="Theo dõi tiến độ nộp bài của học sinh và quản lý thời hạn nộp bài"
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => {
              setAssignExam(undefined)
              setAssignOpen(true)
            }}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} />
            <span>Giao bài mới</span>
          </Button>
        }
      />

      <Card className="border-border shadow-xs">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select
            value={classId}
            onValueChange={(v) => {
              setClassId(v === "all" ? null : v)
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" className="w-52">
              <SelectValue placeholder="Lớp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả lớp</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-full border border-border p-0.5">
            {[
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Đang mở" },
              { value: "archived", label: "Lưu trữ" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value === "all" ? null : s.value)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                  status === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-border shadow-xs p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </Card>
      ) : isError ? (
        <EmptyState
          icon={Task01Icon}
          title="Không thể tải danh sách đợt giao bài"
          description={
            assignmentsQuery.error instanceof ApiError
              ? assignmentsQuery.error.message
              : "Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => assignmentsQuery.refetch()}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={15} />
              Thử lại
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Task01Icon}
          title="Không có đợt giao bài nào"
          description="Giao đề thi cho lớp để bắt đầu theo dõi tiến độ học sinh."
          action={
            <Button className="gap-2" onClick={() => setAssignOpen(true)}>
              <HugeiconsIcon icon={Add01Icon} size={16} /> Giao bài
            </Button>
          }
        />
      ) : (
        <Card className="border-border shadow-xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Đề thi</TableHead>
                  <TableHead>Giao cho</TableHead>
                  <TableHead>Ngày giao</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="w-44">Tiến độ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  // G3: server không trả stats tiến độ → hiện "—"
                  const hasStats = a.stats && a.stats.assigned > 0
                  const pct = hasStats ? Math.round((a.stats.submitted / a.stats.assigned) * 100) : 0
                  const overdue = a.deadline && now > 0 ? new Date(a.deadline).getTime() < now : false
                  const targetLabel = a.targetLabel || a.className || "—"
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-foreground">{a.examTitle}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {targetLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(a.assignedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Calendar01Icon} size={13} className="text-muted-foreground" />
                          <span
                            className={cn(
                              "text-xs",
                              overdue || isDeadlineSoon(a.deadline) ? "font-medium text-destructive" : "text-muted-foreground"
                            )}
                          >
                            {a.deadline ? formatDateShort(a.deadline) : "Không giới hạn"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{deadlineLabel(a.deadline)}</span>
                      </TableCell>
                      <TableCell>
                        {hasStats ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>
                                {a.stats.submitted}/{a.stats.assigned} đã nộp
                              </span>
                              <span className="font-mono">{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground" title="Chưa có thống kê tiến độ">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AssignmentStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/teacher/assignments/${a.id}`}>Xem tiến độ</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openExtend(a)}>
                              Gia hạn
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={exportingId === a.id}
                              onClick={() => exportCsv(a)}
                            >
                              <HugeiconsIcon icon={Download01Icon} size={15} />
                              {exportingId === a.id ? "Đang xuất..." : "Xuất CSV"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleArchive(a)}>
                              {a.status === "active" ? "Lưu trữ" : "Mở lại"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(a)}
                            >
                              Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Server-side pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono">
            Trang {meta.page}/{meta.totalPages} · {meta.total} đợt giao
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} initialExamId={assignExam} initialClassId={classId !== "all" ? classId : undefined} />

      {/* Dialog: Gia hạn */}
      <Dialog open={!!extendTarget} onOpenChange={(open) => !open && setExtendTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold">Gia hạn deadline</DialogTitle>
            <DialogDescription className="text-xs">
              Chọn thời hạn mới cho đợt giao <strong>{extendTarget?.examTitle}</strong>.
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
            <Button variant="outline" size="sm" onClick={() => setExtendTarget(null)}>
              Hủy
            </Button>
            <Button size="sm" className="font-semibold" onClick={handleExtend} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Đang lưu..." : "Gia hạn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Xoá */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-destructive">
              Xác nhận xoá đợt giao bài
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Bạn có chắc chắn muốn xoá đợt giao{" "}
              <strong className="text-foreground">{deleteTarget?.examTitle}</strong>? Hành động này
              không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
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

      {/* Dialog: Xoá bị chặn do còn lượt làm bài */}
      <Dialog open={!!deleteBlocked} onOpenChange={(open) => !open && setDeleteBlocked(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              Không thể xoá đợt giao bài
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Đợt giao <strong className="text-foreground">{deleteBlocked?.examTitle}</strong> đang
              có học sinh làm bài. Vui lòng lưu trữ đợt giao thay vì xoá.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteBlocked(null)}>
              Đóng
            </Button>
            <Button size="sm" className="font-semibold" asChild>
              <Link href={`/teacher/assignments/${deleteBlocked?.id ?? ""}`}>Xem tiến độ</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
