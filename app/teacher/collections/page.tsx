"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Book02Icon,
  Delete02Icon,
  Folder02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
  Menu01Icon,
  DragDropVerticalIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
import { Textarea } from "@/components/ui/textarea"
import {
  useAddExamsToCollectionMutation,
  useCollectionDetailQuery,
  useCollectionTreeQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
  useRemoveExamFromCollectionMutation,
  useReorderExamsMutation,
  useUpdateCollectionMutation,
  useUpdateExamInCollectionMutation,
} from "@/hooks/use-collections"
import { useExamsQuery } from "@/hooks/use-exams"
import type { CollectionDetailExam, CollectionTreeNode, SkillType } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { computeReorder } from "@/features/collections/lib/compute-reorder"

// Sortable exam row component
function SortableExamRow({
  exam,
  onEditPosition,
  onRemove,
}: {
  exam: CollectionDetailExam
  onEditPosition: (exam: CollectionDetailExam) => void
  onRemove: (exam: CollectionDetailExam) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exam._id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const skills = Array.from(new Set(exam.sections.map((s) => s.skill))) as SkillType[]
  const partNum = exam.curriculum?.part

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 p-3.5 hover:bg-muted/20 transition-colors bg-card"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground rounded"
          title="Kéo để đổi thứ tự"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
        </button>

        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SkillBadges skills={skills} />
            {partNum !== undefined && (
              <Badge variant="outline" className="text-xs bg-background">
                {skills.includes("reading") ? `Passage ${partNum}` : `Part ${partNum}`}
              </Badge>
            )}
            <ExamStatusBadge status={exam.status} />
            <span className="text-xs text-muted-foreground">{exam.durationMinutes}p</span>
          </div>
          <div className="font-medium text-foreground text-sm truncate">{exam.title}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
              <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditPosition(exam)}>
              <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-4" />
              Đổi vị trí (Test / Part / Thứ tự)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRemove(exam)}
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
}

