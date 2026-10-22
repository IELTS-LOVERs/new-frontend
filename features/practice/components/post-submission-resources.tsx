"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Video01Icon,
  File01Icon,
  Book02Icon,
  NoteIcon,
  ExternalLinkIcon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IExamPostSubmissionResources } from "@/lib/api/types"

interface PostSubmissionResourcesProps {
  resources: IExamPostSubmissionResources
  className?: string
}

function parseVideoEmbedUrl(url: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID or youtube.com/embed/ID
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v")
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`
      if (parsed.pathname.startsWith("/embed/")) {
        return `https://www.youtube-nocookie.com${parsed.pathname}`
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const v = parsed.pathname.slice(1)
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`
    }

    // Vimeo: vimeo.com/ID
    if (parsed.hostname.includes("vimeo.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean)
      const last = parts[parts.length - 1]
      if (last && /^\d+$/.test(last)) {
        return `https://player.vimeo.com/video/${last}`
      }
    }
  } catch {
    return null
  }

  return null
}

export function PostSubmissionResources({
  resources,
  className,
}: PostSubmissionResourcesProps) {
  const { solutionVideoUrl, solutionDocumentUrl, solutionNotes, vocabularyItems } = resources

  const embedUrl = solutionVideoUrl ? parseVideoEmbedUrl(solutionVideoUrl) : null
  const hasVocab = Array.isArray(vocabularyItems) && vocabularyItems.length > 0
  const hasContent = solutionVideoUrl || solutionDocumentUrl || solutionNotes || hasVocab

  if (!hasContent) return null

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {/* Video giải chi tiết */}
      {solutionVideoUrl && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
              <HugeiconsIcon icon={Video01Icon} size={18} className="text-primary" />
              <span>Video bài giảng & giải chi tiết</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {embedUrl ? (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-black">
                <iframe
                  src={embedUrl}
                  title="Video giải chi tiết"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Video hướng dẫn</p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {solutionVideoUrl}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                  <a
                    href={solutionVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Mở video</span>
                    <HugeiconsIcon icon={ExternalLinkIcon} size={13} />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tài liệu & Ghi chú */}
      {(solutionDocumentUrl || solutionNotes) && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
              <HugeiconsIcon icon={NoteIcon} size={18} className="text-primary" />
              <span>Ghi chú & Tài liệu giải thích</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {solutionDocumentUrl && (
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <HugeiconsIcon icon={File01Icon} size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Tài liệu đáp án chi tiết</p>
                    <p className="text-xs text-muted-foreground">
                      Tải về hoặc xem online tài liệu hướng dẫn giải
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" className="gap-1.5 text-xs font-medium">
                  <a
                    href={solutionDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Xem tài liệu</span>
                    <HugeiconsIcon icon={ExternalLinkIcon} size={13} />
                  </a>
                </Button>
              </div>
            )}

            {solutionNotes && (
              <div className="p-4 rounded-lg border border-border/70 bg-muted/20 text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {solutionNotes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danh sách Từ vựng cốt lõi */}
      {hasVocab && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
                <HugeiconsIcon icon={Book02Icon} size={18} className="text-primary" />
                <span>Từ vựng trọng tâm trong bài</span>
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-semibold">
                {vocabularyItems!.length} từ vựng
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[180px] text-xs font-semibold">Từ vựng</TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold">Phiên âm</TableHead>
                    <TableHead className="text-xs font-semibold">Ý nghĩa</TableHead>
                    <TableHead className="text-xs font-semibold">Ví dụ / Ngữ cảnh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vocabularyItems!.map((item, idx) => (
                    <TableRow key={item._id ?? idx} className="border-border/50 text-xs">
                      <TableCell className="font-semibold text-primary">
                        {item.word}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {item.phonetic || "—"}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {item.meaning}
                      </TableCell>
                      <TableCell className="text-muted-foreground italic">
                        {item.contextSentence || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
