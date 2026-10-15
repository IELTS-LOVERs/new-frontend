"use client"

import * as React from "react"
import Link from "next/link"
import { parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ExamStatusBadge } from "@/components/shared/status-badge"
import { AssignDialog } from "@/components/shared/assign-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Book02Icon,
  Copy01Icon,
  Delete02Icon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  Task01Icon,
  Analytics01Icon,
  LockIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import {
  useExamsQuery,
  useDeleteExamMutation,
  useCloneExamMutation,
  useUnpublishExamMutation,
  useCloseExamMutation,
} from "@/hooks/use-exams"
import {
  deleteExamApi,
  cloneExamApi,
  closeExamApi,
  unpublishExamApi,
} from "@/lib/api/exams"
import { formatDateShort } from "@/lib/format"
import type { ExamSummary } from "@/lib/api/types"
import { DEMO_EXAMS } from "@/mocks/demo-data"

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "closed", label: "Đã đóng" },
] as const

const PAGE_SIZE = 20

function SkillsCell({ exam }: { exam: Partial<ExamSummary> }) {
  if (!exam.skills || exam.skills.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {exam.skills.map((s) => (
        <span
          key={s}
          className="inline-flex items-center rounded-md border border-border px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
        >
          {s}
        </span>
      ))}
    </div>
  )
}

