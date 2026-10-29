"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Analytics01Icon,
  Copy01Icon,
  RefreshIcon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatDateShort, initials } from "@/lib/format"
import { ApiError } from "@/lib/api/client"
import { useClassesQuery } from "@/hooks/use-classes"
import {
  useAddStudentsToClassMutation,
  useRegisteredStudentsQuery,
} from "@/hooks/use-students"

const PAGE_SIZE = 20

function copyToClipboard(text: string, message: string) {
  navigator.clipboard?.writeText(text)
  toast.success(message)
}

function TableSkeleton() {
  return (
    <Card className="border-border shadow-xs">
      <CardContent className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Danh sách học sinh đã tự đăng ký trên web.
 *
 * Giáo viên dùng trang này để biết bạn nào đã có tài khoản mà chưa vào lớp, rồi
 * chọn nhiều bạn và thêm vào lớp của mình — thay vì phải mở trang quản trị.
 */
export default function TeacherStudentsPage() {
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [unassignedOnly, setUnassignedOnly] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [targetClassId, setTargetClassId] = React.useState("")

  // Gõ tìm kiếm → chờ 300ms rồi mới gọi API và quay về trang 1.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
      setSelected(new Set())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const studentsQuery = useRegisteredStudentsQuery({
    search: search || undefined,
    unassigned: unassignedOnly || undefined,
    page,
    limit: PAGE_SIZE,
  })
  // Hai truy vấn nhẹ chỉ để lấy số liệu tổng quan (không phụ thuộc bộ lọc).
  const totalsQuery = useRegisteredStudentsQuery({ limit: 1 })
  const unassignedQuery = useRegisteredStudentsQuery({ unassigned: true, limit: 1 })
  const classesQuery = useClassesQuery()
  const addStudents = useAddStudentsToClassMutation()

  const students = studentsQuery.data?.items ?? []
  const meta = studentsQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1
  const totalStudents = totalsQuery.data?.meta?.total ?? 0
  const unassignedCount = unassignedQuery.data?.meta?.total ?? 0
  const classes = classesQuery.data ?? []

  const selectedStudents = students.filter((student) => selected.has(student.id))
  const allSelected =
    students.length > 0 && students.every((student) => selected.has(student.id))
  const hasFilters = Boolean(search) || unassignedOnly

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const student of students) next.delete(student.id)
      } else {
        for (const student of students) next.add(student.id)
      }
      return next
    })
  }

  const toggleUnassigned = () => {
    setUnassignedOnly((value) => !value)
    setPage(1)
    setSelected(new Set())
  }

  const clearFilters = () => {
    setSearchInput("")
    setSearch("")
    setUnassignedOnly(false)
    setPage(1)
    setSelected(new Set())
  }

  const goToPage = (next: number) => {
    setSelected(new Set())
    setPage(next)
  }

  const handleAddSelected = async () => {
    if (!targetClassId) {
      toast.error("Chọn lớp cần thêm trước")
      return
    }
    if (selectedStudents.length === 0) return

    let added = 0
    let skipped = 0
    let failed = 0

    for (const student of selectedStudents) {
      try {
        await addStudents.mutateAsync({
          classId: targetClassId,
          email: student.email,
        })
        added += 1
      } catch (error) {
        if (error instanceof ApiError && error.code === "STUDENT_ALREADY_IN_CLASS") {
          skipped += 1
        } else {
          failed += 1
        }
      }
    }

    setSelected(new Set())
    await Promise.all([
      studentsQuery.refetch(),
      totalsQuery.refetch(),
      unassignedQuery.refetch(),
    ])

    if (added > 0) {
      const notes: string[] = []
      if (skipped > 0) notes.push(`${skipped} bạn đã ở trong lớp`)
      if (failed > 0) notes.push(`${failed} bạn thêm lỗi`)
      toast.success(`Đã thêm ${added} học sinh vào lớp`, {
        description: notes.length > 0 ? notes.join(" · ") : undefined,
      })
      return
    }

    toast.error("Không thêm được học sinh nào", {
      description:
        skipped > 0
          ? "Các bạn đã chọn đều đã ở trong lớp này."
          : "Vui lòng thử lại sau.",
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Học viên" }]}
        title="Học viên đã đăng ký"
        description="Tài khoản học sinh tự đăng ký trên web. Chọn những bạn chưa vào lớp rồi thêm vào lớp của bạn."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => {
                void studentsQuery.refetch()
                void totalsQuery.refetch()
                void unassignedQuery.refetch()
              }}
              disabled={studentsQuery.isFetching}
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} /> Làm mới
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
              <Link href="/teacher/classes">
                <HugeiconsIcon icon={UserIcon} size={14} /> Quản lý lớp học
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Học sinh đã đăng ký"
          value={totalStudents}
          icon={UserGroupIcon}
          hint="Tất cả tài khoản học sinh"
        />
        <StatCard
          label="Chưa vào lớp nào"
          value={unassignedCount}
          icon={Alert02Icon}
          accent={unassignedCount > 0}
          hint="Nên thêm vào lớp"
        />
        <StatCard
          label="Lớp đang phụ trách"
          value={classes.length}
          icon={UserIcon}
          hint="Lớp bạn tạo hoặc quản lý"
        />
      </div>

      <Card className="border-border shadow-xs">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative w-full sm:max-w-xs">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="h-9 pl-9 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={toggleUnassigned}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              unassignedOnly
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={unassignedOnly}
          >
            <HugeiconsIcon icon={Alert02Icon} size={13} />
            Chỉ hiện bạn chưa vào lớp
          </button>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={clearFilters}
            >
              Xoá bộ lọc
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedStudents.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-xs">
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <p className="text-xs font-medium text-foreground">
              Đã chọn{" "}
              <span className="font-mono font-semibold text-primary">
                {selectedStudents.length}
              </span>{" "}
              học sinh
            </p>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger size="sm" className="w-full sm:w-56">
                <SelectValue placeholder="Chọn lớp để thêm" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              disabled={!targetClassId || addStudents.isPending}
              isLoading={addStudents.isPending}
              onClick={() => void handleAddSelected()}
            >
              <HugeiconsIcon icon={UserAdd01Icon} size={14} /> Thêm vào lớp
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={addStudents.isPending}
            >
              Bỏ chọn
            </Button>
            {classes.length === 0 && (
              <span className="text-[11px] text-muted-foreground">
                Bạn chưa có lớp nào —{" "}
                <Link href="/teacher/classes" className="text-primary underline-offset-2 hover:underline">
                  tạo lớp trước
                </Link>
                .
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {studentsQuery.isLoading ? (
        <TableSkeleton />
      ) : studentsQuery.isError ? (
        <Card className="border-destructive/30 bg-card p-8 text-center">
          <p className="text-sm font-semibold text-destructive">
            Không tải được danh sách học sinh
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {studentsQuery.error instanceof ApiError
              ? studentsQuery.error.message
              : "Vui lòng thử lại sau."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5 text-xs"
            onClick={() => void studentsQuery.refetch()}
          >
            <HugeiconsIcon icon={RefreshIcon} size={14} /> Thử lại
          </Button>
        </Card>
      ) : students.length === 0 ? (
        <EmptyState
          icon={UserGroupIcon}
          title={
            totalStudents === 0
              ? "Chưa có học sinh nào đăng ký"
              : "Không tìm thấy học sinh phù hợp"
          }
          description={
            totalStudents === 0
              ? "Khi học sinh tạo tài khoản trên web, các bạn sẽ xuất hiện ở đây để bạn thêm vào lớp."
              : "Thử đổi từ khoá tìm kiếm hoặc bỏ bộ lọc 'chưa vào lớp'."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={clearFilters}
              >
                Xoá bộ lọc
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected ? true : selectedStudents.length > 0 ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Chọn tất cả học sinh trên trang"
                      />
                    </TableHead>
                    <TableHead>Học sinh</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Lớp hiện tại</TableHead>
                    <TableHead>Ngày đăng ký</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const isSelected = selected.has(student.id)
                    return (
                      <TableRow
                        key={student.id}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(student.id)}
                            aria-label={`Chọn ${student.fullName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {initials(student.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {student.fullName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {student.phone || "Chưa có số điện thoại"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(student.email, "Đã sao chép email")
                            }
                            className="group flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                            title="Bấm để sao chép email"
                          >
                            {student.email}
                            <HugeiconsIcon
                              icon={Copy01Icon}
                              size={12}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                            />
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {student.classes.length === 0 ? (
                            <Badge variant="warning" withDot>
                              Chưa vào lớp
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {student.classes.map((cls) => (
                                <Badge
                                  key={cls.id}
                                  variant="neutral"
                                  title={`Mã lớp ${cls.code}`}
                                >
                                  {cls.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateShort(student.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                          >
                            <Link href={`/teacher/students/${student.id}/progress`}>
                              <HugeiconsIcon icon={Analytics01Icon} size={14} />
                              Tiến độ
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Trang{" "}
                <span className="font-mono font-semibold text-foreground">{page}</span>/
                <span className="font-mono">{totalPages}</span> · {meta?.total ?? 0} học sinh
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
