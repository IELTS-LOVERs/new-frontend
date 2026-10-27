"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button, type ButtonProps } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit02Icon } from "@hugeicons/core-free-icons"

interface EditExamButtonProps
  extends Omit<ButtonProps, "onClick" | "asChild" | "children"> {
  examId: string
  /**
   * Kept for backwards compatibility with older callers. Editing is allowed in
   * every status now, so these flags no longer change the behaviour.
   */
  status?: "draft" | "published" | "closed"
  hasAttempts?: boolean
  hasAssignments?: boolean
  label?: string
}

/**
 * "Sửa" for any exam status.
 *
 * Drafts, published and closed exams all open the same editor. Published/closed
 * content is live, so the editor itself warns the teacher and asks for
 * confirmation when students are mid-attempt. Results already submitted are
 * frozen by the attempt snapshot.
 */
export function EditExamButton({
  examId,
  label = "Sửa",
  ...buttonProps
}: EditExamButtonProps) {
  const router = useRouter()

  return (
    <Button
      {...buttonProps}
      onClick={() => router.push(`/teacher/exams/${examId}/edit`)}
    >
      <HugeiconsIcon icon={PencilEdit02Icon} size={13} className="mr-1" />
      {label}
    </Button>
  )
}
