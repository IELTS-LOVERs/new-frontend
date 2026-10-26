"use client"

import dynamic from "next/dynamic"

/**
 * TipTap is heavy and only teachers need it. The dynamic import keeps the
 * editor out of the student bundle; `ssr: false` avoids hydration mismatches
 * (TipTap needs the DOM).
 */
export const RichTextEditor = dynamic(
  () => import("./editor").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
        Đang tải trình soạn thảo…
      </div>
    ),
  }
)
