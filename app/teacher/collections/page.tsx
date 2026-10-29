"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Book02Icon,
  Delete02Icon,
  Folder02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  useCollectionsQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
  useUpdateCollectionMutation,
} from "@/hooks/use-collections"
import type { CollectionCategory, CollectionItem } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"

const CATEGORY_LABELS: Record<CollectionCategory, string> = {
  cambridge: "Cambridge IELTS",
  vol: "IELTS Recent Actual / Vol",
  road_to_ielts: "Road to IELTS",
  custom: "Giáo trình trung tâm",
  other: "Khác",
}

const CATEGORY_COLORS: Record<CollectionCategory, string> = {
  cambridge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  vol: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
  road_to_ielts: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  custom: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  other: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
}

export default function CollectionsPage() {
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useCollectionsQuery({
    search: debouncedSearch.trim() || undefined,
    category:
      categoryFilter !== "all" ? (categoryFilter as CollectionCategory) : undefined,
  })

  // Create / Edit modal states
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCollection, setEditingCollection] = React.useState<CollectionItem | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formCategory, setFormCategory] = React.useState<CollectionCategory>("custom")
  const [formDescription, setFormDescription] = React.useState("")
  const [formOrderIndex, setFormOrderIndex] = React.useState("0")

  // Delete modal state
  const [deletingCollection, setDeletingCollection] = React.useState<CollectionItem | null>(null)

  const createMutation = useCreateCollectionMutation()
  const updateMutation = useUpdateCollectionMutation()
  const deleteMutation = useDeleteCollectionMutation()

  const handleOpenCreate = () => {
    setEditingCollection(null)
    setFormName("")
    setFormCategory("cambridge")
    setFormDescription("")
    setFormOrderIndex("0")
    setDialogOpen(true)
  }

  const handleOpenEdit = (col: CollectionItem) => {
    setEditingCollection(col)
    setFormName(col.name)
    setFormCategory(col.category)
    setFormDescription(col.description || "")
    setFormOrderIndex(String(col.orderIndex ?? 0))
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error("Vui lòng nhập tên nhóm bộ đề")
      return
    }

    try {
      if (editingCollection) {
        await updateMutation.mutateAsync({
          id: editingCollection._id,
          payload: {
            name: formName.trim(),
            category: formCategory,
            description: formDescription.trim() || null,
            orderIndex: parseInt(formOrderIndex, 10) || 0,
          },
        })
        toast.success("Cập nhật nhóm bộ đề thành công")
      } else {
        await createMutation.mutateAsync({
          name: formName.trim(),
          category: formCategory,
          description: formDescription.trim() || undefined,
          orderIndex: parseInt(formOrderIndex, 10) || 0,
        })
        toast.success("Tạo nhóm bộ đề thành công")
      }
      setDialogOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể lưu nhóm bộ đề")
      }
    }
  }

  const handleDelete = async () => {
    if (!deletingCollection) return
    try {
      await deleteMutation.mutateAsync(deletingCollection._id)
      toast.success("Đã xoá nhóm bộ đề. Các đề thi đã được giải phóng.")
      setDeletingCollection(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Không thể xoá nhóm bộ đề")
      }
    }
  }

  const collections = data?.items || []

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Quản lý nhóm bộ đề (Series & Collections)"
        description="Quản lý các bộ sách đề thi IELTS (Cambridge, Vol, Road to IELTS...) và phân loại đề thi theo bộ đề."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            Tạo nhóm bộ đề mới
          </Button>
        }
      />

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
          <TabsList className="h-10">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="cambridge">Cambridge</TabsTrigger>
            <TabsTrigger value="vol">Vol / Actual</TabsTrigger>
            <TabsTrigger value="road_to_ielts">Road to IELTS</TabsTrigger>
            <TabsTrigger value="custom">Tuỳ chỉnh</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <HugeiconsIcon
            icon={Search01Icon}
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bộ đề..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={Folder02Icon}
          title="Chưa có nhóm bộ đề nào"
          description={
            debouncedSearch || categoryFilter !== "all"
              ? "Không tìm thấy bộ đề phù hợp với bộ lọc hiện tại."
              : "Bấm nút 'Tạo nhóm bộ đề mới' để bắt đầu tổ chức đề thi theo từng bộ."
          }
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Tạo nhóm bộ đề mới
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Card
              key={col._id}
              className="group relative flex flex-col justify-between overflow-hidden border border-border/80 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                          CATEGORY_COLORS[col.category] || CATEGORY_COLORS.other
                        }`}
                      >
                        {CATEGORY_LABELS[col.category] || col.category}
                      </span>
                    </div>
                    <Link
                      href={`/teacher/collections/${col._id}`}
                      className="block truncate text-base font-semibold text-foreground hover:text-primary transition-colors"
                      title={col.name}
                    >
                      {col.name}
                    </Link>
                  </div>

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
                      <DropdownMenuItem asChild>
                        <Link href={`/teacher/collections/${col._id}`}>
                          <HugeiconsIcon icon={Book02Icon} className="mr-2 size-4" />
                          Xem & xếp bài thi
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(col)}>
                        <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-4" />
                        Sửa thông tin
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingCollection(col)}
                        className="text-destructive focus:text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="mr-2 size-4" />
                        Xoá bộ đề
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {col.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {col.description}
                  </p>
                )}

                {/* Exam Breakdown Badges */}
                <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {col.examCount} bài thi
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {col.readingCount > 0 && (
                      <Badge variant="outline" className="text-[11px] font-normal py-0">
                        {col.readingCount} Reading
                      </Badge>
                    )}
                    {col.listeningCount > 0 && (
                      <Badge variant="outline" className="text-[11px] font-normal py-0">
                        {col.listeningCount} Listening
                      </Badge>
                    )}
                    {col.writingCount > 0 && (
                      <Badge variant="outline" className="text-[11px] font-normal py-0">
                        {col.writingCount} Writing
                      </Badge>
                    )}
                    {col.examCount === 0 && (
                      <span className="text-muted-foreground italic">Chưa có bài thi</span>
                    )}
                  </div>
                </div>
              </CardContent>

              <div className="bg-muted/40 px-5 py-2.5 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Thứ tự: {col.orderIndex ?? 0}
                </span>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                  <Link href={`/teacher/collections/${col._id}`}>Quản lý bài thi →</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Create / Edit Collection */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingCollection ? "Sửa thông tin nhóm bộ đề" : "Tạo nhóm bộ đề mới"}
              </DialogTitle>
              <DialogDescription>
                {editingCollection
                  ? "Cập nhật tên hoặc phân loại bộ đề. Các đề thi sẽ tự động được cập nhật đồng bộ."
                  : "Thêm một nhóm bộ đề thi mới vào danh mục để phân loại các bài thi IELTS."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="col-name">Tên nhóm bộ đề *</Label>
                <Input
                  id="col-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Cambridge IELTS 19, Vol 6..."
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <Label>Gợi ý nhanh tên & phân loại</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setFormName("Cambridge IELTS ")
                      setFormCategory("cambridge")
                    }}
                  >
                    Cambridge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setFormName("IELTS Recent Actual Tests Vol ")
                      setFormCategory("vol")
                    }}
                  >
                    Vol / Actual
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setFormName("Road to IELTS ")
                      setFormCategory("road_to_ielts")
                    }}
                  >
                    Road to IELTS
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="col-category">Thể loại / Nhóm phân loại</Label>
                <select
                  id="col-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as CollectionCategory)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="cambridge">Cambridge IELTS</option>
                  <option value="vol">IELTS Recent Actual / Vol</option>
                  <option value="road_to_ielts">Road to IELTS</option>
                  <option value="custom">Giáo trình trung tâm / Tuỳ chỉnh</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="col-desc">Mô tả (tuỳ chọn)</Label>
                <Textarea
                  id="col-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả thông tin bộ đề, đối tượng phù hợp..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="col-order">Thứ tự hiển thị (ưu tiên số nhỏ hơn)</Label>
                <Input
                  id="col-order"
                  type="number"
                  min="0"
                  value={formOrderIndex}
                  onChange={(e) => setFormOrderIndex(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Đang lưu..."
                  : editingCollection
                  ? "Cập nhật"
                  : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Delete Collection */}
      <AlertDialog
        open={!!deletingCollection}
        onOpenChange={(open) => !open && setDeletingCollection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá nhóm bộ đề?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang thực hiện xoá nhóm bộ đề{" "}
              <strong>&quot;{deletingCollection?.name}&quot;</strong>.
              <br />
              <br />
              <span className="text-foreground font-medium">Lưu ý an toàn:</span>{" "}
              Các bài thi thuộc bộ đề này sẽ <strong>không bị xoá</strong> mà chỉ
              được gỡ thông tin bộ đề về trạng thái tự do trong ngân hàng đề.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xoá..." : "Xác nhận xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
