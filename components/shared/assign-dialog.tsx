"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { useExamsQuery } from "@/hooks/use-exams"
import { useClassesQuery, useClassDetailQuery } from "@/hooks/use-classes"
import { useCreateAssignmentMutation } from "@/hooks/use-assignments"
import type { CreateAssignmentPayload } from "@/lib/api/assignments"
import { initials } from "@/lib/format"

export interface AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialExamId?: string
  initialClassId?: string
  initialStudentId?: string
}

const DEFAULT_DEADLINE = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`
}

export function AssignDialog({
  open,
  onOpenChange,
  initialExamId,
  initialClassId,
  initialStudentId,
}: AssignDialogProps) {
  const router = useRouter()

  // ── Data sources ──────────────────────────────────────────────────────────
  const examsQuery = useExamsQuery({ status: "published", kind: "mock" })
  const classesQuery = useClassesQuery()

  const publishedExams = examsQuery.data?.items ?? []

  const classes = classesQuery.data ?? []

  const [examId, setExamId] = React.useState(initialExamId ?? "")
  const [target, setTarget] = React.useState<"class" | "students">(
    initialStudentId ? "students" : "class"
  )
  const [classId, setClassId] = React.useState(initialClassId ?? "")
  const [studentIds, setStudentIds] = React.useState<string[]>(
    initialStudentId ? [initialStudentId] : []
  )
  const [deadline, setDeadline] = React.useState(DEFAULT_DEADLINE())
  const [unlimited, setUnlimited] = React.useState(false)
  const [maxAttempts, setMaxAttempts] = React.useState("1")
  const [shuffle, setShuffle] = React.useState(false)
  const [showScores, setShowScores] = React.useState(true)
  const [advanced, setAdvanced] = React.useState(false)

  // G12: tiến trình giao cho nhiều học sinh (gửi tuần tự)
  const [submitting, setSubmitting] = React.useState(false)
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null)

  const classDetailQuery = useClassDetailQuery(classId, target === "students" && !!classId)

  // Reset form khi dialog chuyển từ đóng → mở (setState trong render theo props thay đổi —
  // pattern "adjusting state during render" của React, không dùng effect)
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setExamId(initialExamId ?? publishedExams[0]?.id ?? "")
      setClassId(initialClassId ?? classes[0]?.id ?? "")
      setTarget(initialStudentId ? "students" : "class")
      setStudentIds(initialStudentId ? [initialStudentId] : [])
      setProgress(null)
    }
  }

  const roster = classDetailQuery.data?.students ?? []

  const selectedExam = publishedExams.find((e) => e.id === examId)
  const selectedClass = classes.find((c) => c.id === classId)
  const recipientCount = target === "class" ? selectedClass?.studentsCount ?? 0 : studentIds.length

  const createMutation = useCreateAssignmentMutation()

  const toggleStudent = (id: string) => {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const buildPayload = (studentId?: string): CreateAssignmentPayload => ({
    examId,
    classId: target === "class" ? classId : undefined,
    studentId,
    deadline: unlimited ? undefined : new Date(deadline).toISOString(),
    maxAttempts: Number(maxAttempts),
    shuffleQuestions: shuffle,
    showScoreAfterSubmit: showScores,
  })

  const handleSubmit = async () => {
    if (!examId) {
      toast.error("Vui lòng chọn đề thi cần giao")
      return
    }
    if (target === "class" && !classId) {
      toast.error("Vui lòng chọn lớp học")
      return
    }
    if (target === "students" && studentIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một học sinh")
      return
    }

    setSubmitting(true)
    try {
      if (target === "class") {
        const created = await createMutation.mutateAsync(buildPayload())
        toast.success("Đã giao bài!", {
          description: `${selectedExam?.title} · lớp ${selectedClass?.name}`,
          action: {
            label: "Xem tiến độ",
            onClick: () => router.push(`/teacher/assignments/${created.id}`),
          },
        })
      } else {
        // G12 fallback: gửi tuần tự từng studentId, hiển thị tiến trình
        const total = studentIds.length
        setProgress({ done: 0, total })
        let lastCreatedId: string | null = null
        let failCount = 0
        for (let i = 0; i < studentIds.length; i++) {
          try {
            const created = await createMutation.mutateAsync(buildPayload(studentIds[i]))
            lastCreatedId = created.id
          } catch (err) {
            failCount++
            if (err instanceof ApiError && err.code === "EXAM_NOT_PUBLISHED") {
              toast.error("Đề chưa xuất bản")
              break
            }
          }
          setProgress({ done: i + 1, total })
        }
        if (failCount === 0) {
          toast.success("Đã giao bài!", {
            description: `${selectedExam?.title} · ${total} học sinh`,
            action: lastCreatedId
              ? {
                  label: "Xem tiến độ",
                  onClick: () => router.push(`/teacher/assignments/${lastCreatedId}`),
                }
              : undefined,
          })
        } else {
          toast.warning(`Đã giao ${total - failCount}/${total} học sinh. Một số học sinh bị lỗi.`)
        }
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EXAM_NOT_PUBLISHED") {
          toast.error("Đề chưa xuất bản")
        } else if (err.code === "VALIDATION_ERROR") {
          toast.error(err.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.")
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error("Không thể giao bài. Vui lòng thử lại.")
      }
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Giao bài cho học sinh</DialogTitle>
          <DialogDescription className="text-xs">
            Chọn đề thi, đối tượng nhận bài, hạn nộp và tuỳ chọn nâng cao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Đề thi</Label>
            {examsQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={examId} onValueChange={setExamId} disabled={submitting}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn đề thi đã xuất bản" />
                </SelectTrigger>
                <SelectContent>
                  {publishedExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Giao cho</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTarget("class")}
                disabled={submitting}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  target === "class"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                Cả lớp
              </button>
              <button
                type="button"
                onClick={() => setTarget("students")}
                disabled={submitting}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  target === "students"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                )}
              >
                Học sinh cụ thể
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Lớp học</Label>
            {classesQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={classId}
                onValueChange={(v) => {
                  setClassId(v)
                  setStudentIds([])
                }}
                disabled={submitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn lớp" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.studentsCount} học sinh
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {target === "students" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Chọn học sinh ({studentIds.length})</Label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() =>
                    setStudentIds(
                      studentIds.length === roster.length ? [] : roster.map((s) => s.id)
                    )
                  }
                >
                  {studentIds.length === roster.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {classDetailQuery.isLoading ? (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                ) : roster.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Lớp chưa có học sinh.
                  </p>
                ) : (
                  roster.map((student) => {
                    const checked = studentIds.includes(student.id)
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        disabled={submitting}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                          checked ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded border",
                            checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          )}
                        >
                          {checked && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />}
                        </span>
                        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {initials(student.fullName)}
                        </span>
                        <span className="flex-1 truncate text-xs font-medium">{student.fullName}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{student.email}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hạn nộp</Label>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => setUnlimited(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                  disabled={submitting}
                />
                Không giới hạn
              </label>
            </div>
            <Input
              type="datetime-local"
              value={deadline}
              disabled={unlimited || submitting}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <Separator />

          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold text-foreground"
          >
            <span>Tuỳ chọn nâng cao</span>
            <HugeiconsIcon icon={advanced ? ArrowUp01Icon : ArrowDown01Icon} size={14} />
          </button>

          {advanced && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Số lượt làm tối đa</Label>
                <Select value={maxAttempts} onValueChange={setMaxAttempts} disabled={submitting}>
                  <SelectTrigger size="sm" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                      <SelectItem key={n} value={n}>
                        {n} lượt
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="size-3.5 accent-[var(--primary)]" disabled={submitting} />
                Trộn thứ tự câu hỏi
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={showScores} onChange={(e) => setShowScores(e.target.checked)} className="size-3.5 accent-[var(--primary)]" disabled={submitting} />
                Hiện điểm ngay sau khi nộp
              </label>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <HugeiconsIcon icon={Task01Icon} size={16} className="mt-0.5 text-primary" />
            <p className="text-xs text-foreground/90">
              Giao <span className="font-semibold">{selectedExam?.title ?? "—"}</span> cho{" "}
              <span className="font-semibold">{recipientCount} học sinh</span>
              {target === "class" && selectedClass ? ` lớp ${selectedClass.name}` : ""} ·{" "}
              {unlimited ? "không giới hạn thời gian" : `hạn ${deadline.replace("T", " ")}`}.
            </p>
          </div>

          {progress && (
            <p className="text-xs font-mono text-muted-foreground">
              Đang giao: {progress.done}/{progress.total} học sinh...
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} className="gap-2 font-semibold" disabled={submitting}>
            <HugeiconsIcon icon={Task01Icon} size={16} />
            {submitting ? "Đang giao..." : "Giao bài"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
