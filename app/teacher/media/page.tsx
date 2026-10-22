"use client"

import * as React from "react"
import { parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { MediaPicker } from "@/components/shared/media-picker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Copy01Icon,
  Delete02Icon,
  EyeIcon,
  Folder02Icon,
  Image01Icon,
  MusicNote01Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  Search01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import {
  useMediaQuery,
  usePresignMediaMutation,
  useConfirmMediaMutation,
  useDeleteMediaMutation,
} from "@/hooks/use-media"
import { formatDateShort } from "@/lib/format"
import { detectMediaFile } from "@/lib/media-file"
import type { MediaAsset } from "@/lib/api/types"

const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_PARALLEL = 3
const PAGE_SIZE = 20

interface UploadingItem {
  localId: string
  mediaId?: string
  file: File
  progress: number
  status: "presigning" | "uploading" | "confirming" | "error"
  errorMessage?: string
}

function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload thất bại (HTTP ${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Lỗi mạng khi tải lên"))
    xhr.send(file)
  })
}

export default function TeacherMediaPage() {
  const [tab, setTab] = useQueryState("type", parseAsString.withDefault("audio"))
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))
  const [query, setQuery] = React.useState("")
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<{
    id: string
    url?: string
    originalName?: string
    mimeType?: string
    size?: number
    sizeLabel?: string
  } | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState<UploadingItem[]>([])
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const type = tab === "image" ? "image" : "audio"
  const mediaQuery = useMediaQuery({ type, page, limit: PAGE_SIZE })
  const presignMutation = usePresignMediaMutation()
  const confirmMutation = useConfirmMediaMutation()
  const deleteMutation = useDeleteMediaMutation()

  const items = mediaQuery.data?.items ?? []
  const meta = mediaQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1

  const filtered = items.filter(
    (a) => !query || (a.originalName ?? "").toLowerCase().includes(query.toLowerCase())
  )

  // Uploads đang dở (chỉ real mode)
  const uploadingForTab = uploading.filter(
    (u) => detectMediaFile(u.file)?.type === type
  )

  const copyUrl = (asset: { url?: string; originalName?: string }) => {
    if (!asset.url) return
    navigator.clipboard?.writeText(asset.url)
    toast.success("Đã sao chép URL tệp vào clipboard")
  }

  const runUpload = async (item: UploadingItem) => {
    const detected = detectMediaFile(item.file)
    if (!detected) {
      toast.error(`Định dạng không hỗ trợ: ${item.file.name}`, {
        description: "Chỉ chấp nhận MP3, WAV, PNG, JPG.",
      })
      return
    }
    const patch = (p: Partial<UploadingItem>) =>
      setUploading((prev) => prev.map((u) => (u.localId === item.localId ? { ...u, ...p } : u)))
    try {
      patch({ status: "presigning" })
      const presign = await presignMutation.mutateAsync({
        filename: item.file.name,
        mimeType: detected.mimeType,
        type: detected.type,
        size: item.file.size,
      })
      patch({ mediaId: presign.mediaId, status: "uploading" })
      await uploadWithProgress(presign.uploadUrl, item.file, detected.mimeType, (pct) =>
        patch({ progress: pct })
      )
      patch({ status: "confirming" })
      await confirmMutation.mutateAsync(presign.mediaId)
      setUploading((prev) => prev.filter((u) => u.localId !== item.localId))
      toast.success(`Đã tải lên tệp ${item.file.name}`)
    } catch (err) {
      patch({
        status: "error",
        errorMessage: err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Tải lên thất bại",
      })
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files)

    const valid: File[] = []
    for (const file of list) {
      if (!detectMediaFile(file)) {
        toast.error(`Định dạng không hỗ trợ: ${file.name}`, {
          description: "Chỉ chấp nhận MP3, WAV, PNG, JPG.",
        })
        continue
      }
      if (file.size > MAX_SIZE) {
        toast.error(`Tệp vượt quá 100MB: ${file.name}`)
        continue
      }
      valid.push(file)
    }
    if (valid.length === 0) return

    const firstType = detectMediaFile(valid[0])?.type
    setTab(firstType === "image" ? "image" : "audio")

    const queue = valid.map((file, i) => ({
      localId: `up-${Date.now()}-${i}`,
      file,
      progress: 0,
      status: "presigning" as const,
    }))
    setUploading((prev) => [...prev, ...queue])

    // Chạy song song tối đa MAX_PARALLEL
    let idx = 0
    const workers = Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
      while (idx < queue.length) {
        const current = queue[idx++]
        await runUpload(current)
      }
    })
    void Promise.all(workers)
  }

  const retryUpload = (item: UploadingItem) => {
    setUploading((prev) =>
      prev.map((u) => (u.localId === item.localId ? { ...u, status: "presigning", progress: 0, errorMessage: undefined } : u))
    )
    void runUpload({ ...item, status: "presigning", progress: 0 })
  }

  const discardUpload = async (item: UploadingItem) => {
    if (item.mediaId) {
      try {
        await deleteMutation.mutateAsync(item.mediaId)
      } catch {
        // bỏ qua — media chưa confirm
      }
    }
    setUploading((prev) => prev.filter((u) => u.localId !== item.localId))
  }

  const handleDelete = async (asset: MediaAsset | { id: string; originalName?: string }) => {
    try {
      await deleteMutation.mutateAsync(asset.id)
      toast.success("Đã xoá tệp")
    } catch (err) {
      if (err instanceof ApiError && err.code === "MEDIA_IN_USE") {
        toast.error("Đang được dùng trong câu hỏi/đề", {
          description: "Hãy gỡ tệp khỏi các câu hỏi/đề trước khi xoá.",
        })
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể xoá tệp. Vui lòng thử lại.")
      }
    }
  }

  const togglePlay = (asset: { id: string; url?: string }) => {
    if (playingId === asset.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (asset.url) {
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = asset.url
      audioRef.current.play().catch(() => toast.error("Không thể phát tệp audio"))
      setPlayingId(asset.id)
      audioRef.current.onended = () => setPlayingId(null)
    }
  }

  const isLoading = mediaQuery.isLoading
  const isError = mediaQuery.isError

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Thư viện Media" },
        ]}
        title="Quản lý Thư viện Media"
        description="Quản lý tệp audio và hình ảnh dùng cho đề thi. Hỗ trợ MP3, WAV, PNG, JPG tối đa 100MB."
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => inputRef.current?.click()}
          >
            <HugeiconsIcon icon={Upload04Icon} size={16} />
            <span>Tải lên tệp mới</span>
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/mpeg,audio/wav,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {/* Upload Dropzone */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
        className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-7 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
          <HugeiconsIcon icon={Upload04Icon} size={22} />
        </span>
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-foreground">
            Kéo thả tệp vào đây hoặc bấm để chọn
          </span>
          <p className="text-xs text-muted-foreground">
            MP3, WAV, PNG, JPG · Tối đa 100MB mỗi tệp
          </p>
        </div>
      </label>

      {/* Tabs & Toolbar */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(null) }} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="audio" className="gap-1.5 text-xs">
              <HugeiconsIcon icon={MusicNote01Icon} size={14} />
              <span>Audio</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5 text-xs">
              <HugeiconsIcon icon={Image01Icon} size={14} />
              <span>Hình ảnh</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative sm:w-64">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên tệp..."
                className="h-9 pl-9 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {filtered.length + uploadingForTab.length} tệp
            </p>
          </div>
        </div>

        {/* Tab Content with Table Layout */}
        <TabsContent value={tab} className="mt-0 space-y-4">
          {isLoading ? (
            <Card className="border-border shadow-xs">
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </Card>
          ) : isError ? (
            <Card className="border-border shadow-xs">
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <p className="text-sm font-medium text-foreground">Không tải được thư viện media</p>
                <p className="text-xs text-muted-foreground">
                  {mediaQuery.error instanceof ApiError
                    ? mediaQuery.error.message
                    : "Đã xảy ra lỗi. Vui lòng thử lại."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-medium"
                  onClick={() => mediaQuery.refetch()}
                >
                  <HugeiconsIcon icon={RefreshIcon} size={14} />
                  <span>Thử lại</span>
                </Button>
              </div>
            </Card>
          ) : filtered.length === 0 && uploadingForTab.length === 0 ? (
            <EmptyState
              icon={Folder02Icon}
              title={`Chưa có ${tab === "audio" ? "audio" : "hình ảnh"} nào`}
              description={
                query
                  ? `Không tìm thấy tệp nào phù hợp với từ khóa "${query}".`
                  : "Tải lên tệp đầu tiên để dùng trong câu hỏi và đề thi."
              }
              action={
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 font-semibold"
                  onClick={() => inputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Upload04Icon} size={15} />
                  <span>Tải lên tệp ngay</span>
                </Button>
              }
            />
          ) : (
            <Card className="border-border shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[64px] text-center">
                      {tab === "audio" ? "Phát" : "Xem"}
                    </TableHead>
                    <TableHead className="min-w-[280px]">Tên tệp</TableHead>
                    <TableHead className="w-[110px]">Dung lượng</TableHead>
                    <TableHead className="w-[130px]">Ngày tải lên</TableHead>
                    <TableHead className="w-[140px] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Uploading rows */}
                  {uploadingForTab.map((u) => {
                    const isAudio = u.file.type.startsWith("audio")
                    return (
                      <TableRow key={u.localId} className="bg-muted/10">
                        <TableCell className="text-center py-2.5">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mx-auto"
                            title="Đang tải lên…"
                          >
                            <HugeiconsIcon icon={isAudio ? MusicNote01Icon : Image01Icon} size={15} />
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <p className="font-heading text-xs font-semibold text-foreground truncate max-w-sm">
                                {u.file.name}
                              </p>
                              <Badge
                                variant="outline"
                                className="gap-1 text-[10px] h-4 px-1.5 font-normal border-amber-500/30 text-amber-600 bg-amber-500/5"
                              >
                                <HugeiconsIcon icon={Alert02Icon} size={10} />
                                {u.status === "error" ? "Lỗi" : "Chưa hoàn tất"}
                              </Badge>
                            </div>
                            {u.status === "error" ? (
                              <p className="text-[11px] text-destructive">{u.errorMessage}</p>
                            ) : (
                              <div className="max-w-40">
                                <Progress value={u.progress} className="h-1" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs tabular-nums text-foreground">
                            {formatSize(u.file.size)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {u.status === "error" && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                onClick={() => retryUpload(u)}
                                title="Thử lại"
                              >
                                <HugeiconsIcon icon={RefreshIcon} size={13} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => discardUpload(u)}
                              title="Huỷ tải lên"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Server rows */}
                  {filtered.map((asset) => {
                    const isAudio = asset.type === "audio"
                    const assetAny = asset as MediaAsset & { status?: string; uploadedAt?: string; createdAt?: string; size?: number; sizeLabel?: string; usageCount?: number }
                    const isReady = assetAny.status !== "pending"
                    const isPlaying = playingId === asset.id
                    const uploadedAt = assetAny.uploadedAt ?? assetAny.createdAt
                    const sizeLabel = assetAny.sizeLabel ?? formatSize(assetAny.size)

                    return (
                      <TableRow key={asset.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center py-2.5">
                          {isAudio ? (
                            <button
                              type="button"
                              onClick={() => isReady && togglePlay(asset)}
                              disabled={!isReady}
                              title={!isReady ? "Đang tải lên…" : isPlaying ? "Tạm dừng" : "Phát thử audio"}
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors mx-auto",
                                isPlaying
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : isReady
                                    ? "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                              )}
                            >
                              <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isReady && setPreview(asset)}
                              disabled={!isReady}
                              title="Bấm để xem kích thước lớn"
                              className="relative block size-8 rounded-lg overflow-hidden border border-border bg-muted mx-auto hover:opacity-85 transition-opacity"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={asset.url}
                                alt={asset.originalName ?? ""}
                                className="size-full object-cover"
                              />
                            </button>
                          )}
                        </TableCell>

                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <HugeiconsIcon
                                icon={isAudio ? MusicNote01Icon : Image01Icon}
                                size={14}
                              />
                            </span>
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-heading text-xs font-semibold text-foreground truncate max-w-sm">
                                {asset.originalName}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                <span>
                                  {asset.mimeType || (isAudio ? "audio/mpeg" : "image/jpeg")}
                                </span>
                                {!isReady && (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 text-[10px] h-4 px-1.5 font-normal border-amber-500/30 text-amber-600 bg-amber-500/5"
                                  >
                                    <HugeiconsIcon icon={Alert02Icon} size={10} />
                                    Chưa hoàn tất
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs tabular-nums text-foreground">
                            {sizeLabel}
                          </span>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatDateShort(uploadedAt)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {!isAudio && isReady && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setPreview(asset)}
                                title="Xem trước ảnh"
                              >
                                <HugeiconsIcon icon={EyeIcon} size={13} />
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-medium gap-1"
                              onClick={() => copyUrl(asset)}
                              title="Sao chép đường dẫn URL"
                              disabled={!asset.url}
                            >
                              <HugeiconsIcon icon={Copy01Icon} size={12} />
                              <span>Copy URL</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(asset)}
                              disabled={deleteMutation.isPending}
                              title="Xoá tệp khỏi thư viện"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Server-side pagination */}
          {meta && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Trang {meta.page}/{totalPages} · {meta.total} tệp
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Image Preview Modal */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold text-foreground">
              {preview?.originalName}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/40 p-2 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={preview.originalName ?? ""}
                  className="max-h-[60vh] w-full rounded-lg object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">
                  {preview.sizeLabel ?? formatSize(preview.size)} · {preview.mimeType}
                </span>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 font-semibold text-xs"
                  onClick={() => copyUrl(preview)}
                >
                  <HugeiconsIcon icon={Copy01Icon} size={14} />
                  <span>Sao chép URL</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  )
}
