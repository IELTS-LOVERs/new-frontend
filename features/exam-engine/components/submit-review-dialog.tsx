"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { computeSectionReviews } from "@/features/exam-engine/lib/exam-flow"
import { useExamSessionStore } from "@/stores/exam-session.store"

export interface SubmitReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exam: NonNullable<ReturnType<typeof useExamSessionStore.getState>["exam"]>
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onConfirm: () => void
  submitting: boolean
}

export function SubmitReviewDialog({
  open,
  onOpenChange,
  exam,
  answers,
  flagged,
  onConfirm,
  submitting,
}: SubmitReviewDialogProps) {
  const sections = React.useMemo(() => {
    if (!open) return []
    return computeSectionReviews(exam, answers, flagged)
  }, [open, exam, answers, flagged])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            Xác nhận nộp bài thi
          </DialogTitle>
          <DialogDescription className="text-xs">
            Vui lòng rà soát lại tiến độ làm bài trước khi gửi kết quả cuối
            cùng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-3">
            {sections.map(
              ({
                section: sec,
                total,
                answered,
                flaggedCount,
                isWriting,
                wordCounts,
              }) => (
                <div
                  key={`${sec.skill}-${sec.part}`}
                  className="flex justify-between font-medium"
                >
                  <span className="capitalize">
                    {sec.skill} {sec.part ? `· Part ${sec.part}` : ""} ({total}{" "}
                    câu)
                  </span>
                  {isWriting ? (
                    <span className="font-mono text-muted-foreground">
                      {wordCounts
                        .map((w, i) => `Task ${i + 1}: ${w} từ`)
                        .join(" · ")}
                    </span>
                  ) : (
                    <span className="font-mono text-emerald-600">
                      {answered} / {total} đã làm
                      {flaggedCount > 0 && (
                        <span className="text-amber-600">
                          {" "}
                          · {flaggedCount} đánh dấu
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Sau khi xác nhận nộp bài, hệ thống sẽ tự động chấm điểm Listening &
            Reading. Bạn sẽ không thể tiếp tục chỉnh sửa bài làm.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Quay lại làm tiếp
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={submitting}
            className="font-bold"
          >
            {submitting ? "Đang nộp…" : "Nộp bài ngay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
