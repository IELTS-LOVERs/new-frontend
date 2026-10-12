import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { AssignmentStatus, SubmissionStatus } from "@/lib/api/types"

type ExamStatus = "draft" | "published" | "closed"

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case "not_started":
      return <Badge variant="neutral" withDot>Chưa làm</Badge>
    case "in_progress":
      return <Badge variant="warning" withDot>Đang làm</Badge>
    case "submitted":
      return <Badge variant="success" withDot>Đã nộp</Badge>
    case "expired":
      return <Badge variant="destructive" withDot>Hết giờ</Badge>
  }
}

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  switch (status) {
    case "draft":
      return <Badge variant="neutral" withDot>Nháp</Badge>
    case "published":
      return <Badge variant="success" withDot>Đã xuất bản</Badge>
    case "closed":
      return <Badge variant="neutral" withDot>Đã đóng</Badge>
  }
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return status === "active" ? (
    <Badge variant="success" withDot>Đang mở</Badge>
  ) : (
    <Badge variant="neutral" withDot>Lưu trữ</Badge>
  )
}

export function WritingPendingBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={cn("gap-1 font-normal", className)}>
      <HugeiconsIcon icon={Clock01Icon} size={14} aria-hidden />
      Chờ chấm
    </Badge>
  )
}

export function SuspiciousBadge({ label = "Cần kiểm tra", className }: { label?: string; className?: string }) {
  return (
    <Badge variant="destructive" className={cn("gap-1 font-normal", className)}>
      <HugeiconsIcon icon={Alert02Icon} size={14} aria-hidden />
      {label}
    </Badge>
  )
}

export function StatusBadge({
  status = "neutral",
  label,
  className,
}: {
  status?: "success" | "warning" | "danger" | "neutral" | "info" | "in_progress" | "completed"
  label?: React.ReactNode
  className?: string
}) {
  let variant: "success" | "warning" | "destructive" | "neutral" | "secondary" = "neutral"
  if (status === "success" || status === "completed") variant = "success"
  else if (status === "warning" || status === "in_progress") variant = "warning"
  else if (status === "danger") variant = "destructive"
  else if (status === "info") variant = "secondary"

  return (
    <Badge variant={variant} withDot className={className}>
      {label}
    </Badge>
  )
}

