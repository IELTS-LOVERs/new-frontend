"use client"

import * as React from "react"
import Link from "next/link"
import { parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ExamStatusBadge } from "@/components/shared/status-badge"
import { AttemptsCell } from "@/components/shared/attempts-cell"
import { DeleteExamDialog } from "@/components/shared/delete-exam-dialog"
import { EditExamButton } from "@/components/shared/edit-exam-button"
import { SkillBadges } from "@/components/shared/skill-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { ExamCurriculumDialog } from "@/features/exams/components/exam-curriculum-dialog"
import {
  buildPracticeBookFacets,
  groupPracticeItemsByBook,
  sortPracticeItems,
  type PracticeSortMode,
} from "@/features/practice/lib/practice-grouping"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  HeadphonesIcon,
  LayoutGridIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  Search01Icon,
  Settings02Icon,
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
import type { ExamListSort } from "@/lib/api/exams"
import type { ExamListItem, SkillType } from "@/lib/api/types"
import { useAuthStore } from "@/stores/auth.store"

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "closed", label: "Đã đóng" },
] as const

const SKILL_TABS = [
  { value: "reading", label: "Reading", icon: Book02Icon },
  { value: "listening", label: "Listening", icon: HeadphonesIcon },
  { value: "writing", label: "Writing", icon: PencilEdit02Icon },
  { value: "all", label: "Tất cả", icon: LayoutGridIcon },
] as const

const SORT_OPTIONS = [
  { value: "date_desc", label: "Ngày đăng: Mới nhất" },
  { value: "date_asc", label: "Ngày đăng: Cũ nhất" },
  { value: "title_asc", label: "Alphabet: A → Z" },
  { value: "title_desc", label: "Alphabet: Z → A" },
  { value: "collection_asc", label: "Giáo trình (A → Z)" },
] as const

/** Nhóm bộ đề phổ biến luôn có trong bộ lọc, kể cả khi trang hiện tại trống. */
const KNOWN_BOOK_GROUPS = ["Cambridge", "Vol", "Road to IELTS", "Actual Test"] as const

const PAGE_SIZE = 20

function toPracticeSortMode(sort: string): PracticeSortMode {
  if (sort === "date_asc" || sort === "title_asc" || sort === "title_desc") {
    return sort
  }
  return "date_desc"
}

function formatPostedDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("vi-VN")
}

