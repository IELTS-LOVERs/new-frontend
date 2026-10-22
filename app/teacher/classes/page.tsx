"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Analytics01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  MoreHorizontalIcon,
  Refresh01Icon,
  SchoolIcon,
  Search01Icon,
  Task01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import type { ClassSummary } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import {
  useClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
} from "@/hooks/use-classes"
import { useTeacherAssignmentsQuery } from "@/hooks/use-assignments"

export default function TeacherClassesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  // Data sources
  const classesQuery = useClassesQuery()
  // G3: GET /assignments không có filter examId/stats đầy đủ — chỉ dùng để đếm số đợt giao
  const assignmentsQuery = useTeacherAssignmentsQuery({ limit: 100 })

  const createMutation = useCreateClassMutation()

  // Create Class Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [desc, setDesc] = React.useState("")

  // Edit Class Dialog State
  const [editingClass, setEditingClass] = React.useState<ClassSummary | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDesc, setEditDesc] = React.useState("")
  const editMutation = useUpdateClassMutation(editingClass?.id ?? "")

  // Delete Confirmation Dialog State
  const [deletingClass, setDeletingClass] = React.useState<ClassSummary | null>(null)
  const [deleteBlocked, setDeleteBlocked] = React.useState<ClassSummary | null>(null)
  const deleteMutation = useDeleteClassMutation()

  const classes: ClassSummary[] = classesQuery.data ?? []
  const allAssignments = assignmentsQuery.data?.items ?? []

  const isLoading = classesQuery.isLoading
  const isError = classesQuery.isError

  // Copy code to clipboard with visual feedback
  const copyCode = (classCode: string) => {
    navigator.clipboard?.writeText(classCode)
    setCopiedCode(classCode)
    toast.success(`Đã sao chép mã lớp ${classCode} vào clipboard!`)
    setTimeout(() => {
      setCopiedCode((prev) => (prev === classCode ? null : prev))
    }, 2000)
  }

  // Create new class handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        description: desc.trim() || undefined,
      })
      toast.success("Tạo lớp học mới thành công!", {
        description: `Mã mời tham gia: ${created.code}`,
      })
      setIsCreateOpen(false)
      setName("")
      setDesc("")
      router.push(`/teacher/classes/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể tạo lớp học. Vui lòng thử lại.")
      }
    }
  }

  // Edit class handler
  const handleOpenEdit = (c: ClassSummary) => {
    setEditingClass(c)
    setEditName(c.name)
    setEditDesc(c.description || "")
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass || !editName.trim()) return

    try {
      await editMutation.mutateAsync({
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      })
      toast.success(`Đã cập nhật thông tin lớp "${editName}"`)
      setEditingClass(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể cập nhật lớp học. Vui lòng thử lại.")
      }
    }
  }

  // Delete class handler
  const handleConfirmDelete = async () => {
    if (!deletingClass) return
    try {
      await deleteMutation.mutateAsync(deletingClass.id)
      toast.success(`Đã xóa lớp học "${deletingClass.name}"`)
      setDeletingClass(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === "CLASS_HAS_ACTIVE_ASSIGNMENTS") {
        setDeleteBlocked(deletingClass)
        setDeletingClass(null)
      } else if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể xóa lớp học. Vui lòng thử lại.")
      }
    }
  }

  // Calculations
  const totalStudents = classes.reduce((sum, c) => sum + c.studentsCount, 0)
  const totalAssignments = allAssignments.length
  const avgStudentsPerClass = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0

  const assignmentCountByClass = (id: string) =>
    allAssignments.filter((a) => a.classId === id).length

  // Filtered classes by search
  const filteredClasses = classes.filter((c) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    )
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Lớp học" },
        ]}
        title="Quản lý Lớp học"
        description="Quản lý danh sách lớp, chia sẻ mã mời học sinh và theo dõi kết quả đào tạo"
        actions={
          <Button variant="default" size="sm" className="gap-2 font-semibold" onClick={() => setIsCreateOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} size={16} />
            <span>Tạo lớp học mới</span>
          </Button>
        }
      />

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <StatCard
              label="Tổng số lớp học"
              value={classes.length}
              hint="Đang hoạt động trong kỳ"
              icon={SchoolIcon}
              accent
            />
            <StatCard
              label="Tổng học sinh"
              value={totalStudents}
              hint={`Trung bình ${avgStudentsPerClass} học sinh / lớp`}
              icon={UserGroupIcon}
            />
            <StatCard
              label="Đợt giao bài tập"
              value={totalAssignments}
              hint="Trên tất cả các lớp học"
              icon={Task01Icon}
            />
          </>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên lớp, mã mời hoặc mô tả..."
            className="h-9 pl-9 pr-8 text-xs bg-card"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          Hiển thị <span className="font-semibold text-foreground">{filteredClasses.length}</span> / {classes.length} lớp học
        </p>
      </div>

      {/* Main Table View */}
      {isLoading ? (
        <Card className="border-border shadow-xs hidden md:block overflow-hidden p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </Card>
      ) : isError ? (
        <EmptyState
          icon={SchoolIcon}
          title="Không thể tải danh sách lớp học"
          description={
            classesQuery.error instanceof ApiError
              ? classesQuery.error.message
              : "Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => classesQuery.refetch()}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={15} />
              Thử lại
            </Button>
          }
        />
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={SchoolIcon}
          title={searchQuery ? "Không tìm thấy lớp học" : "Chưa có lớp học nào"}
          description={
            searchQuery
              ? `Không tìm thấy lớp học nào khớp với từ khóa "${searchQuery}".`
              : "Tạo lớp đầu tiên để mời học sinh."
          }
          action={
            searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Xóa tìm kiếm
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-2 font-semibold">
                <HugeiconsIcon icon={Add01Icon} size={15} />
                <span>Tạo lớp học mới</span>
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="border-border shadow-xs hidden md:block overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="min-w-[280px]">Lớp học</TableHead>
                  <TableHead className="w-[170px]">Mã mời</TableHead>
                  <TableHead className="w-[120px] text-right">Sĩ số</TableHead>
                  <TableHead className="w-[140px] text-center">Đợt giao bài</TableHead>
                  <TableHead className="w-[140px] text-center">Trạng thái</TableHead>
                  <TableHead className="w-[190px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((c) => {
                  const assignmentCount = assignmentCountByClass(c.id)
                  const isCopied = copiedCode === c.code

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                      {/* Class Name & Description */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <HugeiconsIcon icon={SchoolIcon} size={18} />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/teacher/classes/${c.id}`}
                              className="font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                            >
                              {c.name}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-sm">
                              {c.description || "Chưa có mô tả chi tiết."}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Invitation Code */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => copyCode(c.code)}
                          className="group inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-mono font-bold text-foreground transition-colors"
                          title="Bấm để sao chép mã mời"
                        >
                          <span>{c.code}</span>
                          <HugeiconsIcon
                            icon={isCopied ? CheckmarkCircle02Icon : Copy01Icon}
                            size={13}
                            className={isCopied ? "text-emerald-600" : "text-muted-foreground group-hover:text-foreground"}
                          />
                        </button>
                      </TableCell>

                      {/* Student Count */}
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {c.studentsCount}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">hs</span>
                      </TableCell>

                      {/* Assignments Count */}
                      <TableCell className="text-center">
                        {assignmentCount > 0 ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {assignmentCount} đợt
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </Badge>
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" asChild>
                            <Link href={`/teacher/classes/${c.id}`}>Chi tiết</Link>
                          </Button>
                          <Button size="sm" className="h-8 px-2.5 text-xs font-semibold" asChild>
                            <Link href={`/teacher/assignments?action=assign&classId=${c.id}`}>
                              Giao bài
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                                <span className="sr-only">Thao tác</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => copyCode(c.code)} className="gap-2 text-xs">
                                <HugeiconsIcon icon={Copy01Icon} size={14} />
                                Sao chép mã lớp
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="gap-2 text-xs">
                                <Link href={`/teacher/classes/${c.id}?tab=analytics`}>
                                  <HugeiconsIcon icon={Analytics01Icon} size={14} />
                                  Xem bảng điểm & tiến độ
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(c)} className="gap-2 text-xs">
                                <HugeiconsIcon icon={Edit02Icon} size={14} />
                                Đổi tên / mô tả
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingClass(c)}
                                className="gap-2 text-xs text-destructive focus:text-destructive"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={14} />
                                Xóa lớp học
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Fallback: List of Responsive Cards */}
          <div className="space-y-3 md:hidden">
            {filteredClasses.map((c) => {
              const assignmentCount = assignmentCountByClass(c.id)
              const isCopied = copiedCode === c.code

              return (
                <Card key={c.id} className="border-border shadow-xs p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={SchoolIcon} size={16} />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/teacher/classes/${c.id}`}
                          className="font-heading font-semibold text-sm text-foreground truncate block"
                        >
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.description || "Chưa có mô tả chi tiết."}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1 text-[10px] shrink-0 font-normal">
                      <span className="size-1 rounded-full bg-emerald-500" /> Hoạt động
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-y border-border py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => copyCode(c.code)}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border"
                    >
                      <span>MÃ: {c.code}</span>
                      <HugeiconsIcon
                        icon={isCopied ? CheckmarkCircle02Icon : Copy01Icon}
                        size={12}
                        className={isCopied ? "text-emerald-600" : "text-muted-foreground"}
                      />
                    </button>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={UserIcon} size={13} />
                        <strong className="font-mono text-foreground font-semibold">{c.studentsCount}</strong> hs
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={Task01Icon} size={13} />
                        <strong className="font-mono text-foreground font-semibold">{assignmentCount}</strong> đợt
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                      <Link href={`/teacher/classes/${c.id}`}>Chi tiết</Link>
                    </Button>
                    <Button size="sm" className="flex-1 text-xs font-semibold" asChild>
                      <Link href={`/teacher/assignments?action=assign&classId=${c.id}`}>
                        Giao bài
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                          <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleOpenEdit(c)} className="text-xs gap-2">
                          <HugeiconsIcon icon={Edit02Icon} size={13} />
                          Chỉnh sửa lớp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingClass(c)} className="text-xs gap-2 text-destructive">
                          <HugeiconsIcon icon={Delete02Icon} size={13} />
                          Xóa lớp học
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Dialog: Create New Class */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">
                Tạo lớp học mới
              </DialogTitle>
              <DialogDescription className="text-xs">
                Thiết lập thông tin lớp. Mã mời 6 ký tự sẽ được hệ thống tự sinh.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-name" className="text-xs font-medium">
                  Tên lớp học <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: IELTS Intensive 6.5+ (K24)"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-desc" className="text-xs font-medium">
                  Mô tả / Mục tiêu lớp học
                </Label>
                <Input
                  id="c-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="VD: Mục tiêu band 6.5, học tối Thứ 2 - 4 - 6"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" className="font-bold" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Đang tạo..." : "Tạo lớp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Class */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">
                Chỉnh sửa thông tin lớp học
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cập nhật tên và mô tả chi tiết của lớp học.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-medium">
                  Tên lớp học <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc" className="text-xs font-medium">
                  Mô tả lớp học
                </Label>
                <Input
                  id="edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Mục tiêu band điểm, lịch học..."
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingClass(null)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" className="font-bold" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <Dialog open={!!deletingClass} onOpenChange={(open) => !open && setDeletingClass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-destructive">
              Xác nhận xóa lớp học
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Bạn có chắc chắn muốn xóa lớp học{" "}
              <strong className="text-foreground">{deletingClass?.name}</strong> (Mã: {deletingClass?.code})?
              Hành động này sẽ gỡ bỏ liên kết học sinh và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingClass(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="font-bold"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa lớp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete blocked — lớp còn đợt giao đang mở */}
      <Dialog open={!!deleteBlocked} onOpenChange={(open) => !open && setDeleteBlocked(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              Không thể xóa lớp học
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Lớp <strong className="text-foreground">{deleteBlocked?.name}</strong> đang có đợt
              giao bài còn hiệu lực. Vui lòng lưu trữ hoặc xóa các đợt giao bài của lớp trước khi
              xóa lớp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteBlocked(null)}>
              Đóng
            </Button>
            <Button size="sm" className="font-semibold" asChild>
              <Link href={`/teacher/assignments?classId=${deleteBlocked?.id ?? ""}`}>
                Xem đợt giao của lớp
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
