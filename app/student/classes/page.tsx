"use client"

import * as React from "react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  Add01Icon,
  ArrowRight01Icon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  SchoolIcon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { parseAsString, useQueryState } from "nuqs"
import { useClassesQuery, useJoinClassMutation } from "@/hooks/use-classes"
import { ApiError } from "@/lib/api/client"
import type { ClassSummary } from "@/lib/api/types"

// ─── Local adapter type ─────────────────────────────────────────────────────
// ClassSummary backend trả: id, name, code, description, studentsCount.
// REQ-003: với role student, GET /classes bổ sung teacher + assignmentsTotal +
// assignmentsSubmitted. targetBand của lớp vẫn chưa có → cột "Mục tiêu" còn ẩn.
interface ClassListItem extends ClassSummary {
  teacherName: string | null
  totalAssignments: number | null
  completedAssignments: number | null
}

export default function StudentClassesPage() {
  return <RealClassesList />
}

// ─── REAL ────────────────────────────────────────────────────────────────────
function RealClassesList() {
  const classesQuery = useClassesQuery()

  const isLoading = classesQuery.isLoading
  const isError = classesQuery.isError ? classesQuery.error : null

  const items = React.useMemo<ClassListItem[]>(() => {
    const classes = classesQuery.data ?? []
    return classes.map((cls) => ({
      ...cls,
      // REQ-003: backend trả teacher + tiến độ cho role student.
      teacherName: cls.teacher?.fullName ?? null,
      totalAssignments: cls.assignmentsTotal ?? null,
      completedAssignments: cls.assignmentsSubmitted ?? null,
    }))
  }, [classesQuery.data])

  const refetch = () => {
    classesQuery.refetch()
  }

  return (
    <ClassesListView
      items={items}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
    />
  )
}

