"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowLeft01Icon,
  Book02Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { SkillBadges } from "@/components/shared/skill-badges"
import { ExamStatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import {
  useAddExamsToCollectionMutation,
  useCollectionDetailQuery,
  useRemoveExamFromCollectionMutation,
  useUpdateExamInCollectionMutation,
} from "@/hooks/use-collections"
import { useExamsQuery } from "@/hooks/use-exams"
import type { CollectionDetailExam, SkillType } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collectionId = params.collectionId as string

  const { data, isLoading, error } = useCollectionDetailQuery(collectionId)
  const collection = data?.collection
  const exams = data?.exams || []

  // Add Exams Dialog State
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [examSearch, setExamSearch] = React.useState("")
  const [examSkillFilter, setExamSkillFilter] = React.useState<string>("all")
  const [selectedExamIds, setSelectedExamIds] = React.useState<string[]>([])
  const [targetTestNumber, setTargetTestNumber] = React.useState("1")
  const [targetPart, setTargetPart] = React.useState("1")

  // Available Exams from Exam Library (mock + practice)
  const { data: availableExamsData, isLoading: loadingAvailable } = useExamsQuery(
    {
      limit: 100,
      search: examSearch.trim() || undefined,
      skill: examSkillFilter !== "all" ? (examSkillFilter as SkillType) : undefined,
    },
    addDialogOpen
  )

  // Edit Position Dialog State
  const [editExamDialogOpen, setEditExamDialogOpen] = React.useState(false)
  const [editingExam, setEditingExam] = React.useState<CollectionDetailExam | null>(null)
  const [editTestNumber, setEditTestNumber] = React.useState("1")
  const [editPart, setEditPart] = React.useState("1")
  const [editOrderIndex, setEditOrderIndex] = React.useState("0")

  // Remove Exam Dialog State
  const [removingExam, setRemovingExam] = React.useState<CollectionDetailExam | null>(null)

  const addMutation = useAddExamsToCollectionMutation()
  const updateExamMutation = useUpdateExamInCollectionMutation()
  const removeExamMutation = useRemoveExamFromCollectionMutation()

  // Group exams by testNumber
  const groupedExams = React.useMemo(() => {
    const groups: Record<string, CollectionDetailExam[]> = {}
    for (const exam of exams) {
      const testNum = exam.curriculum?.testNumber
      const groupKey = testNum ? `Test ${testNum}` : "Chưa phân Test"
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(exam)
    }

    // Sort group keys: Test 1, Test 2, ..., Chưa phân Test last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Chưa phân Test") return 1
      if (b === "Chưa phân Test") return -1
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0
      return numA - numB
    })

    return sortedKeys.map((key) => ({
      testName: key,
      items: groups[key],
    }))
  }, [exams])

  const handleOpenAddDialog = () => {
    setSelectedExamIds([])
    setTargetTestNumber("1")
    setTargetPart("1")
    setExamSearch("")
    setExamSkillFilter("all")
    setAddDialogOpen(true)
  }

  const handleToggleSelectExam = (id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleAddExams = async () => {
    if (selectedExamIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 bài thi để thêm vào bộ đề")
      return
    }

    try {
      await addMutation.mutateAsync({
        id: collectionId,
        payload: {
          examIds: selectedExamIds,
          testNumber: parseInt(targetTestNumber, 10) || 1,
          part: parseInt(targetPart, 10) || 1,
        },
      })
      toast.success(`Đã thêm ${selectedExamIds.length} bài thi vào bộ đề`)
      setAddDialogOpen(false)
      setSelectedExamIds([])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể thêm đề thi vào bộ đề")
      }
    }
  }

  const handleOpenEditExam = (exam: CollectionDetailExam) => {
    setEditingExam(exam)
    setEditTestNumber(String(exam.curriculum?.testNumber ?? 1))
    setEditPart(String(exam.curriculum?.part ?? 1))
    setEditOrderIndex(String(exam.curriculum?.orderIndex ?? 0))
    setEditExamDialogOpen(true)
  }

  const handleSaveExamPosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam) return

    try {
      await updateExamMutation.mutateAsync({
        id: collectionId,
        examId: editingExam._id,
        payload: {
          testNumber: parseInt(editTestNumber, 10) || 1,
          part: parseInt(editPart, 10) || 1,
          orderIndex: parseInt(editOrderIndex, 10) || 0,
        },
      })
      toast.success("Cập nhật vị trí bài thi thành công")
      setEditExamDialogOpen(false)
      setEditingExam(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể cập nhật bài thi")
      }
    }
  }

  const handleRemoveExam = async () => {
    if (!removingExam) return

    try {
      await removeExamMutation.mutateAsync({
        id: collectionId,
        examId: removingExam._id,
      })
      toast.success("Đã gỡ bài thi khỏi bộ đề")
      setRemovingExam(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể gỡ bài thi")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-96" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Book02Icon}
          title="Không tìm thấy nhóm bộ đề"
          description="Nhóm bộ đề này có thể đã bị xoá hoặc đường dẫn không hợp lệ."
          action={
            <Button onClick={() => router.push("/teacher/collections")} className="gap-2">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Quay lại danh sách bộ đề
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/teacher/collections"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          <span>Danh sách bộ đề</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{collection.name}</span>
      </div>

      <PageHeader
        title={collection.name}
        description={
          collection.description ||
          "Quản lý cơ cấu các bài thi (Test 1, Test 2...), phân chia kỹ năng và thứ tự các bài thi trong bộ đề."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleOpenAddDialog} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Thêm đề vào bộ đề
            </Button>
          </div>
        }
      />

      {/* Overview Stat Badges */}
      <div className="flex flex-wrap items-center gap-3 border-y py-3 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Phân loại:</span>
          <Badge variant="secondary" className="font-medium capitalize">
            {collection.category}
          </Badge>
        </div>
        <span className="text-muted-foreground">•</span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Tổng số bài thi:</span>
          <span className="font-semibold text-foreground">{exams.length} bài</span>
        </div>
      </div>

      {/* Exams Sections grouped by Test */}
      {groupedExams.length === 0 ? (
        <EmptyState
          icon={Book02Icon}
          title="Bộ đề chưa có bài thi nào"
          description="Nhấn 'Thêm đề vào bộ đề' để bắt đầu xếp các đề thi vào bộ đề này."
          action={
            <Button onClick={handleOpenAddDialog} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Thêm đề vào bộ đề
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedExams.map((group) => (
            <Card key={group.testName} className="overflow-hidden border border-border/80">
              <CardHeader className="bg-muted/30 py-3.5 px-5 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full bg-primary" />
                  {group.testName}
                  <Badge variant="outline" className="text-xs font-normal">
                    {group.items.length} bài thi
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60">
                {group.items.map((exam) => {
                  const skills = Array.from(new Set(exam.sections.map((s) => s.skill))) as SkillType[]
                  const partNum = exam.curriculum?.part
                  return (
                    <div
                      key={exam._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SkillBadges skills={skills} />
                          {partNum !== undefined && (
                            <Badge variant="outline" className="text-xs bg-background">
                              {skills.includes("reading") ? `Passage ${partNum}` : `Part ${partNum}`}
                            </Badge>
                          )}
                          <ExamStatusBadge status={exam.status} />
                          <span className="text-xs text-muted-foreground">
                            {exam.durationMinutes}p
                          </span>
                        </div>
                        <div className="font-medium text-foreground text-sm truncate">
                          {exam.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                            >
                              <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditExam(exam)}>
                              <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-4" />
                              Đổi vị trí (Test / Part / Thứ tự)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setRemovingExam(exam)}
                              className="text-destructive focus:text-destructive"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="mr-2 size-4" />
                              Gỡ khỏi bộ đề
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Add Exams To Collection */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Thêm đề thi vào bộ đề &quot;{collection.name}&quot;</DialogTitle>
            <DialogDescription>
              Chọn các bài thi từ kho đề để gắn vào bộ đề này và thiết lập Test / Part.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Config Inputs */}
          <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/20">
            <div className="space-y-1">
              <Label className="text-xs">Gán vào Test số</Label>
              <Input
                type="number"
                min="1"
                value={targetTestNumber}
                onChange={(e) => setTargetTestNumber(e.target.value)}
                placeholder="1"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gán vào Part / Passage số</Label>
              <Input
                type="number"
                min="1"
                max="4"
                value={targetPart}
                onChange={(e) => setTargetPart(e.target.value)}
                placeholder="1"
                className="h-8"
              />
            </div>
          </div>

          {/* Filters for picking exams */}
          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1">
              <HugeiconsIcon
                icon={Search01Icon}
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                placeholder="Tìm đề thi trong kho..."
                className="pl-9 h-8 text-sm"
              />
            </div>
            <select
              value={examSkillFilter}
              onChange={(e) => setExamSkillFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm h-8"
            >
              <option value="all">Tất cả kỹ năng</option>
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="writing">Writing</option>
            </select>
          </div>

          {/* Available exams list */}
          <div className="flex-1 overflow-y-auto border rounded-md divide-y max-h-[320px]">
            {loadingAvailable ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : !availableExamsData?.items || availableExamsData.items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Không tìm thấy bài thi nào phù hợp.
              </div>
            ) : (
              availableExamsData.items.map((ex) => {
                const isSelected = selectedExamIds.includes(ex.id)
                const isAlreadyInCollection = exams.some((e) => e._id === ex.id)
                const skills = ex.skills || []

                return (
                  <div
                    key={ex.id}
                    onClick={() => handleToggleSelectExam(ex.id)}
                    className={`flex items-center gap-3 p-3 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/5 border-l-4 border-l-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelectExam(ex.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <SkillBadges skills={skills} />
                        {isAlreadyInCollection && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Đang trong bộ đề này
                          </Badge>
                        )}
                        {ex.curriculum?.collectionName && !isAlreadyInCollection && (
                          <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                            {ex.curriculum.collectionName}
                          </Badge>
                        )}
                      </div>
                      <div className="font-medium text-foreground truncate">{ex.title}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="mt-3 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Đã chọn: <strong>{selectedExamIds.length}</strong> bài thi
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                onClick={handleAddExams}
                disabled={selectedExamIds.length === 0 || addMutation.isPending}
              >
                {addMutation.isPending ? "Đang thêm..." : "Thêm vào bộ đề"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Position of Exam */}
      <Dialog open={editExamDialogOpen} onOpenChange={setEditExamDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveExamPosition} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa vị trí trong bộ đề</DialogTitle>
              <DialogDescription>
                Thay đổi số Test, Part / Passage và thứ tự hiển thị của bài thi trong bộ đề này.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="text-sm font-medium border-b pb-2 text-foreground truncate">
                {editingExam?.title}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-test">Test số (Ví dụ: 1, 2, 3, 4)</Label>
                <Input
                  id="edit-test"
                  type="number"
                  min="1"
                  value={editTestNumber}
                  onChange={(e) => setEditTestNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-part">Part / Passage số (Ví dụ: 1..4)</Label>
                <Input
                  id="edit-part"
                  type="number"
                  min="1"
                  max="4"
                  value={editPart}
                  onChange={(e) => setEditPart(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-order">Thứ tự sắp xếp (orderIndex)</Label>
                <Input
                  id="edit-order"
                  type="number"
                  min="0"
                  value={editOrderIndex}
                  onChange={(e) => setEditOrderIndex(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditExamDialogOpen(false)}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={updateExamMutation.isPending}>
                {updateExamMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Remove Exam From Collection */}
      <AlertDialog
        open={!!removingExam}
        onOpenChange={(open) => !open && setRemovingExam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ bài thi khỏi bộ đề?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn gỡ bài thi <strong>&quot;{removingExam?.title}&quot;</strong> khỏi
              bộ đề <strong>&quot;{collection.name}&quot;</strong>?
              <br />
              <br />
              Bài thi sẽ vẫn tồn tại trong ngân hàng đề và chỉ được xoá liên kết với bộ đề này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveExam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeExamMutation.isPending}
            >
              {removeExamMutation.isPending ? "Đang gỡ..." : "Xác nhận gỡ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
