"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { HighlighterIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type RichTextFormat = "bold" | "italic" | "highlight"

const MARKER: Record<RichTextFormat, string> = {
  bold: "**",
  italic: "*",
  highlight: "==",
}

function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const prototype =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

/**
 * Wrap the current selection (inside a focused input/textarea) with the
 * Markdown marker used by the exam renderer. Keeps the field focused so the
 * toolbar button does not dismiss the selection on mousedown.
 */
export function applyRichTextFormat(
  container: HTMLElement | null,
  format: RichTextFormat
): boolean {
  if (!container || typeof document === "undefined") return false

  const active = document.activeElement
  if (
    !(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
  ) {
    return false
  }
  if (
    active instanceof HTMLInputElement &&
    !["text", "search", "url", "email"].includes(active.type)
  ) {
    return false
  }
  if (!container.contains(active) || active.disabled || active.readOnly) {
    return false
  }

  const marker = MARKER[format]
  const value = active.value
  const start = active.selectionStart ?? value.length
  const end = active.selectionEnd ?? start
  const selected = value.slice(start, end)

  let nextValue: string
  let nextStart: number
  let nextEnd: number

  const wrappedOutside =
    value.slice(Math.max(0, start - marker.length), start) === marker &&
    value.slice(end, end + marker.length) === marker

  const wrappedInside =
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)

  if (wrappedOutside) {
    nextValue = value.slice(0, start - marker.length) + selected + value.slice(end + marker.length)
    nextStart = start - marker.length
    nextEnd = end - marker.length
  } else if (wrappedInside) {
    const inner = selected.slice(marker.length, -marker.length)
    nextValue = value.slice(0, start) + inner + value.slice(end)
    nextStart = start
    nextEnd = start + inner.length
  } else if (selected.length > 0) {
    nextValue = value.slice(0, start) + marker + selected + marker + value.slice(end)
    nextStart = start + marker.length
    nextEnd = end + marker.length
  } else {
    // No selection: insert an empty pair and put the caret between markers.
    nextValue = value.slice(0, start) + marker + marker + value.slice(end)
    nextStart = start + marker.length
    nextEnd = nextStart
  }

  setNativeValue(active, nextValue)
  requestAnimationFrame(() => {
    active.focus()
    active.setSelectionRange(nextStart, nextEnd)
  })
  return true
}

/**
 * Compact B / I / highlight toolbar. Put it anywhere inside the editor card;
 * it formats the currently focused input or textarea inside `containerRef`.
 */
export function RichTextFormatBar<T extends HTMLElement>({
  containerRef,
  disabled,
  className,
  enableShortcuts = true,
}: {
  containerRef: React.RefObject<T | null>
  disabled?: boolean
  className?: string
  enableShortcuts?: boolean
}) {
  React.useEffect(() => {
    if (!enableShortcuts) return
    const container = containerRef.current
    if (!container) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled || !(event.ctrlKey || event.metaKey) || event.altKey) return
      const target = event.target
      if (
        !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) ||
        !container.contains(target)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key !== "b" && key !== "i") return
      event.preventDefault()
      applyRichTextFormat(container, key === "b" ? "bold" : "italic")
    }

    container.addEventListener("keydown", onKeyDown)
    return () => container.removeEventListener("keydown", onKeyDown)
  }, [containerRef, disabled, enableShortcuts])

  const apply = (format: RichTextFormat) => {
    if (disabled) return
    if (!applyRichTextFormat(containerRef.current, format)) {
      toast.info("Hãy bôi đen chữ trong ô soạn thảo rồi bấm định dạng.")
    }
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
        Định dạng
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-7 w-7 p-0 text-xs font-bold"
        title="In đậm (Ctrl+B)"
        aria-label="In đậm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => apply("bold")}
      >
        B
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-7 w-7 p-0 text-xs font-semibold italic"
        title="In nghiêng (Ctrl+I)"
        aria-label="In nghiêng"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => apply("italic")}
      >
        I
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-7 w-7 p-0"
        title="Bôi nền chữ"
        aria-label="Bôi nền chữ"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => apply("highlight")}
      >
        <HugeiconsIcon icon={HighlighterIcon} size={13} />
      </Button>
    </div>
  )
}