export default function TeacherExamsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("all"))
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))
  const [assignExamId, setAssignExamId] = React.useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false)
  const [isBulkBusy, setIsBulkBusy] = React.useState(false)

  // Clear selections when tab or page changes — adjusted during render instead
  // of via an effect to avoid a cascading re-render.
  const scope = `${status}|${page}`
  const [selectionScope, setSelectionScope] = React.useState(scope)
  if (selectionScope !== scope) {
    setSelectionScope(scope)
    setSelectedIds(new Set())
  }

  const queryParams = React.useMemo(
    () => ({
      status: status !== "all" ? (status as "draft" | "published" | "closed") : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, page]
  )

  const examsQuery = useExamsQuery(queryParams, !USE_MOCKS)
  const deleteMutation = useDeleteExamMutation()
  const cloneMutation = useCloneExamMutation()

  // Với USE_MOCKS, lọc client theo status
  const mockFiltered = React.useMemo(() => {
    if (!USE_MOCKS) return []
    return DEMO_EXAMS.filter((e) => (status === "all" ? true : e.status === status))
  }, [status])

  const items = USE_MOCKS ? mockFiltered : (examsQuery.data?.items ?? [])
  const meta = USE_MOCKS ? undefined : examsQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1

  // Selection calculations
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id))
  const someSelected = items.some((item) => selectedIds.has(item.id)) && !allSelected

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  )
  const selectedDrafts = React.useMemo(
    () => selectedItems.filter((item) => item.status === "draft"),
    [selectedItems]
  )
  const selectedPublished = React.useMemo(
    () => selectedItems.filter((item) => item.status === "published"),
    [selectedItems]
  )

  const handleDelete = async (id: string) => {
    if (USE_MOCKS) {
      toast.success("Đã xoá đề thi (demo)")
      return
    }
    try {
      await deleteMutation.mutateAsync(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success("Đã xoá đề thi")
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_CANNOT_EDIT_PUBLISHED") {
        toast.error("Không thể xoá đề đã xuất bản.")
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể xoá đề. Vui lòng thử lại.")
      }
    }
  }

  const handleClone = async (id: string) => {
    if (USE_MOCKS) {
      toast.success("Đã nhân bản đề thi (demo)")
      return
    }
    try {
      await cloneMutation.mutateAsync(id)
      toast.success("Đã nhân bản đề thi")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể nhân bản đề.")
    }
  }

  // --- Bulk Actions ---
  const handleBulkDeleteConfirm = async () => {
    if (selectedDrafts.length === 0) {
      toast.error("Không có đề nháp nào được chọn để xoá. Các đề đã xuất bản hoặc đóng không thể xoá trực tiếp.")
      setBulkDeleteDialogOpen(false)
      return
    }

    setIsBulkBusy(true)
    if (USE_MOCKS) {
      toast.success(`Đã xoá ${selectedDrafts.length} đề thi (demo)`)
      setSelectedIds(new Set())
      setIsBulkBusy(false)
      setBulkDeleteDialogOpen(false)
      return
    }

    try {
      const results = await Promise.allSettled(
        selectedDrafts.map((d) => deleteExamApi(d.id))
      )
      const successCount = results.filter((r) => r.status === "fulfilled").length
      const failCount = results.length - successCount

      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })

      // Clear deleted IDs from selection
      const deletedIds = new Set(
        selectedDrafts
          .filter((_, idx) => results[idx].status === "fulfilled")
          .map((d) => d.id)
      )
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deletedIds.forEach((id) => next.delete(id))
        return next
      })

      const nonDraftCount = selectedItems.length - selectedDrafts.length

      if (successCount > 0) {
        if (nonDraftCount > 0) {
          toast.info(
            `Đã xoá ${successCount} đề nháp. ${nonDraftCount} đề đã xuất bản/đóng được giữ lại.`,
            { description: failCount > 0 ? `${failCount} đề gặp lỗi khi xoá.` : undefined }
          )
        } else {
          toast.success(`Đã xoá thành công ${successCount} đề thi.`)
        }
      } else {
        toast.error("Không thể xoá các đề thi đã chọn.")
      }
    } finally {
      setIsBulkBusy(false)
      setBulkDeleteDialogOpen(false)
    }
  }

  const handleBulkClone = async () => {
    if (selectedItems.length === 0) return
    setIsBulkBusy(true)

    if (USE_MOCKS) {
      toast.success(`Đã nhân bản ${selectedItems.length} đề thi (demo)`)
      setSelectedIds(new Set())
      setIsBulkBusy(false)
      return
    }

    try {
      const results = await Promise.allSettled(
        selectedItems.map((ex) => cloneExamApi(ex.id))
      )
      const successCount = results.filter((r) => r.status === "fulfilled").length

      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })

      toast.success(`Đã nhân bản ${successCount} đề thi thành công.`)
      setSelectedIds(new Set())
    } catch {
      toast.error("Có lỗi xảy ra khi nhân bản đề thi.")
    } finally {
      setIsBulkBusy(false)
    }
  }

  const handleBulkClose = async () => {
    if (selectedPublished.length === 0) {
      toast.info("Không có đề đã xuất bản nào trong danh sách chọn.")
      return
    }
    setIsBulkBusy(true)

    if (USE_MOCKS) {
      toast.success(`Đã đóng ${selectedPublished.length} đề thi (demo)`)
      setSelectedIds(new Set())
      setIsBulkBusy(false)
      return
    }

    try {
      const results = await Promise.allSettled(
        selectedPublished.map((ex) => closeExamApi(ex.id))
      )
      const successCount = results.filter((r) => r.status === "fulfilled").length

      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })

      toast.success(`Đã đóng ${successCount} đề thi thành công.`)
      setSelectedIds(new Set())
    } catch {
      toast.error("Có lỗi xảy ra khi đóng đề thi.")
    } finally {
      setIsBulkBusy(false)
    }
  }

  const handleBulkUnpublish = async () => {
    if (selectedPublished.length === 0) {
      toast.info("Không có đề đã xuất bản nào trong danh sách chọn.")
      return
    }
    setIsBulkBusy(true)

    if (USE_MOCKS) {
      toast.success(`Đã huỷ xuất bản ${selectedPublished.length} đề thi (demo)`)
      setSelectedIds(new Set())
      setIsBulkBusy(false)
      return
    }

    try {
      const results = await Promise.allSettled(
        selectedPublished.map((ex) => unpublishExamApi(ex.id))
      )
      const successCount = results.filter((r) => r.status === "fulfilled").length
      const failCount = results.length - successCount

      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })

      if (successCount > 0) {
        toast.success(`Đã huỷ xuất bản ${successCount} đề thi, chuyển về nháp.`, {
          description: failCount > 0 ? `${failCount} đề đã có học sinh làm bài không thể huỷ xuất bản.` : undefined,
        })
      } else {
        toast.error("Không thể huỷ xuất bản các đề đã có học sinh nộp bài.")
      }
      setSelectedIds(new Set())
    } catch {
      toast.error("Có lỗi xảy ra khi huỷ xuất bản đề thi.")
    } finally {
      setIsBulkBusy(false)
    }
  }

  const isLoading = !USE_MOCKS && examsQuery.isLoading
  const isError = !USE_MOCKS && examsQuery.isError

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Đề thi" },
        ]}
        title="Quản lý Đề thi"
        description="Soạn thảo đề thi mới, xuất bản và phân phối bài thi cho học sinh"
        actions={
          <Button variant="default" size="sm" asChild className="gap-2 font-semibold">
            <Link href="/teacher/exams/new">
              <HugeiconsIcon icon={Add01Icon} size={16} />
              <span>Tạo đề thi mới</span>
            </Link>
          </Button>
        }
      />

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v === "all" ? null : v)
          setPage(null)
        }}
      >
        <TabsList className="bg-muted/50 p-1">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Card className="border-border shadow-xs">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Không tải được danh sách đề thi</p>
            <p className="text-xs text-muted-foreground">
              {examsQuery.error instanceof ApiError
                ? examsQuery.error.message
                : "Đã xảy ra lỗi. Vui lòng thử lại."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => examsQuery.refetch()}
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              <span>Thử lại</span>
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Book02Icon}
          title="Chưa có đề thi nào"
          description="Tạo đề thi đầu tiên để bắt đầu soạn và giao bài cho học sinh."
          action={
            <Button asChild className="gap-2">
              <Link href="/teacher/exams/new">
                <HugeiconsIcon icon={Add01Icon} size={16} /> Tạo đề thi
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="border-border shadow-xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-3 text-center">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={handleToggleAll}
                      aria-label="Chọn tất cả đề thi trên trang"
                    />
                  </TableHead>
                  <TableHead>Tên đề thi</TableHead>
                  <TableHead>Kỹ năng</TableHead>
                  <TableHead className="font-mono">Thời lượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((ex) => (
                  <ExamRow
                    key={ex.id}
                    exam={ex as Partial<ExamSummary> & { id: string; title: string; durationMinutes: number; status: "draft" | "published" | "closed"; createdAt: string }}
                    isSelected={selectedIds.has(ex.id)}
                    onToggleSelect={() => handleToggleOne(ex.id)}
                    onAssign={() => setAssignExamId(ex.id)}
                    onDelete={() => handleDelete(ex.id)}
                    onClone={() => handleClone(ex.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!USE_MOCKS && meta && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Trang {meta.page}/{totalPages} · {meta.total} đề thi
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 border-r border-border pr-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              Đã chọn {selectedIds.size} đề
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Bỏ chọn
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isBulkBusy}
              onClick={handleBulkClone}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} />
              <span>Nhân bản</span>
            </Button>

            {selectedPublished.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBulkBusy}
                  onClick={handleBulkUnpublish}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <HugeiconsIcon icon={LockIcon} size={14} />
                  <span>Về nháp ({selectedPublished.length})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBulkBusy}
                  onClick={handleBulkClose}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <HugeiconsIcon icon={LockIcon} size={14} />
                  <span>Đóng đề ({selectedPublished.length})</span>
                </Button>
              </>
            )}

            <Button
              variant="destructive"
              size="sm"
              disabled={isBulkBusy || selectedDrafts.length === 0}
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="h-8 gap-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
              <span>
                Xoá ({selectedDrafts.length})
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá đề thi hàng loạt</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-xs text-muted-foreground pt-1">
                <p>
                  Bạn có chắc chắn muốn xoá <strong className="text-foreground">{selectedDrafts.length} đề thi nháp</strong> đã chọn không?
                </p>
                <p className="text-rose-600 dark:text-rose-400 font-medium">
                  Hành động này không thể hoàn tác. Các phần thi và câu hỏi liên quan sẽ bị xoá vĩnh viễn.
                </p>
                {selectedItems.length > selectedDrafts.length && (
                  <p className="rounded-lg bg-muted p-2 text-muted-foreground">
                    ℹ️ Lưu ý: <strong>{selectedItems.length - selectedDrafts.length} đề đã xuất bản hoặc đã đóng</strong> không thể xoá trực tiếp và sẽ được giữ lại an toàn.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkBusy}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkBusy ? "Đang xoá..." : "Xác nhận xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssignDialog
        open={!!assignExamId}
        onOpenChange={(v) => !v && setAssignExamId(null)}
        initialExamId={assignExamId ?? undefined}
      />
    </div>
  )
}

