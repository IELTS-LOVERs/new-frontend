"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/client"
import { getTeacherExamDetailApi, type DeleteExamResult } from "@/lib/api/exams"
import { useAuthStore } from "@/stores/auth.store"
import { useCloneExamMutation, useDeleteExamMutation } from "@/hooks/use-exams"

export interface DeleteExamTarget {
  id: string
  title: string
  status: "draft" | "published" | "closed"
  kind?: "practice" | "mock"
  hasAttempts?: boolean
  hasAssignments?: boolean
}

interface DeleteExamDialogProps {
  exam: DeleteExamTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (result: DeleteExamResult) => void
  /** Used in copy/toasts so the same dialog works for exams and practices. */
  entityLabel?: string
}

/**
 * #18: shared delete confirmation.
 *
 * - Teacher + attempts → blocked, suggests cloning.
 * - Teacher + published → blocked, suggests “Sửa” → draft.
 * - Admin + published or attempts → hard delete (force), requires typing the title.
 * - Otherwise a normal delete; assignments are removed together with the exam.
 */
export function DeleteExamDialog({
  exam,
  open,
  onOpenChange,
  onDeleted,
  entityLabel = "đề thi",
}: DeleteExamDialogProps) {
  const user = useAuthStore((state) => state.user)
  const deleteMutation = useDeleteExamMutation()
  const cloneMutation = useCloneExamMutation()
  const [confirmText, setConfirmText] = React.useState("")

  const isAdmin = user?.role === "admin"
  const [fetched, setFetched] = React.useState<{
    examId: string
    attempts: boolean
    assignments: boolean
  } | null>(null)

  // Flags come from the list endpoint; the detail page may not know them yet,
  // so fall back to the detail in that one case.
  const flags = React.useMemo(() => {
    if (exam?.hasAttempts !== undefined || exam?.hasAssignments !== undefined) {
      return {
        attempts: exam?.hasAttempts === true,
        assignments: exam?.hasAssignments === true,
      }
    }
    if (fetched && exam && fetched.examId === exam.id) {
      return { attempts: fetched.attempts, assignments: fetched.assignments }
    }
    return null
  }, [exam, fetched])

  const needsFlags = !!exam && flags === null
  const hasAttempts = flags?.attempts === true
  const blockedByAttempts = !isAdmin && hasAttempts
  const blockedByStatus = !isAdmin && exam?.status === "published"
  const teacherBlocked = blockedByAttempts || blockedByStatus
  const needsForce = isAdmin && (exam?.status === "published" || hasAttempts)
  const entityCap = entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)

  React.useEffect(() => {
    if (!open || !exam || flags !== null) return
    const examId = exam.id
    let cancelled = false
    getTeacherExamDetailApi(examId)
      .then((detail) => {
        if (cancelled) return
        setFetched({
          examId,
          attempts: detail.hasAttempts === true,
          assignments: detail.hasAssignments === true,
        })
      })
      .catch(() => {
        // Keep flags null: the primary button stays disabled so a blocked
        // delete never reaches the API. The server still enforces the rules.
      })
    return () => {
      cancelled = true
    }
  }, [open, exam, flags])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmText("")
      setFetched(null)
    }
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (!exam) return
    try {
      const result = await deleteMutation.mutateAsync({
        id: exam.id,
        force: needsForce,
      })
      const notes: string[] = []
      if (result.deletedAssignments > 0) {
        notes.push(`Đã xoá kèm ${result.deletedAssignments} bài tập đã giao.`)
      }
      if (result.deletedAttempts > 0) {
        notes.push(`Đã xoá ${result.deletedAttempts} bài làm của học sinh.`)
      }
      toast.success(`Đã xoá ${entityLabel}`, {
        description: notes.length > 0 ? notes.join(" ") : undefined,
      })
      setConfirmText("")
      onOpenChange(false)
      onDeleted?.(result)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : `Không thể xoá ${entityLabel}.`
      )
    }
  }

  const handleCloneAndClose = async () => {
    if (!exam) return
    try {
      await cloneMutation.mutateAsync(exam.id)
      toast.success(`Đã nhân bản ${entityLabel}. Bản mới đang ở trạng thái nháp.`)
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Không thể nhân bản ${entityLabel}.`)
    }
  }

  const confirmMismatch =
    needsForce && confirmText.trim() !== (exam?.title ?? "")

  return (
    <AlertDialog open={open && !!exam} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {teacherBlocked ? `Không thể xoá ${entityLabel}` : `Xoá ${entityLabel}?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-xs text-muted-foreground">
              {!teacherBlocked && (
                <p>
                  {entityCap} &quot;{exam?.title}&quot; sẽ bị xoá vĩnh viễn cùng
                  toàn bộ phần thi và câu hỏi{exam?.hasAssignments ? " và các bài tập đã giao" : ""}
                  . Hành động này không thể hoàn tác.
                </p>
              )}

              {blockedByAttempts && (
                <div className="space-y-2">
                  <p className="font-medium text-destructive">
                    {entityCap} &quot;{exam?.title}&quot; đã có học sinh làm bài
                    nên không thể xoá. Bạn có thể nhân bản {entityLabel} để tạo
                    bản mới.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-fit gap-1.5 text-xs font-semibold"
                    disabled={cloneMutation.isPending}
                    onClick={(event) => {
                      event.preventDefault()
                      void handleCloneAndClose()
                    }}
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={14} />
                    {cloneMutation.isPending ? "Đang nhân bản…" : "Nhân bản để tạo bản mới"}
                  </Button>
                </div>
              )}

              {blockedByStatus && (
                <p className="font-medium text-destructive">
                  {entityCap} &quot;{exam?.title}&quot; đã xuất bản nên không thể
                  xoá trực tiếp. Hãy dùng “Sửa” để chuyển về nháp trước.
                </p>
              )}

              {!teacherBlocked && exam?.hasAssignments && (
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Đã được giao cho lớp. Các bài tập đã giao kèm {entityLabel} này
                  cũng sẽ bị xoá theo.
                </p>
              )}

              {needsForce && (
                <>
                  <p className="font-medium text-destructive">
                    {hasAttempts
                      ? "Toàn bộ bài làm, điểm, nhận xét Writing và log chống gian lận sẽ bị xoá vĩnh viễn."
                      : "Học sinh đang giữ liên kết đề này sẽ không xem được nữa."}
                  </p>
                  <p className="pt-1 text-foreground">
                    Gõ chính xác tên {entityLabel} để xác nhận xoá cứng:
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    placeholder={exam?.title}
                    aria-label={`Gõ tên ${entityLabel} để xác nhận`}
                    autoComplete="off"
                    className="h-9 text-xs"
                  />
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-xs" disabled={deleteMutation.isPending}>
            {teacherBlocked ? "Đóng" : "Huỷ"}
          </AlertDialogCancel>
          {!teacherBlocked && (
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleConfirm()
              }}
              disabled={deleteMutation.isPending || needsFlags || confirmMismatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1" />
              {deleteMutation.isPending
                ? "Đang xoá…"
                : needsFlags
                  ? "Đang kiểm tra…"
                  : needsForce
                    ? "Xoá vĩnh viễn"
                    : "Xoá"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
