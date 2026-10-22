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
  Award01Icon,
  PlayIcon,
  Add01Icon,
  Calendar01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
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
  todo: "Không có đề thi nào cần làm. Đề thi mới được giao sẽ hiện ở đây.",
  in_progress: "Bạn không có đề thi nào đang làm dở.",
  done: "Chưa có đề thi nào đã nộp trong mục này.",
  expired: "Không có đề thi nào đã quá hạn.",
}

function AssignmentRow({ item }: { item: MyAssignment }) {
  const soon = isDeadlineSoon(item.deadline)

  const badge =
    item.submissionStatus === "in_progress" ? (
      <Badge
        variant="outline"
        className="text-[11px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
      >
        Đang làm dở
      </Badge>
    ) : item.submissionStatus === "submitted" ? (
      <StatusBadge status="completed" label="Đã nộp" />
    ) : item.submissionStatus === "expired" ? (
      <StatusBadge status="danger" label="Quá hạn" />
    ) : soon ? (
      <Badge
        variant="outline"
        className="text-[11px] font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
      >
        Sắp đến hạn
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="text-[11px] font-medium border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
      >
        Chưa làm
      </Badge>
    )

  const metaParts: string[] = []
  if (item.className) metaParts.push(item.className)
  if (item.teacherName) metaParts.push(item.teacherName)
  metaParts.push(`${item.durationMinutes} phút`)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-muted/30 transition-colors">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-heading text-sm font-semibold text-foreground truncate">
            {item.examTitle}
          </h4>
          {badge}
        </div>

        <p className="text-xs text-muted-foreground truncate">{metaParts.join(" • ")}</p>

        {item.deadline && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Calendar01Icon} size={13} className="shrink-0" />
            <span className={cn(soon && "text-amber-600 dark:text-amber-400 font-medium")}>
              {deadlineLabel(item.deadline)}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span>Hạn chót: {formatDateShort(item.deadline)}</span>
          </div>
        )}

        {item.submissionStatus === "submitted" && item.scores?.overallBand !== undefined && (
          <div className="text-xs font-medium text-primary">
            Điểm overall: {item.scores.overallBand}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {item.submissionStatus === "not_started" && (
          <Button asChild size="sm" className="gap-1.5 text-xs font-medium">
            <Link href={`/exam/start/${item.id}`}>
              <HugeiconsIcon icon={PlayIcon} size={14} />
              <span>Bắt đầu làm</span>
            </Link>
          </Button>
        )}

        {item.submissionStatus === "in_progress" && (
          <Button
            asChild
            size="sm"
            variant="default"
            className="gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Link href={item.attemptId ? `/exam/${item.attemptId}` : `/exam/start/${item.id}`}>
              <HugeiconsIcon icon={PlayIcon} size={14} />
              <span>Tiếp tục làm</span>
            </Link>
          </Button>
        )}

        {item.submissionStatus === "submitted" && item.attemptId && (
          <Button asChild size="sm" variant="outline" className="text-xs font-medium">
            <Link href={`/student/results/${item.attemptId}`}>Xem kết quả</Link>
          </Button>
        )}

        {item.submissionStatus === "expired" && (
          <Button size="sm" variant="outline" disabled className="text-xs font-medium opacity-60">
            Đã quá hạn
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

export default function StudentExamsPage() {
  const [classCode, setClassCode] = React.useState("")
  const [isJoinOpen, setIsJoinOpen] = React.useState(false)
  const [joinError, setJoinError] = React.useState<string | null>(null)

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault("todo").withOptions({ shallow: true })
  )

  const assignmentsQuery = useMyAssignmentsQuery({ kind: "mock" })
  const joinClassMutation = useJoinClassMutation()

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classCode.trim()) return
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

  const assignments = (assignmentsQuery.data ?? []).filter(
    (item) => !item.examKind || item.examKind === "mock"
  )

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
          { label: "Đề thi" },
        ]}
        title="Danh sách đề thi được giao"
        description="Theo dõi tiến độ làm đề thi chính thức (Mock test) từ giáo viên"
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

      {assignmentsQuery.isLoading ? (
        <AssignmentsSkeleton />
      ) : assignmentsQuery.isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Không tải được danh sách đề thi</p>
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