// ─── Shared View ─────────────────────────────────────────────────────────────
function ClassesListView({
  items,
  isLoading,
  isError,
  refetch,
}: {
  items: ClassListItem[]
  isLoading: boolean
  isError: unknown
  refetch: () => void
}) {
  const [searchQuery, setSearchQuery] = useQueryState("q", parseAsString.withDefault(""))
  const [isJoinOpen, setIsJoinOpen] = React.useState(false)
  const [joinCode, setJoinCode] = React.useState("")
  const [joinError, setJoinError] = React.useState<string | null>(null)
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  const joinMutation = useJoinClassMutation()

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    toast.success(`Đã sao chép mã lớp "${code}" vào clipboard!`)
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev))
    }, 2000)
  }

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = joinCode.trim().toUpperCase()
    if (!cleanCode) return
    setJoinError(null)

    try {
      const res = await joinMutation.mutateAsync(cleanCode)
      toast.success("Tham gia lớp học thành công!", {
        description: `Đã vào lớp "${res.name}" (Mã: ${cleanCode})`,
      })
      setIsJoinOpen(false)
      setJoinCode("")
      setJoinError(null)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CLASS_CODE_INVALID") {
          setJoinError(err.message || "Mã lớp không đúng. Kiểm tra lại với giáo viên.")
        } else if (err.code === "STUDENT_ALREADY_IN_CLASS") {
          setJoinError(err.message || "Bạn đã tham gia lớp học này rồi!")
        } else {
          setJoinError(err.message || "Không thể tham gia lớp. Thử lại sau.")
        }
      } else {
        setJoinError("Không thể tham gia lớp. Thử lại sau.")
      }
      // KHÔNG đóng dialog — giữ cho user sửa mã
    }
  }

  const filteredClasses = items.filter((c) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.teacherName ?? "").toLowerCase().includes(q)
    )
  })

  const totalAssignments = items.reduce((sum, c) => sum + (c.totalAssignments ?? 0), 0)
  const completedAssignments = items.reduce((sum, c) => sum + (c.completedAssignments ?? 0), 0)
  const pendingAssignments = totalAssignments - completedAssignments
  const teacherCount = new Set(items.map((c) => c.teacherName).filter(Boolean)).size

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          breadcrumbs={[{ label: "Tổng quan", href: "/student" }, { label: "Lớp học" }]}
          title="Lớp học của tôi"
          description="Theo dõi các lớp học đang tham gia, tiến độ bài tập và thông tin giáo viên phụ trách"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  // ─── Error ───
  if (isError) {
    const message = isError instanceof ApiError ? isError.message : "Không tải được danh sách lớp học."
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          breadcrumbs={[{ label: "Tổng quan", href: "/student" }, { label: "Lớp học" }]}
          title="Lớp học của tôi"
          description="Theo dõi các lớp học đang tham gia, tiến độ bài tập và thông tin giáo viên phụ trách"
        />
        <EmptyState
          icon={SchoolIcon}
          title="Không tải được danh sách lớp"
          description={message}
          action={
            <Button variant="default" size="sm" onClick={refetch} className="font-semibold">
              Thử lại
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/student" },
          { label: "Lớp học" },
        ]}
        title="Lớp học của tôi"
        description="Theo dõi các lớp học đang tham gia, tiến độ bài tập và thông tin giáo viên phụ trách"
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => setIsJoinOpen(true)}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} />
            <span>Tham gia lớp học</span>
          </Button>
        }
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Lớp đang tham gia"
          value={items.length}
          hint="Đang học trong kỳ"
          icon={SchoolIcon}
          accent
        />
        <StatCard
          label="Bài tập cần làm"
          value={pendingAssignments}
          hint={`${completedAssignments}/${totalAssignments} bài đã hoàn thành`}
          icon={Book02Icon}
        />
        <StatCard
          label="Giáo viên phụ trách"
          value={teacherCount}
          hint="Đồng hành giảng dạy & chấm thi"
          icon={UserIcon}
        />
      </div>

      {/* Search & Toolbar Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <HugeiconsIcon
            icon={Search01Icon}
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên lớp, mã lớp hoặc giáo viên…"
            className="pl-9 h-9 text-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Hiển thị <span className="font-semibold text-foreground">{filteredClasses.length}</span> lớp học
        </p>
      </div>

      {/* Classes Table View */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={SchoolIcon}
          title="Không tìm thấy lớp học"
          description={
            searchQuery
              ? `Không có lớp học nào khớp với từ khóa "${searchQuery}".`
              : "Bạn chưa tham gia lớp học nào. Hãy nhập mã 6 ký tự do giáo viên cung cấp để bắt đầu."
          }
          action={
            <Button
              variant="default"
              size="sm"
              className="gap-2 font-semibold"
              onClick={() => setIsJoinOpen(true)}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} />
              <span>Tham gia lớp ngay</span>
            </Button>
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
                  <TableHead className="w-[140px]">Mã lớp</TableHead>
                  <TableHead className="min-w-[180px]">Giáo viên</TableHead>
                  <TableHead className="w-[180px]">Tiến độ bài tập</TableHead>
                  {/* REQ-003 fallback: backend không trả targetBand ở class list — ẨN cột "Mục tiêu" */}
                  <TableHead className="w-[110px] text-right">Sĩ số</TableHead>
                  <TableHead className="w-[130px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => {
                  const isCopied = copiedCode === cls.code
                  const hasProgress =
                    cls.totalAssignments !== null && cls.completedAssignments !== null
                  const progress =
                    hasProgress && (cls.totalAssignments ?? 0) > 0
                      ? Math.round(
                          ((cls.completedAssignments ?? 0) / (cls.totalAssignments ?? 1)) * 100
                        )
                      : 0

                  return (
                    <TableRow key={cls.id} className="hover:bg-muted/20 transition-colors">
                      {/* Class Name & Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <HugeiconsIcon icon={SchoolIcon} size={18} />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/student/classes/${cls.id}`}
                              className="font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                            >
                              {cls.name}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-sm">
                              {cls.description || "Lớp học luyện thi IELTS."}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Class Code */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => copyCode(cls.code)}
                          className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-mono font-bold text-foreground transition-colors"
                          title="Bấm để sao chép mã lớp"
                        >
                          <span>{cls.code}</span>
                          <HugeiconsIcon
                            icon={isCopied ? CheckmarkCircle02Icon : Copy01Icon}
                            size={13}
                            className={isCopied ? "text-emerald-600" : "text-muted-foreground group-hover:text-foreground"}
                          />
                        </button>
                      </TableCell>

                      {/* Teacher — REQ-003: hiện tên giáo viên (backend trả qua GET /classes) */}
                      <TableCell>
                        {cls.teacherName ? (
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[11px] text-primary">
                              {cls.teacherName.slice(0, 1)}
                            </div>
                            <div className="min-w-0 leading-tight">
                              <p className="text-xs font-medium text-foreground truncate">
                                {cls.teacherName}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Assignment Progress — REQ-003: tiến độ do backend tính (assignmentsSubmitted/Total) */}
                      <TableCell>
                        {hasProgress ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-muted-foreground">
                                {cls.completedAssignments}/{cls.totalAssignments} đã nộp
                              </span>
                              <span className="font-mono font-semibold text-foreground">
                                {progress}%
                              </span>
                            </div>
                            <Progress value={progress} className="h-1.5 w-full" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Students Count */}
                      <TableCell className="text-right">
                        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                          {cls.studentsCount}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-1">học sinh</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 px-3 text-xs font-semibold gap-1.5"
                          asChild
                        >
                          <Link href={`/student/classes/${cls.id}`}>
                            <span>Vào lớp</span>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Clean Cards Fallback */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredClasses.map((cls) => {
              const hasProgress =
                cls.totalAssignments !== null && cls.completedAssignments !== null
              const progress =
                hasProgress && (cls.totalAssignments ?? 0) > 0
                  ? Math.round(((cls.completedAssignments ?? 0) / (cls.totalAssignments ?? 1)) * 100)
                  : 0

              return (
                <Card key={cls.id} className="border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon icon={SchoolIcon} size={18} />
                      </span>
                      <div>
                        <h4 className="font-heading text-sm font-bold text-foreground">
                          {cls.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {cls.teacherName ? `GV: ${cls.teacherName} · ` : ""}
                          {cls.studentsCount} học sinh
                        </p>
                      </div>
                    </div>
                  </div>

                  {hasProgress ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tiến độ bài tập</span>
                        <span className="font-mono font-semibold text-foreground">
                          {cls.completedAssignments}/{cls.totalAssignments} ({progress}%)
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tiến độ: —</p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => copyCode(cls.code)}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <span>Mã: {cls.code}</span>
                      <HugeiconsIcon icon={Copy01Icon} size={12} />
                    </button>
                    <Button variant="default" size="sm" className="h-7 text-xs font-semibold gap-1 px-3" asChild>
                      <Link href={`/student/classes/${cls.id}`}>
                        <span>Vào lớp</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                      </Link>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Join Class Dialog */}
      <Dialog open={isJoinOpen} onOpenChange={(open) => {
        setIsJoinOpen(open)
        if (!open) {
          setJoinCode("")
          setJoinError(null)
        }
      }}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleJoinClass} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="font-heading text-base font-semibold">
                Tham gia lớp học mới
              </DialogTitle>
              <DialogDescription className="text-xs">
                Nhập mã mời 6 ký tự do giáo viên cung cấp để tham gia lớp (ví dụ: FOUND1, INTER2).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <label htmlFor="join-code" className="text-xs font-medium text-foreground">
                Mã lớp học (Class Code)
              </label>
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase())
                  if (joinError) setJoinError(null)
                }}
                placeholder="VD: INTER2"
                maxLength={6}
                className="font-mono text-center text-lg uppercase tracking-widest font-bold h-11"
                autoFocus
                required
                disabled={joinMutation.isPending}
              />
              {joinError ? (
                <p className="text-[11px] text-destructive text-center font-medium">{joinError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center">
                  Mã gồm 6 chữ cái và chữ số không dấu.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsJoinOpen(false)}
                disabled={joinMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="gap-2 font-semibold"
                disabled={!joinCode.trim() || joinMutation.isPending}
              >
                <span>{joinMutation.isPending ? "Đang tham gia…" : "Tham gia ngay"}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