function ExamRow({
  exam,
  isSelected,
  onToggleSelect,
  onAssign,
  onDelete,
  onClone,
}: {
  exam: Partial<ExamSummary> & { id: string; title: string; durationMinutes: number; status: "draft" | "published" | "closed"; createdAt: string }
  isSelected: boolean
  onToggleSelect: () => void
  onAssign: () => void
  onDelete: () => void
  onClone: () => void
}) {
  const unpublishMutation = useUnpublishExamMutation(exam.id)
  const closeMutation = useCloseExamMutation(exam.id)

  const handleUnpublish = async () => {
    if (USE_MOCKS) {
      toast.success("Đã hủy xuất bản (demo)")
      return
    }
    try {
      await unpublishMutation.mutateAsync()
      toast.success("Đã hủy xuất bản, đề chuyển về nháp")
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_HAS_ATTEMPTS") {
        toast.error("Đã có học sinh làm đề này, không thể hủy xuất bản. Hãy nhân bản.")
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể hủy xuất bản.")
      }
    }
  }

  const handleClose = async () => {
    if (USE_MOCKS) {
      toast.success("Đã đóng đề (demo)")
      return
    }
    try {
      await closeMutation.mutateAsync()
      toast.success("Đã đóng đề thi")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể đóng đề.")
    }
  }

  const actionBusy = unpublishMutation.isPending || closeMutation.isPending

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors",
        isSelected && "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={onToggleSelect}
    >
      <TableCell className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={`Chọn đề thi ${exam.title}`}
        />
      </TableCell>
      <TableCell className="font-medium text-foreground">
        <Link
          href={`/teacher/exams/${exam.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:text-primary hover:underline"
        >
          {exam.title}
        </Link>
      </TableCell>
      <TableCell>
        <SkillsCell exam={exam} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {exam.durationMinutes} phút
      </TableCell>
      <TableCell>
        <ExamStatusBadge status={exam.status} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDateShort(exam.createdAt)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-2">
          {exam.status === "draft" && (
            <Button size="sm" className="h-8 text-xs font-semibold" asChild>
              <Link href={`/teacher/exams/${exam.id}/edit`}>
                <HugeiconsIcon icon={PencilEdit02Icon} size={13} className="mr-1" />
                Tiếp tục soạn
              </Link>
            </Button>
          )}
          {exam.status === "published" && (
            <Button
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={onAssign}
            >
              <HugeiconsIcon icon={Task01Icon} size={13} className="mr-1" />
              Giao bài
            </Button>
          )}
          {exam.status === "closed" && (
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" asChild>
              <Link href={`/teacher/exams/${exam.id}?tab=analytics`}>
                <HugeiconsIcon icon={Analytics01Icon} size={13} className="mr-1" />
                Thống kê
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={actionBusy}>
                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exam.status === "draft" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/teacher/exams/${exam.id}/preview`}>
                      <HugeiconsIcon icon={EyeIcon} size={15} /> Xem trước
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClone}>
                    <HugeiconsIcon icon={Copy01Icon} size={15} /> Nhân bản
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <HugeiconsIcon icon={Delete02Icon} size={15} /> Xoá
                  </DropdownMenuItem>
                </>
              )}
              {exam.status === "published" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/teacher/exams/${exam.id}`}>
                      <HugeiconsIcon icon={EyeIcon} size={15} /> Xem chi tiết
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/teacher/exams/${exam.id}/preview`}>
                      <HugeiconsIcon icon={EyeIcon} size={15} /> Xem trước
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/teacher/exams/${exam.id}?tab=analytics`}>
                      <HugeiconsIcon icon={Analytics01Icon} size={15} /> Thống kê
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClone}>
                    <HugeiconsIcon icon={Copy01Icon} size={15} /> Nhân bản
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleUnpublish} disabled={unpublishMutation.isPending}>
                    <HugeiconsIcon icon={LockIcon} size={15} /> Hủy xuất bản
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClose} disabled={closeMutation.isPending}>
                    <HugeiconsIcon icon={Delete02Icon} size={15} /> Đóng đề
                  </DropdownMenuItem>
                </>
              )}
              {exam.status === "closed" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/teacher/exams/${exam.id}?tab=analytics`}>
                      <HugeiconsIcon icon={Analytics01Icon} size={15} /> Thống kê
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/teacher/exams/${exam.id}/preview`}>
                      <HugeiconsIcon icon={EyeIcon} size={15} /> Xem trước
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClone}>
                    <HugeiconsIcon icon={Copy01Icon} size={15} /> Nhân bản
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
