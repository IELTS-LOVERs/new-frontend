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
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Image01Icon,
  MusicNote01Icon,
  PlayIcon,
  Search01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { MediaAsset } from "@/lib/api/types"
import { DEMO_MEDIA } from "@/mocks/demo-data"

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type?: "audio" | "image" | "all"
  onSelect?: (asset: MediaAsset) => void
}

export function MediaPicker({ open, onOpenChange, type = "all", onSelect }: MediaPickerProps) {
  const [tab, setTab] = React.useState<string>(type === "all" ? "image" : type)
  const [query, setQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const assets = DEMO_MEDIA.filter((m) => m.status === "ready").filter((m) =>
    query ? m.originalName?.toLowerCase().includes(query.toLowerCase()) : true
  )
  const selected = assets.find((a) => a.id === selectedId)

  const handleConfirm = () => {
    if (!selected) return
    onSelect?.(selected)
    toast.success(`Đã chọn: ${selected.originalName}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Chọn từ Thư viện Media</DialogTitle>
          <DialogDescription className="text-xs">
            Tìm và chọn tệp audio hoặc hình ảnh đã tải lên thư viện.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
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
              <span className="text-xs font-medium text-muted-foreground">
                {type === "audio" ? "Audio" : "Hình ảnh"}
              </span>
            )}
            <div className="relative flex-1 max-w-56">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tệp..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <TabsContent value={tab} className="mt-0">
            {assets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                Không có tệp phù hợp.
              </div>
            ) : tab === "image" ? (
              <div className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto pr-1">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    className={cn(
                      "group relative aspect-video overflow-hidden rounded-xl border-2 bg-muted transition-all",
                      selectedId === asset.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.originalName} className="size-full object-cover" />
                    {selectedId === asset.id && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                      selectedId === asset.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                    )}
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <HugeiconsIcon icon={PlayIcon} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">{asset.originalName}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {asset.sizeLabel} · dùng trong {asset.usageCount} mục
                      </span>
                    </span>
                    {selectedId === asset.id && (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
            <a href="/teacher/media">
              <HugeiconsIcon icon={Upload04Icon} size={14} />
              Mở thư viện để tải lên
            </a>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirm} disabled={!selected} className="font-semibold">
              Chọn tệp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
