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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Image01Icon,
  Loading03Icon,
  MusicNote01Icon,
  PlayIcon,
  Search01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { USE_MOCKS } from "@/lib/api/config"
import {
  useMediaQuery,
  usePresignMediaMutation,
  useConfirmMediaMutation,
} from "@/hooks/use-media"
import { useQueryClient } from "@tanstack/react-query"
import type { MediaAsset } from "@/lib/api/types"
import { DEMO_MEDIA } from "@/mocks/demo-data"

const MAX_SIZE = 100 * 1024 * 1024 // 100MB

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
      else reject(new Error(`Tải lên thất bại (HTTP ${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Lỗi kết nối mạng khi tải lên"))
    xhr.send(file)
  })
}

interface UploadingState {
  name: string
  size: number
  progress: number
  status: "presigning" | "uploading" | "confirming"
}

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type?: "audio" | "image" | "all"
  onSelect?: (asset: MediaAsset) => void
}

export function MediaPicker({ open, onOpenChange, type = "all", onSelect }: MediaPickerProps) {
  // Remount the body on every open/close so all transient state (tab, search,
  // selection, upload progress) starts fresh — avoids syncing state in effects.
  return (
    <MediaPickerBody
      key={open ? "open" : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      type={type}
      onSelect={onSelect}
    />
  )
}

function MediaPickerBody({ open, onOpenChange, type = "all", onSelect }: MediaPickerProps) {
  const [tab, setTab] = React.useState<string>(type === "all" ? "image" : type)
  const [query, setQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [localUploaded, setLocalUploaded] = React.useState<MediaAsset[]>([])
  const [uploadingState, setUploadingState] = React.useState<UploadingState | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()

  const presignMutation = usePresignMediaMutation()
  const confirmMutation = useConfirmMediaMutation()

  const targetType = type === "all" ? (tab as "audio" | "image") : type

  // Query real media from backend API when USE_MOCKS is false
  const mediaQuery = useMediaQuery(
    { type: targetType, limit: 100 },
    !USE_MOCKS && open
  )

  const rawAssets: MediaAsset[] = React.useMemo(() => {
    const base: MediaAsset[] = USE_MOCKS
      ? DEMO_MEDIA
      : (mediaQuery.data?.items ?? []).map((m) => ({
          id: m.id,
          url: m.url,
          type: m.type,
          originalName: m.originalName ?? "Untitled",
          mimeType: m.mimeType,
          size: m.size,
          sizeLabel: formatSize(m.size),
          uploadedAt: m.createdAt ?? new Date().toISOString(),
          usageCount: 0,
          status: "ready" as const,
        }))

    const existingIds = new Set(base.map((b) => b.id))
    const newlyAdded = localUploaded.filter((a) => !existingIds.has(a.id))
    return [...newlyAdded, ...base]
  }, [mediaQuery.data?.items, localUploaded])

  // Filter assets by type and query
  const assets = React.useMemo(() => {
    return rawAssets
      .filter((m) => m.status === "ready" || !m.status)
      .filter((m) => m.type === targetType)
      .filter((m) => {
        if (!query.trim()) return true
        const q = query.trim().toLowerCase()
        return (
          (m.originalName ?? "").toLowerCase().includes(q) ||
          (m.id ?? "").toLowerCase().includes(q)
        )
      })
  }, [rawAssets, targetType, query])

  const selected = assets.find((a) => a.id === selectedId)

  const handleConfirm = () => {
    if (!selected) return
    onSelect?.(selected)
    toast.success(`Đã chọn: ${selected.originalName}`)
    onOpenChange(false)
  }

  const handleUploadFile = async (file: File) => {
    if (!file) return

    if (file.size > MAX_SIZE) {
      toast.error("Dung lượng tệp vượt quá giới hạn 100MB")
      return
    }

    // Determine type and normalized mime
    let mime = file.type
    if (!mime) {
      if (file.name.endsWith(".mp3")) mime = "audio/mpeg"
      else if (file.name.endsWith(".wav")) mime = "audio/wav"
      else if (file.name.endsWith(".png")) mime = "image/png"
      else if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) mime = "image/jpeg"
    }

    const isAudio = mime === "audio/mpeg" || mime === "audio/wav" || Boolean(file.name.match(/\.(mp3|wav)$/i))
    const isImage = mime === "image/png" || mime === "image/jpeg" || Boolean(file.name.match(/\.(png|jpg|jpeg)$/i))

    if (targetType === "audio" && !isAudio) {
      toast.error("Vui lòng chọn tệp âm thanh (MP3 hoặc WAV)")
      return
    }
    if (targetType === "image" && !isImage) {
      toast.error("Vui lòng chọn tệp hình ảnh (PNG hoặc JPG/JPEG)")
      return
    }
    if (!isAudio && !isImage) {
      toast.error("Định dạng tệp không được hỗ trợ. Chỉ chấp nhận MP3, WAV, PNG, JPG")
      return
    }

    const fileKind: "audio" | "image" = isAudio ? "audio" : "image"
    const validMime = isAudio
      ? (file.name.endsWith(".wav") ? ("audio/wav" as const) : ("audio/mpeg" as const))
      : (file.name.endsWith(".png") ? ("image/png" as const) : ("image/jpeg" as const))

    setUploadingState({
      name: file.name,
      size: file.size,
      progress: 0,
      status: "presigning",
    })

    try {
      if (USE_MOCKS) {
        setUploadingState((prev) => (prev ? { ...prev, progress: 45, status: "uploading" } : null))
        await new Promise((r) => setTimeout(r, 500))
        setUploadingState((prev) => (prev ? { ...prev, progress: 100, status: "confirming" } : null))
        await new Promise((r) => setTimeout(r, 250))

        const mockId = `mock-${Date.now()}`
        const newAsset: MediaAsset = {
          id: mockId,
          url: URL.createObjectURL(file),
          type: fileKind,
          originalName: file.name,
          mimeType: validMime,
          size: file.size,
          sizeLabel: formatSize(file.size),
          uploadedAt: new Date().toISOString(),
          usageCount: 0,
          status: "ready",
        }
        setLocalUploaded((prev) => [newAsset, ...prev])
        setSelectedId(mockId)
        toast.success(`Đã tải lên tệp: ${file.name}`)
      } else {
        setUploadingState((prev) => (prev ? { ...prev, status: "presigning" } : null))
        const presign = await presignMutation.mutateAsync({
          filename: file.name,
          mimeType: validMime,
          type: fileKind,
          size: file.size,
        })

        setUploadingState((prev) => (prev ? { ...prev, status: "uploading" } : null))
        await uploadWithProgress(presign.uploadUrl, file, validMime, (pct) => {
          setUploadingState((prev) => (prev ? { ...prev, progress: pct } : null))
        })

        setUploadingState((prev) => (prev ? { ...prev, status: "confirming", progress: 100 } : null))
        await confirmMutation.mutateAsync(presign.mediaId)

        const newAsset: MediaAsset = {
          id: presign.mediaId,
          url: presign.publicUrl,
          type: fileKind,
          originalName: file.name,
          mimeType: validMime,
          size: file.size,
          sizeLabel: formatSize(file.size),
          uploadedAt: new Date().toISOString(),
          usageCount: 0,
          status: "ready",
        }

        setLocalUploaded((prev) => [newAsset, ...prev])
        setSelectedId(presign.mediaId)
        await queryClient.invalidateQueries({ queryKey: ["media"] })
        await mediaQuery.refetch()
        toast.success(`Đã tải lên tệp: ${file.name}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tải lên thất bại"
      toast.error(msg)
    } finally {
      setUploadingState(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const acceptedMimeTypes =
    targetType === "audio"
      ? "audio/mpeg,audio/wav,.mp3,.wav"
      : targetType === "image"
      ? "image/png,image/jpeg,.png,.jpg,.jpeg"
      : "audio/mpeg,audio/wav,image/png,image/jpeg,.mp3,.wav,.png,.jpg,.jpeg"

  const isLoading = !USE_MOCKS && mediaQuery.isLoading
  const isUploading = Boolean(uploadingState)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] sm:max-w-2xl overflow-hidden flex flex-col"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading text-lg font-bold">Chọn từ Thư viện Media</DialogTitle>
          <DialogDescription className="text-xs">
            Tìm và chọn tệp đã có, hoặc tải lên trực tiếp từ máy tính để sử dụng ngay.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedMimeTypes}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUploadFile(file)
          }}
        />

        <div className="relative flex-1 min-h-0 flex flex-col space-y-3">
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-xs">
              <HugeiconsIcon icon={Upload04Icon} size={36} className="text-primary animate-bounce mb-2" />
              <p className="text-sm font-semibold text-primary">Thả tệp vào đây để tải lên ngay</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {targetType === "audio" ? "Hỗ trợ định dạng MP3, WAV" : "Hỗ trợ định dạng PNG, JPG"}
              </p>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-3 shrink-0 pb-1">
              {type === "all" ? (
                <TabsList className="bg-muted/50 p-1">
                  <TabsTrigger value="image" className="gap-1.5 text-xs">
                    <HugeiconsIcon icon={Image01Icon} size={14} /> Hình ảnh
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="gap-1.5 text-xs">
                    <HugeiconsIcon icon={MusicNote01Icon} size={14} /> Audio
                  </TabsTrigger>
                </TabsList>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                  <HugeiconsIcon icon={targetType === "audio" ? MusicNote01Icon : Image01Icon} size={14} />
                  <span>{targetType === "audio" ? "Audio (Âm thanh)" : "Hình ảnh"}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative w-44 sm:w-56">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={14}
                    className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm tệp..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs h-8 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <HugeiconsIcon icon={Upload04Icon} size={14} />
                  <span>Tải tệp lên</span>
                </Button>
              </div>
            </div>

            {/* Upload progress card */}
            {uploadingState && (
              <div className="shrink-0 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={15}
                      className="animate-spin text-primary shrink-0"
                    />
                    <span className="font-medium truncate text-foreground">{uploadingState.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      ({formatSize(uploadingState.size)})
                    </span>
                  </div>
                  <span className="font-semibold text-primary shrink-0 text-[11px]">
                    {uploadingState.status === "presigning"
                      ? "Chuẩn bị..."
                      : uploadingState.status === "confirming"
                      ? "Xác thực..."
                      : `${uploadingState.progress}%`}
                  </span>
                </div>
                <Progress value={uploadingState.progress} className="h-1.5" />
              </div>
            )}

            <TabsContent value={tab} className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-10 px-4 text-center space-y-3">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Upload04Icon} size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      Chưa có tệp {targetType === "audio" ? "âm thanh" : "hình ảnh"} nào
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      Kéo thả tệp vào đây hoặc nhấn nút bên dưới để tải trực tiếp từ máy tính của bạn.
                    </p>
                  </div>
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="gap-1.5 text-xs"
                    >
                      <HugeiconsIcon icon={Upload04Icon} size={14} />
                      Tải tệp từ máy tính
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/75">
                    {targetType === "audio"
                      ? "Định dạng hỗ trợ: MP3, WAV (tối đa 100MB)"
                      : "Định dạng hỗ trợ: PNG, JPG, JPEG (tối đa 100MB)"}
                  </p>
                </div>
              ) : tab === "image" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={cn(
                        "group relative aspect-video overflow-hidden rounded-xl border-2 bg-muted transition-all cursor-pointer text-left",
                        selectedId === asset.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-border"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.originalName} className="size-full object-cover" />
                      {selectedId === asset.id && (
                        <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white">
                        {asset.originalName}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer",
                        selectedId === asset.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:bg-muted/70"
                      )}
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <HugeiconsIcon icon={PlayIcon} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {asset.originalName}
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {asset.sizeLabel}
                        </span>
                      </span>
                      {selectedId === asset.id && (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="sm:justify-between shrink-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs"
          >
            <HugeiconsIcon icon={Upload04Icon} size={14} />
            Tải tệp từ máy tính
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!selected || isUploading}
              className="font-semibold"
            >
              Chọn tệp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