export default function TeacherPracticesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "admin"

  const [skill, setSkill] = useQueryState(
    "skill",
    parseAsString.withDefault("reading").withOptions({ shallow: true })
  )
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("all").withOptions({ shallow: true })
  )
  const [group, setGroup] = useQueryState(
    "group",
    parseAsString.withDefault("all").withOptions({ shallow: true })
  )
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({ shallow: true })
  )
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("date_desc").withOptions({ shallow: true })
  )
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: true })
  )

  const [searchInput, setSearchInput] = React.useState(search)

  React.useEffect(() => {
    setSearchInput(search)
  }, [search])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== search) {
        setSearch(trimmed || null)
        setPage(null)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, search, setSearch, setPage])

  const [grouped, setGrouped] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ExamListItem | null>(null)
  const [closeTarget, setCloseTarget] = React.useState<ExamListItem | null>(null)
  const [curriculumTarget, setCurriculumTarget] = React.useState<ExamListItem | null>(null)

  const queryParams = React.useMemo(
    () => ({
      status: status !== "all" ? (status as "draft" | "published" | "closed") : undefined,
      kind: "practice" as const,
      skill: skill !== "all" ? (skill as SkillType) : undefined,
      collectionName: group !== "all" ? group : undefined,
      search: search.trim() || undefined,
      sort: sort as ExamListSort,
      page,
      limit: PAGE_SIZE,
    }),
    [status, skill, group, search, sort, page]
  )

  const examsQuery = useExamsQuery(queryParams, true)
  const cloneMutation = useCloneExamMutation()

  const items = React.useMemo(
    () => examsQuery.data?.items ?? [],
    [examsQuery.data]
  )
  const meta = examsQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1

  const practiceSortMode = toPracticeSortMode(sort)

  const sortedItems = React.useMemo(
    () => sortPracticeItems(items, practiceSortMode),
    [items, practiceSortMode]
  )

  const groupedSections = React.useMemo(
    () => groupPracticeItemsByBook(sortedItems, practiceSortMode),
    [sortedItems, practiceSortMode]
  )

  const groupOptions = React.useMemo(() => {
    const customGroups = buildPracticeBookFacets(items)
      .filter((facet) => facet.group.key.startsWith("custom:"))
      .map((facet) => facet.group.label)
    return Array.from(new Set<string>([...KNOWN_BOOK_GROUPS, ...customGroups]))
  }, [items])

  const handleSkillChange = (value: string) => {
    setSkill(value === "reading" ? null : value)
    setGroup(null)
    setPage(null)
  }

  const handleGroupChange = (value: string) => {
    setGroup(value === "all" ? null : value)
    setPage(null)
  }

  const handleSortChange = (value: string) => {
    setSort(value === "date_desc" ? null : value)
    setPage(null)
  }

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSearch(searchInput.trim() || null)
    setPage(null)
  }

  const clearFilters = () => {
    setSkill(null)
    setGroup(null)
    setSearch(null)
    setSearchInput("")
    setPage(null)
  }

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

  const renderExamRow = (item: ExamListItem) => (
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

      <TableCell className="py-3 font-mono text-muted-foreground">
        {formatPostedDate(item.createdAt)}
      </TableCell>

      <TableCell className="py-3">
        <ExamStatusBadge status={item.status} />
      </TableCell>

      <TableCell className="py-3 text-muted-foreground">
        <AttemptsCell
          attemptsCount={item.attemptsCount ?? 0}
          activeAttemptsCount={item.activeAttemptsCount ?? 0}
        />
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

              <DropdownMenuItem
                onClick={() => setCurriculumTarget(item)}
                className="gap-2"
              >
                <HugeiconsIcon icon={Settings02Icon} size={14} />
                <span>Cài đặt nhóm / Giáo trình</span>
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
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Bài luyện tập" },
        ]}
        title="Quản lý bài luyện tập (Practice)"
        description="Tạo và quản lý các bài luyện tập IELTS theo từng kỹ năng, bộ đề và giáo trình."
        actions={
          <Button asChild size="sm" className="gap-1.5 text-xs font-semibold">
            <Link href="/teacher/exams/new?kind=practice">
              <HugeiconsIcon icon={Add01Icon} size={15} />
              <span>Tạo bài luyện tập mới</span>
            </Link>
          </Button>
        }
      />

      {/* Skill header bar */}
      <div className="flex items-center gap-6 border-b border-border px-1 overflow-x-auto select-none">
        {SKILL_TABS.map((tab) => {
          const active = skill === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleSkillChange(tab.value)}
              className={cn(
                "flex items-center gap-2 pb-3 pt-1 text-sm font-semibold transition-all cursor-pointer relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={tab.icon}
                size={17}
                className={active ? "text-primary" : ""}
              />
              <span>{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Status tabs */}
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

      {/* Filter & sort toolbar */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm theo tên bài / giáo trình..."
                maxLength={200}
                className="h-9 pl-9 text-xs"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={group} onValueChange={handleGroupChange}>
                <SelectTrigger size="sm" className="w-44 text-xs">
                  <SelectValue placeholder="Nhóm bộ đề" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Tất cả nhóm
                  </SelectItem>
                  {groupOptions.map((option) => (
                    <SelectItem key={option} value={option} className="text-xs">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger size="sm" className="w-52 text-xs">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => setGrouped((value) => !value)}
                aria-pressed={grouped}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  grouped
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <HugeiconsIcon icon={LayoutGridIcon} size={13} />
                Hiển thị theo nhóm bộ đề
              </button>

              {(search || group !== "all" || skill !== "reading") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={clearFilters}
                >
                  Xoá bộ lọc
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
          description="Bắt đầu tạo bài luyện tập Listening, Reading hoặc Writing theo lộ trình để học sinh tự do ôn luyện."
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
                <TableHead className="w-[300px] text-xs font-semibold">Tên bài luyện tập</TableHead>
                <TableHead className="text-xs font-semibold">Giáo trình & Phần thi</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Kỹ năng</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold text-center">Thời lượng</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">Ngày đăng</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Trạng thái</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Lượt làm</TableHead>
                <TableHead className="w-[170px] text-right text-xs font-semibold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped
                ? groupedSections.map((section) => (
                    <React.Fragment key={section.group.key}>
                      <TableRow className="border-border/60 bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={8} className="py-2">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              icon={Book02Icon}
                              size={14}
                              className="text-primary"
                            />
                            <span className="text-xs font-bold text-foreground">
                              {section.group.label}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {section.items.length} bài
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {section.items.map(renderExamRow)}
                    </React.Fragment>
                  ))
                : sortedItems.map(renderExamRow)}
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

      {/* Curriculum Dialog */}
      <ExamCurriculumDialog
        open={!!curriculumTarget}
        onOpenChange={(open) => !open && setCurriculumTarget(null)}
        examId={curriculumTarget?.id ?? ""}
        curriculum={curriculumTarget?.curriculum}
        onSuccess={() => setCurriculumTarget(null)}
      />
    </div>
  )
}
