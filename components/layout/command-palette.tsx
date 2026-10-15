"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Analytics01Icon,
  Award01Icon,
  Book02Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Folder02Icon,
  PencilEdit02Icon,
  Search01Icon,
  Settings01Icon,
  SparklesIcon,
  Task01Icon,
  UserIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { USE_MOCKS } from "@/lib/api/config"
import { useClassesQuery } from "@/hooks/use-classes"
import { useExamsQuery } from "@/hooks/use-exams"
import { DEMO_CLASSES, DEMO_EXAMS } from "@/mocks/demo-data"

interface CommandItem {
  id: string
  label: string
  group: string
  href: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  keywords?: string
}

const STUDENT_PAGES: CommandItem[] = [
  { id: "s-home", label: "Tổng quan", group: "Điều hướng", href: "/student", icon: DashboardSquare01Icon },
  { id: "s-assign", label: "Bài tập", group: "Điều hướng", href: "/student/assignments", icon: Book02Icon },
  { id: "s-results", label: "Kết quả", group: "Điều hướng", href: "/student/results", icon: Award01Icon },
  { id: "s-progress", label: "Tiến độ", group: "Điều hướng", href: "/student/progress", icon: Analytics01Icon },
  { id: "s-profile", label: "Hồ sơ", group: "Điều hướng", href: "/student/profile", icon: UserIcon },
]

const TEACHER_PAGES: CommandItem[] = [
  { id: "t-home", label: "Tổng quan", group: "Điều hướng", href: "/teacher", icon: DashboardSquare01Icon },
  { id: "t-classes", label: "Lớp học", group: "Điều hướng", href: "/teacher/classes", icon: UserIcon },
  { id: "t-assign", label: "Đợt giao bài", group: "Điều hướng", href: "/teacher/assignments", icon: Book02Icon },
  { id: "t-submissions", label: "Bài nộp & Chấm điểm", group: "Điều hướng", href: "/teacher/submissions", icon: Award01Icon },
  { id: "t-exams", label: "Đề thi", group: "Điều hướng", href: "/teacher/exams", icon: PencilEdit02Icon },
  { id: "t-questions", label: "Ngân hàng câu hỏi", group: "Điều hướng", href: "/teacher/questions", icon: Folder02Icon },
  { id: "t-media", label: "Thư viện Media", group: "Điều hướng", href: "/teacher/media", icon: Folder02Icon },
  { id: "t-analytics", label: "Thống kê", group: "Điều hướng", href: "/teacher/analytics", icon: Analytics01Icon },
  { id: "t-settings", label: "Cài đặt", group: "Điều hướng", href: "/teacher/settings", icon: Settings01Icon },
]

const ADMIN_PAGES: CommandItem[] = [
  { id: "a-users", label: "Quản lý người dùng", group: "Quản trị", href: "/admin/users", icon: UserIcon },
]

const QUICK_ACTIONS: CommandItem[] = [
  { id: "a-exam", label: "Tạo đề thi mới", group: "Hành động nhanh", href: "/teacher/exams/new", icon: Add01Icon },
  { id: "a-question", label: "Tạo câu hỏi mới", group: "Hành động nhanh", href: "/teacher/questions?open=new", icon: SparklesIcon },
  { id: "a-assign", label: "Giao bài", group: "Hành động nhanh", href: "/teacher/assignments?action=assign", icon: Task01Icon },
  { id: "a-grade", label: "Chấm bài tiếp theo", group: "Hành động nhanh", href: "/teacher/grading/att-grade-01", icon: FileEditIcon },
]

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}

export function CommandPalette({
  open,
  onOpenChange,
  isTeacher,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isTeacher: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)

  const isAdmin = pathname.startsWith("/admin")

  // Load real data when USE_MOCKS is false; fallback to DEMO_* ONLY when USE_MOCKS is true
  const classesQuery = useClassesQuery(!USE_MOCKS && open && isTeacher)
  const examsQuery = useExamsQuery({ limit: 50 }, !USE_MOCKS && open && isTeacher)

  const realClasses = USE_MOCKS ? DEMO_CLASSES : (classesQuery.data ?? [])
  const realExams = USE_MOCKS ? DEMO_EXAMS : (examsQuery.data?.items ?? [])

  const classItems: CommandItem[] = React.useMemo(
    () =>
      realClasses.map((c) => ({
        id: `class-${c.id}`,
        label: c.name,
        group: "Lớp học",
        href: `/teacher/classes/${c.id}`,
        icon: UserGroupIcon,
        keywords: c.code,
      })),
    [realClasses]
  )

  const examItems: CommandItem[] = React.useMemo(
    () =>
      realExams.map((e) => ({
        id: `exam-${e.id}`,
        label: e.title,
        group: "Đề thi",
        href: e.status === "draft" ? `/teacher/exams/${e.id}/edit` : `/teacher/exams/${e.id}`,
        icon: PencilEdit02Icon,
        keywords: e.status,
      })),
    [realExams]
  )

  const allItems = React.useMemo(() => {
    if (isAdmin) {
      return [...ADMIN_PAGES, ...TEACHER_PAGES, ...classItems, ...examItems]
    }
    if (isTeacher) {
      return [...QUICK_ACTIONS, ...TEACHER_PAGES, ...classItems, ...examItems]
    }
    return STUDENT_PAGES
  }, [isAdmin, isTeacher, classItems, examItems])

  const filtered = React.useMemo(() => {
    const q = removeAccents(query.trim())
    if (!q) return allItems
    return allItems.filter(
      (item) =>
        removeAccents(item.label).includes(q) ||
        (item.keywords ? removeAccents(item.keywords).includes(q) : false)
    )
  }, [allItems, query])

  // Reset state when opening/closing
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery("")
      setActiveIndex(0)
    }
  }

  const [prevQuery, setPrevQuery] = React.useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActiveIndex(0)
  }

  const groups = React.useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    filtered.forEach((item) => {
      const arr = map.get(item.group) ?? []
      arr.push(item)
      map.set(item.group, arr)
    })
    return Array.from(map.entries())
  }, [filtered])

  const flat = groups.flatMap(([, items]) => items)

  const run = (item: CommandItem) => {
    onOpenChange(false)
    router.push(item.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = flat[activeIndex]
      if (item) run(item)
    }
  }

  let runningIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Bảng lệnh nhanh</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <HugeiconsIcon icon={Search01Icon} size={17} className="text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm trang, lớp, đề thi hoặc hành động..."
            className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <Badge variant="outline" className="font-mono text-[10px]">ESC</Badge>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy kết quả cho “{query}”.
            </p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {items.map((item) => {
                  runningIndex += 1
                  const isActive = runningIndex === activeIndex
                  const index = runningIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                      )}
                    >
                      <HugeiconsIcon
                        icon={item.icon}
                        size={17}
                        className={isActive ? "text-primary" : "text-muted-foreground"}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <Badge variant="outline" className="font-mono text-[10px]">↵</Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