export default function CollectionsManagementPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedIdFromUrl = searchParams.get("c")

  const { data: tree = [], isLoading: loadingTree } = useCollectionTreeQuery()
  const [treeSearch, setTreeSearch] = React.useState("")
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false)

  // Find active node or child
  const allNodesFlat = React.useMemo(() => {
    const list: Array<{ id: string; name: string; isRoot: boolean; parentId?: string | null }> = []
    for (const r of tree) {
      list.push({ id: r._id, name: r.name, isRoot: true, parentId: null })
      if (r.children) {
        for (const c of r.children) {
          list.push({ id: c._id, name: c.name, isRoot: false, parentId: r._id })
        }
      }
    }
    return list
  }, [tree])

  // Derive active ID directly from URL param or first available node
  const activeColId = React.useMemo(() => {
    if (selectedIdFromUrl && allNodesFlat.some((n) => n.id === selectedIdFromUrl)) {
      return selectedIdFromUrl
    }
    if (allNodesFlat.length > 0) {
      return allNodesFlat[0].id
    }
    return null
  }, [selectedIdFromUrl, allNodesFlat])

  const handleSelectCollection = (id: string) => {
    router.replace(`/teacher/collections?c=${id}`)
    setMobileSheetOpen(false)
  }

  // Active collection detail query
  const { data: detailData, isLoading: loadingDetail } = useCollectionDetailQuery(
    activeColId || "",
    !!activeColId
  )
  const activeCol = detailData?.collection
  const exams = React.useMemo(() => detailData?.exams || [], [detailData?.exams])

  // Check if active col is a root with children
  const activeRootNode = tree.find((r) => r._id === activeColId)
  const hasChildren = (activeRootNode?.children?.length ?? 0) > 0

  // Mutations
  const createMutation = useCreateCollectionMutation()
  const updateMutation = useUpdateCollectionMutation()
  const deleteMutation = useDeleteCollectionMutation()
  const addExamsMutation = useAddExamsToCollectionMutation()
  const reorderMutation = useReorderExamsMutation()
  const updateExamMutation = useUpdateExamInCollectionMutation()
  const removeExamMutation = useRemoveExamFromCollectionMutation()

  // Modal Create / Edit Collection
  const [colDialogOpen, setColDialogOpen] = React.useState(false)
  const [editingNode, setEditingNode] = React.useState<{ id?: string; name: string; parentId?: string | null; description?: string } | null>(null)
  const [formColName, setFormColName] = React.useState("")
  const [formColParentId, setFormColParentId] = React.useState<string>("root")
  const [formColDesc, setFormColDesc] = React.useState("")

  // Delete Alert
  const [deletingCol, setDeletingCol] = React.useState<{ id: string; name: string; childCount?: number; examCount?: number } | null>(null)

  // Add Exams to Collection Dialog
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [examSearch, setExamSearch] = React.useState("")
  const [examSkillFilter, setExamSkillFilter] = React.useState<string>("all")
  const [selectedExamIds, setSelectedExamIds] = React.useState<string[]>([])
  const [targetTestNumber, setTargetTestNumber] = React.useState("1")
  const [targetPart, setTargetPart] = React.useState("1")

  const { data: availableExamsData, isLoading: loadingAvailable } = useExamsQuery(
    {
      limit: 100,
      search: examSearch.trim() || undefined,
      skill: examSkillFilter !== "all" ? (examSkillFilter as SkillType) : undefined,
    },
    addDialogOpen
  )

  // Edit Position Dialog
  const [editingExam, setEditingExam] = React.useState<CollectionDetailExam | null>(null)
  const [editTestNumber, setEditTestNumber] = React.useState("1")
  const [editPart, setEditPart] = React.useState("1")
  const [editOrderIndex, setEditOrderIndex] = React.useState("0")
  const [removingExam, setRemovingExam] = React.useState<CollectionDetailExam | null>(null)

  // Group exams by testNumber
  const groupedExams = React.useMemo(() => {
    const groups: Record<number, CollectionDetailExam[]> = {}
    for (const exam of exams) {
      const testNum = exam.curriculum?.testNumber ?? 1
      if (!groups[testNum]) groups[testNum] = []
      groups[testNum].push(exam)
    }

    const sortedTestNums = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)

    return sortedTestNums.map((testNum) => ({
      testNumber: testNum,
      items: groups[testNum],
    }))
  }, [exams])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent, testNumber: number) => {
    const { active, over } = event
    if (!over || active.id === over.id || !activeColId) return

    const reordered = computeReorder(exams, String(active.id), String(over.id), testNumber)
    if (reordered.length === 0) return

    try {
      await reorderMutation.mutateAsync({
        id: activeColId,
        payload: { items: reordered },
      })
      toast.success("Đã lưu thứ tự đề thi")
    } catch {
      toast.error("Không thể cập nhật thứ tự đề thi")
    }
  }

  // Open modal create
  const handleOpenCreate = (defaultParentId?: string) => {
    setEditingNode(null)
    setFormColName("")
    setFormColParentId(defaultParentId || "root")
    setFormColDesc("")
    setColDialogOpen(true)
  }

  const handleOpenEdit = (id: string, name: string, parentId?: string | null, description?: string) => {
    setEditingNode({ id, name, parentId, description })
    setFormColName(name)
    setFormColParentId(parentId || "root")
    setFormColDesc(description || "")
    setColDialogOpen(true)
  }

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formColName.trim()) {
      toast.error("Vui lòng nhập tên bộ đề")
      return
    }

    const parentId = formColParentId === "root" ? null : formColParentId

    try {
      if (editingNode?.id) {
        await updateMutation.mutateAsync({
          id: editingNode.id,
          payload: {
            name: formColName.trim(),
            parentId,
            description: formColDesc.trim() || null,
          },
        })
        toast.success("Cập nhật bộ đề thành công")
      } else {
        const created = await createMutation.mutateAsync({
          name: formColName.trim(),
          parentId,
          description: formColDesc.trim() || undefined,
        })
        toast.success("Tạo bộ đề thành công")
        handleSelectCollection(created._id)
      }
      setColDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại")
    }
  }

  const handleDeleteCollection = async () => {
    if (!deletingCol) return
    try {
      await deleteMutation.mutateAsync(deletingCol.id)
      toast.success("Đã xoá bộ đề thành công")
      setDeletingCol(null)
      setSelectedColId(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể xoá bộ đề")
    }
  }

  const handleAddExams = async () => {
    if (selectedExamIds.length === 0 || !activeColId) return
    try {
      await addExamsMutation.mutateAsync({
        id: activeColId,
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
      toast.error(err instanceof ApiError ? err.message : "Không thể thêm đề")
    }
  }

  const handleSaveExamPosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam || !activeColId) return

    try {
      await updateExamMutation.mutateAsync({
        id: activeColId,
        examId: editingExam._id,
        payload: {
          testNumber: parseInt(editTestNumber, 10) || 1,
          part: parseInt(editPart, 10) || 1,
          orderIndex: parseInt(editOrderIndex, 10) || 0,
        },
      })
      toast.success("Cập nhật vị trí bài thi thành công")
      setEditingExam(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể cập nhật bài thi")
    }
  }

  const handleRemoveExam = async () => {
    if (!removingExam || !activeColId) return
    try {
      await removeExamMutation.mutateAsync({
        id: activeColId,
        examId: removingExam._id,
      })
      toast.success("Đã gỡ bài thi khỏi bộ đề")
      setRemovingExam(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể gỡ bài thi")
    }
  }

  // Filtered Tree Nodes by search
  const filteredTree = React.useMemo(() => {
    if (!treeSearch.trim()) return tree
    const q = treeSearch.toLowerCase().trim()
    return tree
      .map((root) => {
        const rootMatch = root.name.toLowerCase().includes(q)
        const matchedChildren = (root.children || []).filter((c) =>
          c.name.toLowerCase().includes(q)
        )
        if (rootMatch || matchedChildren.length > 0) {
          return {
            ...root,
            children: rootMatch ? root.children : matchedChildren,
          }
        }
        return null
      })
      .filter(Boolean) as CollectionTreeNode[]
  }, [tree, treeSearch])

  // Tree component (sidebar left)
  const renderTreeContent = () => (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="font-semibold text-sm">Danh mục bộ đề</span>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleOpenCreate()}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          Bộ đề gốc
        </Button>
      </div>

      <div className="relative">
        <HugeiconsIcon icon={Search01Icon} className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={treeSearch}
          onChange={(e) => setTreeSearch(e.target.value)}
          placeholder="Tìm bộ đề..."
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {loadingTree ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Chưa có bộ đề nào.</div>
        ) : (
          filteredTree.map((root) => {
            const isSelected = activeColId === root._id
            return (
              <div key={root._id} className="space-y-0.5">
                <div
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={() => handleSelectCollection(root._id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <HugeiconsIcon icon={Folder02Icon} className="size-3.5 shrink-0" />
                    <span className="truncate">{root.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {root.examCount}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-opacity">
                          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenCreate(root._id)}>
                          <HugeiconsIcon icon={Add01Icon} className="mr-2 size-3.5" />
                          Thêm bộ đề con
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(root._id, root.name, null, root.description)}>
                          <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-3.5" />
                          Sửa thông tin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingCol({ id: root._id, name: root.name, childCount: root.children?.length, examCount: root.examCount })}
                          className="text-destructive focus:text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="mr-2 size-3.5" />
                          Xoá bộ đề
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Children items */}
                {root.children && root.children.length > 0 && (
                  <div className="pl-4 space-y-0.5 border-l ml-3 my-0.5">
                    {root.children.map((child) => {
                      const isChildSelected = activeColId === child._id
                      return (
                        <div
                          key={child._id}
                          className={`group flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors cursor-pointer ${
                            isChildSelected
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                          }`}
                          onClick={() => handleSelectCollection(child._id)}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <HugeiconsIcon icon={Book02Icon} className="size-3 shrink-0" />
                            <span className="truncate">{child.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]">{child.examCount}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-opacity">
                                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(child._id, child.name, root._id, child.description)}>
                                  <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-3.5" />
                                  Sửa thông tin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingCol({ id: child._id, name: child.name, examCount: child.examCount })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <HugeiconsIcon icon={Delete02Icon} className="mr-2 size-3.5" />
                                  Xoá bộ đề con
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Quản lý nhóm bộ đề (Series & Collections)"
          description="Cơ cấu phân cấp: Bộ đề cha (Cambridge, Vol) → Bộ đề con (Cam 7, Cam 8...) → Test → Part."
        />

        {/* Mobile menu trigger */}
        <div className="md:hidden">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <HugeiconsIcon icon={Menu01Icon} className="size-4" />
                Bộ đề
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4">
              <SheetHeader className="mb-2">
                <SheetTitle className="text-left text-base">Danh mục bộ đề</SheetTitle>
              </SheetHeader>
              {renderTreeContent()}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main 2-Panel Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Tree (Desktop) */}
        <Card className="hidden md:block md:col-span-4 lg:col-span-3 p-4 h-[calc(100vh-210px)] sticky top-20 border border-border/80">
          {renderTreeContent()}
        </Card>

        {/* Right Column: Collection Details */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-5">
          {loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !activeCol ? (
            <EmptyState
              icon={Folder02Icon}
              title="Chưa chọn bộ đề nào"
              description="Chọn một bộ đề từ cây bên trái hoặc bấm tạo mới."
              action={
                <Button onClick={() => handleOpenCreate()} className="gap-2">
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                  Tạo bộ đề gốc mới
                </Button>
              }
            />
          ) : (
            <>
              {/* Header Card */}
              <Card className="p-5 border border-border/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {activeCol.parentId ? "Bộ đề con" : "Bộ đề gốc"}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{activeCol.name}</h2>
                    {activeCol.description && (
                      <p className="text-xs text-muted-foreground">{activeCol.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!hasChildren && (
                      <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5 h-8 text-xs">
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                        Thêm đề vào bộ
                      </Button>
                    )}
                    {!activeCol.parentId && (
                      <Button
                        variant="outline"
                        onClick={() => handleOpenCreate(activeCol._id)}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                        Tạo quyển con
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => handleOpenEdit(activeCol._id, activeCol.name, activeCol.parentId, activeCol.description)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* View 1: If Parent Node has Children -> Grid of Children Cards */}
              {hasChildren ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Các bộ đề con ({activeRootNode?.children.length})
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activeRootNode?.children.map((child) => (
                      <Card
                        key={child._id}
                        onClick={() => handleSelectCollection(child._id)}
                        className="p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-xs group flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center justify-between">
                            <span>{child.name}</span>
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          {child.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{child.description}</p>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{child.examCount} bài thi</span>
                          <div className="flex gap-1 text-[11px]">
                            {child.readingCount > 0 && <span>{child.readingCount}R</span>}
                            {child.listeningCount > 0 && <span>{child.listeningCount}L</span>}
                            {child.writingCount > 0 && <span>{child.writingCount}W</span>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Warning banner if root has direct exams */}
                  {exams.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                      <strong>Lưu ý:</strong> Bộ đề gốc này hiện còn <strong>{exams.length} bài thi trực tiếp</strong> chưa được xếp vào các quyển con. Hãy mở từng bài thi để chuyển vào quyển con phù hợp.
                    </div>
                  )}
                </div>
              ) : null}

              {/* View 2: List of Exams grouped by Test with Drag and Drop */}
              {(!hasChildren || exams.length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Cơ cấu bài thi ({exams.length} bài)
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Kéo thả biểu tượng ⠿ để đổi vị trí
                    </span>
                  </div>

                  {groupedExams.length === 0 ? (
                    <EmptyState
                      icon={Book02Icon}
                      title="Chưa có đề thi nào trong bộ đề này"
                      description="Nhấn 'Thêm đề vào bộ' để đưa bài thi vào quyển này."
                      action={
                        <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5 h-8 text-xs">
                          <HugeiconsIcon icon={Add01Icon} className="size-4" />
                          Thêm đề vào bộ
                        </Button>
                      }
                    />
                  ) : (
                    groupedExams.map((group) => (
                      <Card key={group.testNumber} className="overflow-hidden border border-border/80">
                        <CardHeader className="bg-muted/30 py-2.5 px-4 border-b flex flex-row items-center justify-between">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2">
                            <span className="inline-block size-2 rounded-full bg-primary" />
                            Test {group.testNumber}
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {group.items.length} bài
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-border/60">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, group.testNumber)}
                          >
                            <SortableContext
                              items={group.items.map((i) => i._id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {group.items.map((exam) => (
                                <SortableExamRow
                                  key={exam._id}
                                  exam={exam}
                                  onEditPosition={(ex) => {
                                    setEditingExam(ex)
                                    setEditTestNumber(String(ex.curriculum?.testNumber ?? 1))
                                    setEditPart(String(ex.curriculum?.part ?? 1))
                                    setEditOrderIndex(String(ex.curriculum?.orderIndex ?? 0))
                                  }}
                                  onRemove={(ex) => setRemovingExam(ex)}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialog Create / Edit Collection */}
      <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveCollection} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingNode?.id ? "Sửa thông tin bộ đề" : "Tạo bộ đề mới"}
              </DialogTitle>
              <DialogDescription>
                {editingNode?.id
                  ? "Cập nhật tên hoặc bộ đề cha."
                  : "Thêm bộ đề mới vào cây thư viện giáo trình."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label htmlFor="col-name" className="text-xs">Tên bộ đề *</Label>
                <Input
                  id="col-name"
                  value={formColName}
                  onChange={(e) => setFormColName(e.target.value)}
                  placeholder="Ví dụ: Cambridge, Cam 8, Vol 6..."
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="col-parent" className="text-xs">Thuộc bộ đề cha</Label>
                <select
                  id="col-parent"
                  value={formColParentId}
                  onChange={(e) => setFormColParentId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs"
                >
                  <option value="root">Không (Đây là bộ đề gốc)</option>
                  {tree
                    .filter((r) => r._id !== editingNode?.id)
                    .map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống hỗ trợ 2 cấp: Gốc (vd: Cambridge) → Quyển con (vd: Cam 8).
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="col-desc" className="text-xs">Mô tả (tuỳ chọn)</Label>
                <Textarea
                  id="col-desc"
                  value={formColDesc}
                  onChange={(e) => setFormColDesc(e.target.value)}
                  placeholder="Mô tả bộ đề..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setColDialogOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Đang lưu..." : editingNode?.id ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Add Exams To Collection */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Thêm đề thi vào &quot;{activeCol?.name}&quot;</DialogTitle>
            <DialogDescription>
              Chọn các bài thi từ kho đề để gắn vào bộ đề này và thiết lập Test / Part.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/20 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Gán vào Test số</Label>
              <Input
                type="number"
                min="1"
                value={targetTestNumber}
                onChange={(e) => setTargetTestNumber(e.target.value)}
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
                className="h-8"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <div className="relative flex-1">
              <HugeiconsIcon icon={Search01Icon} className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                placeholder="Tìm đề trong kho..."
                className="pl-9 h-8 text-xs"
              />
            </div>
            <select
              value={examSkillFilter}
              onChange={(e) => setExamSkillFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs h-8"
            >
              <option value="all">Tất cả kỹ năng</option>
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="writing">Writing</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md divide-y max-h-[300px]">
            {loadingAvailable ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : !availableExamsData?.items || availableExamsData.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Không tìm thấy bài thi phù hợp.</div>
            ) : (
              availableExamsData.items.map((ex) => {
                const isSelected = selectedExamIds.includes(ex.id)
                const isAlreadyInCollection = exams.some((e) => e._id === ex.id)
                const skills = ex.skills || []

                return (
                  <div
                    key={ex.id}
                    onClick={() => {
                      setSelectedExamIds((prev) =>
                        prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]
                      )
                    }}
                    className={`flex items-center gap-3 p-2.5 text-xs cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        setSelectedExamIds((prev) =>
                          prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]
                        )
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <SkillBadges skills={skills} />
                        {isAlreadyInCollection && (
                          <Badge variant="secondary" className="text-[10px] py-0">Đang trong bộ này</Badge>
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

          <DialogFooter className="mt-2 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Đã chọn: <strong>{selectedExamIds.length}</strong> đề thi
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>Huỷ</Button>
              <Button type="button" size="sm" onClick={handleAddExams} disabled={selectedExamIds.length === 0 || addExamsMutation.isPending}>
                {addExamsMutation.isPending ? "Đang thêm..." : "Thêm vào bộ đề"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Position */}
      <Dialog open={!!editingExam} onOpenChange={(open) => !open && setEditingExam(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveExamPosition} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base">Chỉnh sửa vị trí trong bộ đề</DialogTitle>
              <DialogDescription className="text-xs">
                Thay đổi số Test, Part / Passage và thứ tự hiển thị của bài thi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="font-medium border-b pb-2 text-foreground truncate">
                {editingExam?.title}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-test" className="text-xs">Test số</Label>
                <Input
                  id="edit-test"
                  type="number"
                  min="1"
                  value={editTestNumber}
                  onChange={(e) => setEditTestNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-part" className="text-xs">Part / Passage số</Label>
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

              <div className="space-y-1">
                <Label htmlFor="edit-order" className="text-xs">Thứ tự sắp xếp (orderIndex)</Label>
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
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingExam(null)}>Huỷ</Button>
              <Button type="submit" size="sm" disabled={updateExamMutation.isPending}>
                {updateExamMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Delete Exam */}
      <AlertDialog open={!!removingExam} onOpenChange={(open) => !open && setRemovingExam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ bài thi khỏi bộ đề?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn gỡ bài thi <strong>&quot;{removingExam?.title}&quot;</strong> khỏi bộ đề này?
              Bài thi sẽ vẫn tồn tại an toàn trong ngân hàng đề.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveExam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={removeExamMutation.isPending}>
              {removeExamMutation.isPending ? "Đang gỡ..." : "Xác nhận gỡ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Delete Collection */}
      <AlertDialog open={!!deletingCol} onOpenChange={(open) => !open && setDeletingCol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá bộ đề?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang thực hiện xoá bộ đề <strong>&quot;{deletingCol?.name}&quot;</strong>.
              <br /><br />
              {deletingCol?.childCount && deletingCol.childCount > 0 ? (
                <span>Các bộ đề con ({deletingCol.childCount} bộ) sẽ tự động được đưa lên thành <strong>bộ đề gốc</strong>. </span>
              ) : null}
              Các bài thi trong bộ đề sẽ được gỡ liên kết an toàn và giữ nguyên trong ngân hàng đề.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Đang xoá..." : "Xác nhận xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
