"use client"

import * as React from "react"
import Link from "next/link"
import { parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ExamStatusBadge } from "@/components/shared/status-badge"
import { DeleteExamDialog } from "@/components/shared/delete-exam-dialog"
import { EditExamButton } from "@/components/shared/edit-exam-button"
import { SkillBadges } from "@/components/shared/skill-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  LockIcon,
  CheckmarkCircle02Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import {
  useExamsQuery,
  useCloneExamMutation,
} from "@/hooks/use-exams"
import { publishExamApi, closeExamApi, reopenExamApi } from "@/lib/api/exams"
import type { ExamListItem } from "@/lib/api/types"
import { useAuthStore } from "@/stores/auth.store"

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "closed", label: "Đã đóng" },
] as const

const PAGE_SIZE = 20

export default function TeacherPracticesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "admin"
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("all").withOptions({ shallow: true })
  )
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: true })
  )

  const [deleteTarget, setDeleteTarget] = React.useState<ExamListItem | null>(null)
  const [closeTarget, setCloseTarget] = React.useState<ExamListItem | null>(null)

  const queryParams = React.useMemo(
    () => ({
      status: status !== "all" ? (status as "draft" | "published" | "closed") : undefined,
      kind: "practice" as const,
      page,
      limit: PAGE_SIZE,
    }),
    [status, page]
  )

  const examsQuery = useExamsQuery(queryParams, true)
  const cloneMutation = useCloneExamMutation()

  const items = examsQuery.data?.items ?? []
  const meta = examsQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1

  const handlePublish = async (item: ExamListItem) => {
    try {
      await publishExamApi(item.id)
      toast.success("Xuất bản bài luyện tập thành công!", {
        description: "Học sinh hiện có thể tự luyện tập bài này trên hệ thống.",
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Không thể xuất bản", { description: err.message })
      } else {
        toast.error("Không thể xuất bản bài luyện tập.")
      }
    }
  }

  const handleReopen = async (item: ExamListItem) => {
    try {
      const result = await reopenExamApi(item.id)
      toast.success("Đã mở lại bài luyện tập")
      if (result.clearedCloseAt) {
        toast.info("Thời gian đóng đã qua nên đã được xoá. Bài hiện đang mở.")
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể mở lại bài luyện tập.")
    }
  }

  const handleClose = async () => {
    if (!closeTarget) return
    try {
      await closeExamApi(closeTarget.id)
      toast.success("Đã đóng bài luyện tập")
      setCloseTarget(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể đóng bài luyện tập.")
    }
  }

  const handleClone = async (item: ExamListItem) => {
    try {
      await cloneMutation.mutateAsync(item.id)
      toast.success("Đã nhân bản bài luyện tập")
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nhân bản thất bại.")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Bài luyện tập" },
        ]}
        title="Quản lý bài luyện tập (Practice)"
        description="Tạo và quản lý các bài luyện tập IELTS Listening & Reading theo từng section, đính kèm video và từ vựng sau khi nộp"
        actions={
          <Button asChild size="sm" className="gap-1.5 text-xs font-semibold">
            <Link href="/teacher/exams/new?kind=practice">
              <HugeiconsIcon icon={Add01Icon} size={15} />
              <span>Tạo bài luyện tập mới</span>
            </Link>
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs
        value={status}
        onValueChange={(val) => {
          setStatus(val === "all" ? null : val)
          setPage(null)
        }}
        className="w-full"
      >
        <TabsList className="bg-muted/60 p-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table Content */}
      {examsQuery.isLoading ? (
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      ) : examsQuery.isError ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">Không tải được danh sách bài luyện tập</p>
            <p className="text-xs text-muted-foreground">
              {examsQuery.error instanceof ApiError
                ? examsQuery.error.message
                : "Đã xảy ra lỗi khi kết nối server."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => examsQuery.refetch()}
              className="gap-1.5 text-xs font-medium"
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              <span>Thử lại</span>
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Book02Icon}
          title="Chưa có bài luyện tập nào"
          description="Bắt đầu tạo bài luyện tập Listening hoặc Reading theo lộ trình để học sinh tự do ôn luyện."
          action={
            <Button size="sm" asChild>
              <Link href="/teacher/exams/new?kind=practice">
                <HugeiconsIcon icon={Add01Icon} size={15} />
                <span>Tạo bài luyện tập ngay</span>
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[320px] text-xs font-semibold">Tên bài luyện tập</TableHead>
                <TableHead className="text-xs font-semibold">Giáo trình & Phần thi</TableHead>
                <TableHead className="w-[150px] text-xs font-semibold">Kỹ năng</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold text-center">Thời lượng</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Trạng thái</TableHead>
                <TableHead className="w-[170px] text-right text-xs font-semibold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-border/50 text-xs">
                  <TableCell className="py-3">
                    <Link
                      href={
                        item.status === "draft"
                          ? `/teacher/exams/${item.id}/edit`
                          : `/teacher/exams/${item.id}`
                      }
                      className="font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-[300px]"
                    >
                      {item.title}
                    </Link>
                  </TableCell>

                  <TableCell className="py-3 text-muted-foreground">
                    {item.curriculum?.collectionName ? (
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground">
                          {item.curriculum.collectionName}
                        </span>
                        <div className="text-[11px] text-muted-foreground">
                          {item.curriculum.testNumber ? `Test ${item.curriculum.testNumber}` : ""}
                          {item.curriculum.part ? ` • Part ${item.curriculum.part}` : ""}
                        </div>
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    <SkillBadges skills={item.skills} emptyLabel="Chưa có phần thi" />
                  </TableCell>

                  <TableCell className="py-3 text-center font-mono">
                    {item.durationMinutes}p
                  </TableCell>

                  <TableCell className="py-3">
                    <ExamStatusBadge status={item.status} />
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      {(item.status === "published" || item.status === "closed") && (
                        <EditExamButton
                          examId={item.id}
                          status={item.status}
                          size="sm"
                          variant={item.status === "closed" ? "default" : "outline"}
                          className="h-8 text-xs font-semibold"
                        />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            <span className="sr-only">Mở menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem asChild>
                            <Link
                              href={
                                item.status === "draft"
                                  ? `/teacher/exams/${item.id}/edit`
                                  : `/teacher/exams/${item.id}`
                              }
                              className="gap-2"
                            >
                              <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                              <span>{item.status === "draft" ? "Sửa / Soạn tiếp" : "Xem chi tiết"}</span>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleClone(item)} className="gap-2">
                            <HugeiconsIcon icon={Copy01Icon} size={14} />
                            <span>Nhân bản bài này</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {item.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handlePublish(item)}
                              className="gap-2 text-emerald-600 dark:text-emerald-400"
                            >
                              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                              <span>Xuất bản ngay</span>
                            </DropdownMenuItem>
                          )}

                          {item.status === "published" && (
                            <DropdownMenuItem
                              onClick={() => setCloseTarget(item)}
                              className="gap-2 text-destructive"
                            >
                              <HugeiconsIcon icon={LockIcon} size={14} />
                              <span>Đóng bài luyện tập</span>
                            </DropdownMenuItem>
                          )}

                          {item.status === "closed" && (
                            <DropdownMenuItem
                              onClick={() => handleReopen(item)}
                              className="gap-2 text-emerald-600 dark:text-emerald-400"
                            >
                              <HugeiconsIcon icon={RefreshIcon} size={14} />
                              <span>Mở lại</span>
                            </DropdownMenuItem>
                          )}

                          {(item.status !== "published" || isAdmin) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(item)}
                                className="gap-2 text-destructive"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={14} />
                                <span>Xóa vĩnh viễn</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground">
              <span>Trang {page} / {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 text-xs"
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 text-xs"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Delete Dialog */}
      <DeleteExamDialog
        exam={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        entityLabel="bài luyện tập"
      />

      {/* Close Dialog */}
      <AlertDialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-base font-semibold">
              Xác nhận đóng bài luyện tập?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Bài luyện tập &quot;{closeTarget?.title}&quot; sẽ bị đóng và học sinh không thể bắt đầu bài làm mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} className="text-xs font-semibold">
              Đóng bài luyện tập
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
