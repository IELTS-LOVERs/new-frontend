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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  Video01Icon,
  File01Icon,
  Book02Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { useUpdateExamResourcesMutation } from "@/hooks/use-practice"
import type { IExamPostSubmissionResources, IExamVocabularyItem } from "@/lib/api/types"

interface ExamResourcesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  resources?: IExamPostSubmissionResources
  onSuccess?: (resources: IExamPostSubmissionResources) => void
}

export function ExamResourcesDialog({
  open,
  onOpenChange,
  examId,
  resources,
  onSuccess,
}: ExamResourcesDialogProps) {
  const [videoUrl, setVideoUrl] = React.useState(resources?.solutionVideoUrl ?? "")
  const [docUrl, setDocUrl] = React.useState(resources?.solutionDocumentUrl ?? "")
  const [notes, setNotes] = React.useState(resources?.solutionNotes ?? "")
  const [vocabList, setVocabList] = React.useState<IExamVocabularyItem[]>(
    resources?.vocabularyItems ?? []
  )

  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setVideoUrl(resources?.solutionVideoUrl ?? "")
      setDocUrl(resources?.solutionDocumentUrl ?? "")
      setNotes(resources?.solutionNotes ?? "")
      setVocabList(resources?.vocabularyItems ? [...resources.vocabularyItems] : [])
    }
  }

  const mutation = useUpdateExamResourcesMutation()

  const handleAddVocab = () => {
    setVocabList((prev) => [
      ...prev,
      { word: "", phonetic: "", meaning: "", contextSentence: "" },
    ])
  }

  const handleUpdateVocab = (
    index: number,
    field: keyof IExamVocabularyItem,
    value: string
  ) => {
    setVocabList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
  }

  const handleRemoveVocab = (index: number) => {
    setVocabList((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate videoUrl and docUrl if entered
    if (videoUrl && !/^https?:\/\//i.test(videoUrl.trim())) {
      toast.error("Link video phải bắt đầu bằng http:// hoặc https://")
      return
    }
    if (docUrl && !/^https?:\/\//i.test(docUrl.trim())) {
      toast.error("Link tài liệu phải bắt đầu bằng http:// hoặc https://")
      return
    }

    // Filter valid vocab items
    const validVocab = vocabList
      .map((item) => ({
        word: item.word.trim(),
        phonetic: item.phonetic?.trim() || undefined,
        meaning: item.meaning.trim(),
        contextSentence: item.contextSentence?.trim() || undefined,
      }))
      .filter((item) => item.word && item.meaning)

    const payload: Partial<IExamPostSubmissionResources> = {
      solutionVideoUrl: videoUrl.trim() || null,
      solutionDocumentUrl: docUrl.trim() || null,
      solutionNotes: notes.trim() || null,
      vocabularyItems: validVocab,
    }

    try {
      await mutation.mutateAsync({
        examId,
        payload,
      })
      toast.success("Cập nhật học liệu sau nộp thành công!")
      onSuccess?.({
        solutionVideoUrl: videoUrl.trim() || undefined,
        solutionDocumentUrl: docUrl.trim() || undefined,
        solutionNotes: notes.trim() || undefined,
        vocabularyItems: validVocab,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không thể cập nhật học liệu sau nộp."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSave} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">
              Học liệu sau nộp bài (Post-Submission Resources)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Học sinh sẽ được mở khóa video chữa bài, tài liệu giải thích và danh sách từ vựng trọng tâm ngay sau khi nộp bài.
            </DialogDescription>
          </DialogHeader>

          {/* Links & Video */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <HugeiconsIcon icon={Video01Icon} size={14} className="text-primary" />
                <span>Link Video giải chi tiết (YouTube / Vimeo)</span>
              </Label>
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <HugeiconsIcon icon={File01Icon} size={14} className="text-primary" />
                <span>Link Tài liệu đáp án chi tiết (PDF / Google Drive)</span>
              </Label>
              <Input
                type="url"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ghi chú & Lời giải thích tổng quát</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập lưu ý các bẫy thường gặp hoặc phân tích bài đọc..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Vocabulary items editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Book02Icon} size={16} className="text-primary" />
                <h4 className="text-xs font-semibold text-foreground">
                  Danh sách từ vựng trọng tâm ({vocabList.length})
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVocab}
                className="gap-1 text-xs h-7"
              >
                <HugeiconsIcon icon={Add01Icon} size={13} />
                <span>Thêm từ</span>
              </Button>
            </div>

            {vocabList.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                Chưa có từ vựng nào. Bấm &quot;Thêm từ&quot; để tạo danh sách từ mới cho bài này.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {vocabList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs relative"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={item.word}
                        onChange={(e) => handleUpdateVocab(idx, "word", e.target.value)}
                        placeholder="Từ vựng (ví dụ: mitigate)"
                        className="h-8 text-xs font-medium"
                        required
                      />
                      <Input
                        value={item.phonetic ?? ""}
                        onChange={(e) => handleUpdateVocab(idx, "phonetic", e.target.value)}
                        placeholder="Phiên âm (ví dụ: /ˈmɪtɪɡeɪt/)"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={item.meaning}
                        onChange={(e) => handleUpdateVocab(idx, "meaning", e.target.value)}
                        placeholder="Nghĩa tiếng Việt"
                        className="h-8 text-xs"
                        required
                      />
                      <Input
                        value={item.contextSentence ?? ""}
                        onChange={(e) =>
                          handleUpdateVocab(idx, "contextSentence", e.target.value)
                        }
                        placeholder="Câu ví dụ trong bài"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveVocab(idx)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
              {mutation.isPending ? "Đang lưu..." : "Lưu học liệu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
