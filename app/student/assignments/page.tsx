"use client"

import * as React from "react"
import Link from "next/link"
import { parseAsString, useQueryState } from "nuqs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/page-header"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Book02Icon,
  PlayIcon,
  Add01Icon,
  Calendar01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { DEMO_STUDENT_ALL_ASSIGNMENTS } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { useMyAssignmentsQuery } from "@/hooks/use-assignments"
import { useJoinClassMutation } from "@/hooks/use-classes"
import { formatDateShort, deadlineLabel, isDeadlineSoon } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MyAssignment, SubmissionStatus } from "@/lib/api/types"

type TabValue = "todo" | "in_progress" | "done" | "expired"

const TAB_STATUS: Record<TabValue, SubmissionStatus> = {
  todo: "not_started",
  in_progress: "in_progress",
  done: "submitted",
  expired: "expired",
}

const EMPTY_MESSAGE: Record<TabValue, string> = {
  todo: "Không có bài tập nào cần làm. Bài mới được giao sẽ hiện ở đây.",
  in_progress: "Bạn không có bài nào đang làm dở.",
  done: "Chưa có bài thi nào đã nộp trong mục này.",
  expired: "Không có bài tập nào đã quá hạn.",
}

function AssignmentRow({ item }: { item: MyAssignment }) {
  const soon = isDeadlineSoon(item.deadline)

  const badge =
    item.submissionStatus === "in_progress" ? (
      <StatusBadge status="in_progress" label="Đang làm dở" />
    ) : item.submissionStatus === "submitted" ? (
      <StatusBadge status="success" label="Đã nộp" />
    ) : item.submissionStatus === "expired" ? (
      <StatusBadge status="danger" label="Đã quá hạn" />
    ) : (
      <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0">
        Chưa bắt đầu
      </Badge>
    )

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-muted/30 transition-colors">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">
            {item.examTitle}
          </span>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.className && (
            <>
              Lớp: <span className="font-medium text-foreground">{item.className}</span> ·{" "}
            </>
          )}
          GV: {item.teacherName} · Thời lượng: {item.durationMinutes} phút
        </p>
        <div
          className={cn(
            "text-xs font-medium flex items-center gap-1",
            soon ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <HugeiconsIcon icon={Calendar01Icon} size={13} />
          <span>
            Hạn nộp: {formatDateShort(item.deadline)}
            {item.deadline ? ` (${deadlineLabel(item.deadline)})` : ""}
          </span>
        </div>
      </div>

      <div className="sm:shrink-0">
        {item.submissionStatus === "not_started" ? (
          <Button asChild size="sm" variant="outline" className="gap-1.5 font-medium text-xs">
            <Link href={`/exam/start/${item.id}`}>
              <HugeiconsIcon icon={Book02Icon} size={14} />
              <span>Bắt đầu thi</span>
            </Link>
          </Button>
        ) : item.submissionStatus === "in_progress" && item.attemptId ? (
          <Button asChild size="sm" className="gap-1.5 font-medium text-xs">
            <Link href={`/exam/${item.attemptId}`}>
              <HugeiconsIcon icon={PlayIcon} size={14} />
              <span>Tiếp tục làm bài</span>
            </Link>
          </Button>
        ) : item.submissionStatus === "submitted" && item.attemptId ? (
          <Button asChild size="sm" variant="outline" className="gap-1.5 font-medium text-xs">
            <Link href={`/student/results/${item.attemptId}`}>
              <HugeiconsIcon icon={Book02Icon} size={14} />
              <span>Xem kết quả</span>
            </Link>
          </Button>
        ) : item.submissionStatus === "expired" && item.attemptId ? (
          <Button asChild size="sm" variant="outline" className="gap-1.5 font-medium text-xs">
            <Link href={`/student/results/${item.attemptId}`}>
              <HugeiconsIcon icon={Book02Icon} size={14} />
              <span>Xem kết quả</span>
            </Link>
          </Button>
        ) : item.submissionStatus === "expired" ? (
          <Button size="sm" variant="outline" disabled className="gap-1.5 font-medium text-xs">
            <span>Đã quá hạn</span>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="gap-1.5 font-medium text-xs">
            <Link href={`/exam/start/${item.id}`}>
              <HugeiconsIcon icon={Book02Icon} size={14} />
              <span>Bắt đầu thi</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function AssignmentsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-96 rounded-xl" />
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 sm:p-5 gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-80" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StudentAssignmentsPage() {
  const [classCode, setClassCode] = React.useState("")
  const [isJoinOpen, setIsJoinOpen] = React.useState(false)
  const [joinError, setJoinError] = React.useState<string | null>(null)

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault("todo").withOptions({ shallow: true })
  )

  const assignmentsQuery = useMyAssignmentsQuery({}, !USE_MOCKS)
  const joinClassMutation = useJoinClassMutation()

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classCode.trim()) return
    if (USE_MOCKS) {
      toast.success("Tham gia lớp học thành công!", {
        description: `Đã vào lớp với mã ${classCode.toUpperCase()}`,
      })
      setIsJoinOpen(false)
      setClassCode("")
      return
    }
    setJoinError(null)
    try {
      await joinClassMutation.mutateAsync(classCode.trim())
      toast.success("Tham gia lớp học thành công!")
      setIsJoinOpen(false)
      setClassCode("")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CLASS_CODE_INVALID") {
          setJoinError(err.message || "Mã lớp không hợp lệ. Vui lòng kiểm tra lại.")
        } else if (err.code === "STUDENT_ALREADY_IN_CLASS") {
          setJoinError(err.message || "Bạn đã tham gia lớp học này rồi.")
        } else {
          setJoinError(err.message)
        }
      } else {
        setJoinError("Không thể tham gia lớp học. Vui lòng thử lại.")
      }
    }
  }

  const assignments = USE_MOCKS
    ? DEMO_STUDENT_ALL_ASSIGNMENTS
    : (assignmentsQuery.data ?? [])

  const counts: Record<TabValue, number> = {
    todo: assignments.filter((a) => a.submissionStatus === "not_started").length,
    in_progress: assignments.filter((a) => a.submissionStatus === "in_progress").length,
    done: assignments.filter((a) => a.submissionStatus === "submitted").length,
    expired: assignments.filter((a) => a.submissionStatus === "expired").length,
  }

  const activeTab: TabValue = (["todo", "in_progress", "done", "expired"] as const).includes(
    tab as TabValue
  )
    ? (tab as TabValue)
    : "todo"

  const renderList = (tabValue: TabValue) => {
    const status = TAB_STATUS[tabValue]
    const items = assignments.filter((a) => a.submissionStatus === status)
    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground bg-card">
          {EMPTY_MESSAGE[tabValue]}
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
        {items.map((item) => (
          <AssignmentRow key={item.id} item={item} />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/student" },
          { label: "Bài tập" },
        ]}
        title="Danh sách bài tập & đề thi"
        description="Theo dõi tiến độ làm bài và thời hạn nộp bài từ giáo viên"
        actions={
          <Dialog
            open={isJoinOpen}
            onOpenChange={(open) => {
              setIsJoinOpen(open)
              if (!open) {
                setJoinError(null)
                setClassCode("")
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
                <HugeiconsIcon icon={Add01Icon} size={14} />
                <span>Tham gia lớp học</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <form onSubmit={handleJoinClass} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="font-heading text-base font-semibold">
                    Nhập mã lớp học
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Mã 6 ký tự do giáo viên cung cấp (ví dụ: FOUND1).
                  </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-2">
                  <Input
                    value={classCode}
                    onChange={(e) => {
                      setClassCode(e.target.value.toUpperCase())
                      if (joinError) setJoinError(null)
                    }}
                    placeholder="FOUND1"
                    maxLength={6}
                    className="font-mono text-center text-lg uppercase tracking-wider font-semibold h-11"
                    required
                  />
                  {joinError && (
                    <p className="text-xs text-destructive font-medium text-center">
                      {joinError}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    size="default"
                    className="w-full font-medium"
                    disabled={joinClassMutation.isPending}
                  >
                    {joinClassMutation.isPending ? "Đang tham gia..." : "Tham gia lớp"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {!USE_MOCKS && assignmentsQuery.isLoading ? (
        <AssignmentsSkeleton />
      ) : !USE_MOCKS && assignmentsQuery.isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Không tải được danh sách bài tập</p>
          <p className="text-xs text-muted-foreground">
            {assignmentsQuery.error instanceof ApiError
              ? assignmentsQuery.error.message
              : "Đã xảy ra lỗi. Vui lòng thử lại."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={() => assignmentsQuery.refetch()}
          >
            <HugeiconsIcon icon={RefreshIcon} size={14} />
            <span>Thử lại</span>
          </Button>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v === "todo" ? null : v)}
          className="w-full space-y-4"
        >
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="todo" className="text-xs">
              Cần làm ({counts.todo})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">
              Đang làm ({counts.in_progress})
            </TabsTrigger>
            <TabsTrigger value="done" className="text-xs">
              Đã nộp ({counts.done})
            </TabsTrigger>
            <TabsTrigger value="expired" className="text-xs">
              Quá hạn ({counts.expired})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo" className="space-y-3">
            {renderList("todo")}
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-3">
            {renderList("in_progress")}
          </TabsContent>

          <TabsContent value="done" className="space-y-3">
            {renderList("done")}
          </TabsContent>

          <TabsContent value="expired" className="space-y-3">
            {renderList("expired")}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
