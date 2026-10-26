"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button, type ButtonProps } from "@/components/ui/button"
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
import { Copy01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { ApiError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { getTeacherExamDetailApi } from "@/lib/api/exams"
import { useCloneExamMutation, useConvertExamToDraftMutation } from "@/hooks/use-exams"

interface EditExamButtonProps
  extends Omit<ButtonProps, "onClick" | "asChild" | "children"> {
  examId: string
  status: "draft" | "published" | "closed"
  /** Pass when the caller already knows the flags to skip the detail fetch. */
  hasAttempts?: boolean
  hasAssignments?: boolean
  label?: string
}

/**
 * #17: "Sửa" for a published/closed exam.
 *
 * - draft → open the editor directly.
 * - no attempts → convert to draft, then open the editor. If the exam is
 *   assigned to classes, warn that students lose access until re-published.
 * - attempts exist → offer "Nhân bản để sửa" instead (editing would change the
 *   exam students were graded against).
 */
export function EditExamButton({
  examId,
  status,
  hasAttempts,
  hasAssignments,
  label = "Sửa",
  ...buttonProps
}: EditExamButtonProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const convertMutation = useConvertExamToDraftMutation(examId)
  const cloneMutation = useCloneExamMutation()

  const knownFlags =
    hasAttempts !== undefined || hasAssignments !== undefined
      ? { attempts: hasAttempts === true, assignments: hasAssignments === true }
      : null
  const [flags, setFlags] = React.useState(knownFlags)
  const [resolving, setResolving] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [cloneOpen, setCloneOpen] = React.useState(false)

  const busy = resolving || convertMutation.isPending || cloneMutation.isPending

  const goToEditor = React.useCallback(
    (id: string = examId) => {
      router.push(`/teacher/exams/${id}/edit`)
    },
    [examId, router]
  )

  const runConvert = async () => {
    try {
      await convertMutation.mutateAsync()
      toast.success("Đã chuyển đề về nháp để chỉnh sửa.")
      goToEditor()
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_HAS_ATTEMPTS") {
        setConfirmOpen(false)
        setCloneOpen(true)
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể chuyển đề về nháp.")
      }
    }
  }

  const handleClick = async () => {
    if (status === "draft") {
      goToEditor()
      return
    }

    let resolved = flags
    if (!resolved) {
      setResolving(true)
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: queryKeys.exams.detail(examId),
          queryFn: () => getTeacherExamDetailApi(examId),
          staleTime: 30_000,
        })
        resolved = {
          attempts: detail.hasAttempts === true,
          assignments: detail.hasAssignments === true,
        }
        setFlags(resolved)
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Không tải được thông tin đề thi."
        )
        return
      } finally {
        setResolving(false)
      }
    }

    if (resolved.attempts) {
      setCloneOpen(true)
      return
    }
    if (resolved.assignments) {
      setConfirmOpen(true)
      return
    }
    await runConvert()
  }

  const handleClone = async () => {
    try {
      const created = await cloneMutation.mutateAsync(examId)
      setCloneOpen(false)
      toast.success("Đã nhân bản đề. Đang mở bản nháp để chỉnh sửa.")
      goToEditor(created.id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể nhân bản đề.")
    }
  }

  return (
    <>
      <Button {...buttonProps} isLoading={busy} onClick={handleClick}>
        <HugeiconsIcon icon={PencilEdit02Icon} size={13} className="mr-1" />
        {label}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển đề về nháp để chỉnh sửa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Đề này đang được giao cho lớp. Khi chuyển về nháp, học sinh sẽ tạm
                  thời không xem hoặc làm được cho đến khi bạn xuất bản lại.
                </p>
                <p className="font-medium text-foreground">
                  Kết quả của các lượt làm bài trước đó (nếu có) vẫn được giữ nguyên.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convertMutation.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void runConvert()
              }}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Đang chuyển…" : "Chuyển về nháp"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đề đã có học sinh làm bài</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Không thể chuyển đề đã có lượt làm bài về nháp vì sẽ làm thay đổi
                  nội dung và kết quả đã chấm.
                </p>
                <p className="font-medium text-foreground">
                  Bạn có muốn nhân bản đề để chỉnh sửa không? Bản gốc được giữ nguyên.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cloneMutation.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleClone()
              }}
              disabled={cloneMutation.isPending}
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} className="mr-1" />
              {cloneMutation.isPending ? "Đang nhân bản…" : "Nhân bản để sửa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
