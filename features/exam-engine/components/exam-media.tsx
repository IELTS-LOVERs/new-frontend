"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import type { MediaItem } from "@/lib/api/types"

/**
 * #12: exam images can fail on mobile (expired presign, flaky network). Retry
 * once, then show a readable placeholder instead of a broken-image icon.
 * HTTPS pages also surface mixed-content HTTP URLs clearly.
 *
 * Presigned MinIO/S3 URLs sign their whole query string, so appending a
 * cache-buster would make the retry 403. For those we remount the <img> with
 * the same URL instead; only unsigned (public) URLs get `_retry=`.
 */
export function ExamImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [reloadKey, setReloadKey] = React.useState(0)
  const [failed, setFailed] = React.useState(false)
  const [mixedContent, setMixedContent] = React.useState(false)
  const [prevSrc, setPrevSrc] = React.useState(src)

  // Reset retry state when the API hands us a new presigned URL.
  if (prevSrc !== src) {
    setPrevSrc(src)
    setReloadKey(0)
    setFailed(false)
    setMixedContent(false)
  }

  const retry = () => {
    setFailed(false)
    setMixedContent(false)
    setReloadKey((value) => value + 1)
  }

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center",
          className
        )}
      >
        <HugeiconsIcon
          icon={Image01Icon}
          size={24}
          className="text-muted-foreground"
        />
        <p className="text-xs font-semibold text-foreground">
          Không tải được hình ảnh
        </p>
        <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
          {mixedContent
            ? "Hình ảnh đang dùng liên kết HTTP nên bị trình duyệt chặn khi trang chạy HTTPS. Vui lòng báo giáo viên."
            : "Kết nối có thể bị gián đoạn. Hãy thử tải lại hình ảnh."}
        </p>
        {!mixedContent && (
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            <HugeiconsIcon icon={RefreshIcon} size={13} className="mr-1" />
            Thử lại
          </Button>
        )}
      </div>
    )
  }

  const isPresigned = /[?&](X-Amz-Signature|Signature)=/i.test(src)
  const url =
    reloadKey > 0 && !isPresigned
      ? `${src}${src.includes("?") ? "&" : "?"}_retry=${reloadKey}`
      : src

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={reloadKey}
      src={url}
      alt={alt}
      loading="eager"
      decoding="async"
      className={className}
      onError={() => {
        if (reloadKey < 1) {
          setReloadKey(reloadKey + 1)
          return
        }
        setMixedContent(
          typeof window !== "undefined" &&
            window.location.protocol === "https:" &&
            /^http:\/\//i.test(src)
        )
        setFailed(true)
      }}
    />
  )
}

/**
 * Render illustration images (presigned URLs from the API) for a section or a
 * question group. Renders nothing when there are no image items.
 */
export function MediaImages({
  media,
  className,
}: {
  media?: MediaItem[]
  className?: string
}) {
  const images = (media ?? []).filter((m) => m.type === "image")
  if (images.length === 0) return null
  return (
    <div className={cn("space-y-3", className)}>
      {images.map((m) => (
        <ExamImage
          key={m.id}
          src={m.url}
          alt={m.originalName || "Hình ảnh minh hoạ"}
          className="w-full rounded-xl border border-border"
        />
      ))}
    </div>
  )
}
