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
import { useCollectionTreeQuery } from "@/hooks/use-collections"
import type { IExamCurriculum } from "@/lib/api/types"

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
    curriculum?.orderIndex !== undefined ? String(curriculum.orderIndex) : "0"
  )

  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setCollectionName(curriculum?.collectionName ?? "")
      setTestNumber(curriculum?.testNumber ? String(curriculum.testNumber) : "1")
      setPart(curriculum?.part ? String(curriculum.part) : "1")
      setOrderIndex(
        curriculum?.orderIndex !== undefined ? String(curriculum.orderIndex) : "0"
      )
    }
  }

  // Fetch real collections tree from database
  const { data: tree = [] } = useCollectionTreeQuery(open)

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
      toast.success("Cập nhật thông tin bộ đề thành công!")
      onSuccess?.({
        collectionName: collectionName.trim() || undefined,
        testNumber: testNumber ? parseInt(testNumber, 10) : undefined,
        part: part ? parseInt(part, 10) : undefined,
        orderIndex: orderIndex ? parseInt(orderIndex, 10) : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể cập nhật bộ đề."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">
              Cài đặt Bộ đề & Vị trí bài thi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Định vị bài luyện tập theo bộ đề cụ thể (ví dụ: Cambridge › Cam 8, Test 1, Passage 1)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Thuộc bộ đề thi nào</Label>
              <select
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs"
              >
                <option value="">-- Chưa phân nhóm bộ đề --</option>
                {tree.map((root) => {
                  const hasChildren = root.children && root.children.length > 0
                  if (!hasChildren) {
                    return (
                      <option key={root._id} value={root.name}>
                        {root.name}
                      </option>
                    )
                  }
                  return (
                    <optgroup key={root._id} label={root.name}>
                      {root.children.map((child) => (
                        <option key={child._id} value={child.name}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
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
              {mutation.isPending ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
