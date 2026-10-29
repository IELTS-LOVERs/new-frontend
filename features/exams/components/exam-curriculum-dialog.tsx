"use client"

import * as React from "react"
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
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { useUpdateExamCurriculumMutation } from "@/hooks/use-practice"
import type { IExamCurriculum } from "@/lib/api/types"
import { cn } from "@/lib/utils"

/** Nhóm bộ đề phổ biến để giáo viên chọn nhanh. */
const QUICK_COLLECTIONS = [
  "Cambridge",
  "Vol",
  "Road to IELTS",
  "Actual Test",
] as const

interface ExamCurriculumDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  curriculum?: IExamCurriculum
  onSuccess?: (curriculum: IExamCurriculum) => void
}

export function ExamCurriculumDialog({
  open,
  onOpenChange,
  examId,
  curriculum,
  onSuccess,
}: ExamCurriculumDialogProps) {
  const [collectionName, setCollectionName] = React.useState(
    curriculum?.collectionName ?? ""
  )
  const [testNumber, setTestNumber] = React.useState<string>(
    curriculum?.testNumber ? String(curriculum.testNumber) : "1"
  )
  const [part, setPart] = React.useState<string>(
    curriculum?.part ? String(curriculum.part) : "1"
  )
  const [orderIndex, setOrderIndex] = React.useState<string>(
    curriculum?.orderIndex !== undefined ? String(curriculum.orderIndex) : "1"
  )

  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setCollectionName(curriculum?.collectionName ?? "")
      setTestNumber(curriculum?.testNumber ? String(curriculum.testNumber) : "1")
      setPart(curriculum?.part ? String(curriculum.part) : "1")
      setOrderIndex(
        curriculum?.orderIndex !== undefined ? String(curriculum.orderIndex) : "1"
      )
    }
  }

  const mutation = useUpdateExamCurriculumMutation()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<IExamCurriculum> = {
      collectionName: collectionName.trim() || null,
      testNumber: testNumber ? parseInt(testNumber, 10) : null,
      part: part ? parseInt(part, 10) : null,
      orderIndex: orderIndex ? parseInt(orderIndex, 10) : null,
    }

    try {
      await mutation.mutateAsync({
        examId,
        payload,
      })
      toast.success("Cập nhật thông tin lộ trình thành công!")
      onSuccess?.({
        collectionName: collectionName.trim() || undefined,
        testNumber: testNumber ? parseInt(testNumber, 10) : undefined,
        part: part ? parseInt(part, 10) : undefined,
        orderIndex: orderIndex ? parseInt(orderIndex, 10) : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể cập nhật lộ trình."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">
              Cài đặt lộ trình giáo trình (Curriculum)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Định vị bài luyện tập theo bộ sách hoặc lộ trình (ví dụ: Cambridge IELTS 18, Test 1, Passage 1)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bộ đề / Giáo trình</Label>
              <Input
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Ví dụ: Cambridge IELTS 18"
                className="h-9 text-xs"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {QUICK_COLLECTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCollectionName(option)}
                    aria-pressed={collectionName === option}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      collectionName === option
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Test số</Label>
                <Input
                  type="number"
                  min={1}
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Part / Passage</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Thứ tự hiển thị</Label>
                <Input
                  type="number"
                  min={0}
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="text-xs font-medium"
            >
              {mutation.isPending ? "Đang lưu..." : "Lưu lộ trình"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
