"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  HL_ITEM_ATTR,
  HL_TARGET_ATTR,
  createHighlightId,
  findHighlightTarget,
  getRangeRect,
  getSelectionOffsets,
  isOverlapping,
  splitTextByHighlights,
  type ExamHighlightItem,
  type RectLike,
} from "@/features/exam-engine/lib/highlight"

/** Marks a floating popover so outside-clicks / re-selection can ignore it. */
const POPOVER_ATTR = "data-hl-popover"

interface HighlightApi {
  sectionIndex: number
  /** Highlights belonging to the current section (all targets). */
  sectionItems: ExamHighlightItem[]
  itemsFor: (targetId: string) => ExamHighlightItem[]
  addHighlight: (input: {
    targetId: string
    start: number
    end: number
    text: string
    note?: string
  }) => ExamHighlightItem
  updateNote: (id: string, note: string) => void
  removeItem: (id: string) => void
  clearSection: () => void
}

const HighlightContext = React.createContext<HighlightApi | null>(null)

/**
 * Access the highlight engine. Returns `null` when rendered outside a
 * `<HighlightLayer>` so shared renderers (e.g. Listening) degrade to plain
 * text without any highlighting behaviour.
 */
export function useHighlights(): HighlightApi | null {
  return React.useContext(HighlightContext)
}

type SelectionRect = RectLike

interface TooltipState {
  targetId: string
  start: number
  end: number
  text: string
  rect: SelectionRect
}

interface EditorState {
  item: ExamHighlightItem
  style: React.CSSProperties
}

const POPOVER_WIDTH = 320
const EMPTY_ITEMS: ExamHighlightItem[] = []

/** Position a popover above a rect, flipping below when close to the top edge. */
function anchoredStyle(
  rect: SelectionRect,
  prefer: "above" | "below" = "above"
): React.CSSProperties {
  const viewportWidth =
    typeof window === "undefined" ? 1440 : window.innerWidth
  const center = rect.left + rect.width / 2
  const left = Math.min(
    Math.max(center, POPOVER_WIDTH / 2 + 8),
    viewportWidth - POPOVER_WIDTH / 2 - 8
  )
  const below = prefer === "below" || rect.top < 72
  return below
    ? { left, top: rect.bottom + 10, transform: "translateX(-50%)" }
    : { left, top: rect.top - 10, transform: "translate(-50%, -100%)" }
}

/**
 * Wraps a section (passage + questions) and wires up selection → floating
 * tooltip → highlight/note, plus click-to-edit/delete on existing marks.
 */
export function HighlightLayer({
  sectionIndex,
  items: propItems,
  onItemsChange,
  children,
  className,
}: {
  sectionIndex: number
  items?: ExamHighlightItem[]
  onItemsChange?: (items: ExamHighlightItem[]) => void
  children: React.ReactNode
  className?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [internalItems, setInternalItems] = React.useState<ExamHighlightItem[]>([])
  const isControlled = propItems !== undefined
  const items = isControlled ? propItems : internalItems

  const setItems = React.useCallback(
    (updater: React.SetStateAction<ExamHighlightItem[]>) => {
      if (isControlled) {
        const next = typeof updater === "function" ? updater(propItems!) : updater
        onItemsChange?.(next)
      } else {
        setInternalItems(updater)
      }
    },
    [isControlled, propItems, onItemsChange]
  )

  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null)
  const [editor, setEditor] = React.useState<EditorState | null>(null)

  const sectionItems = React.useMemo(
    () => items.filter((i) => i.sectionIndex === sectionIndex),
    [items, sectionIndex]
  )

  const itemsFor = React.useCallback(
    (targetId: string) =>
      items.filter(
        (i) => i.sectionIndex === sectionIndex && i.targetId === targetId
      ),
    [items, sectionIndex]
  )

  const addHighlight = React.useCallback<HighlightApi["addHighlight"]>(
    (input) => {
      const item: ExamHighlightItem = {
        id: createHighlightId(),
        sectionIndex,
        targetId: input.targetId,
        start: input.start,
        end: input.end,
        text: input.text,
        note: input.note,
        createdAt: Date.now(),
      }
      setItems((prev) => [
        // Drop anything that overlaps the new range so offsets stay disjoint.
        ...prev.filter(
          (i) =>
            !(
              i.sectionIndex === sectionIndex &&
              i.targetId === input.targetId &&
              isOverlapping(i, input)
            )
        ),
        item,
      ])
      return item
    },
    [sectionIndex]
  )

  const updateNote = React.useCallback((id: string, note: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, note: note.trim() || undefined } : i))
    )
  }, [])

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearSection = React.useCallback(() => {
    setItems((prev) => prev.filter((i) => i.sectionIndex !== sectionIndex))
  }, [sectionIndex])

  // ─── Selection → floating tooltip ─────────────────────────────────────────
  React.useEffect(() => {
    const onMouseUp = (event: MouseEvent) => {
      const container = containerRef.current
      const target = event.target as Node | null
      if (!container || !target || !container.contains(target)) return
      if ((target as HTMLElement).closest?.(`[${POPOVER_ATTR}]`)) return

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return
      }
      const range = selection.getRangeAt(0)
      const root = findHighlightTarget(range.commonAncestorContainer)
      if (!root || !container.contains(root)) return

      const offsets = getSelectionOffsets(range, root)
      const text = range.toString()
      if (!offsets || !text.trim()) return

      setTooltip({
        targetId: root.getAttribute(HL_TARGET_ATTR) ?? "",
        start: offsets.start,
        end: offsets.end,
        text,
        rect: getRangeRect(range),
      })
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.(`[${POPOVER_ATTR}]`)) return
      setTooltip(null)
      setEditor(null)
    }

    const onSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) setTooltip(null)
    }

    document.addEventListener("mouseup", onMouseUp)
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("selectionchange", onSelectionChange)
    return () => {
      document.removeEventListener("mouseup", onMouseUp)
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("selectionchange", onSelectionChange)
    }
  }, [])

  // ─── Click an existing mark → open the note editor ────────────────────────
  const onContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const mark = (event.target as HTMLElement).closest?.(
      `[${HL_ITEM_ATTR}]`
    ) as HTMLElement | null
    if (!mark) return
    const id = mark.getAttribute(HL_ITEM_ATTR)
    const item = items.find((i) => i.id === id)
    if (!item) return
    const rect = mark.getBoundingClientRect()
    setTooltip(null)
    setEditor({
      item,
      style: {
        left: Math.min(rect.left, (window.innerWidth || 1440) - POPOVER_WIDTH - 16),
        top: rect.bottom + 8,
      },
    })
  }

  const clearSelection = () => window.getSelection()?.removeAllRanges()

  const handleHighlight = () => {
    if (!tooltip) return
    addHighlight({
      targetId: tooltip.targetId,
      start: tooltip.start,
      end: tooltip.end,
      text: tooltip.text,
    })
    clearSelection()
    setTooltip(null)
  }

  const handleAddNote = () => {
    if (!tooltip) return
    const item = addHighlight({
      targetId: tooltip.targetId,
      start: tooltip.start,
      end: tooltip.end,
      text: tooltip.text,
    })
    clearSelection()
    setTooltip(null)
    setEditor({ item, style: anchoredStyle(tooltip.rect, "below") })
  }

  const api: HighlightApi = {
    sectionIndex,
    sectionItems,
    itemsFor,
    addHighlight,
    updateNote,
    removeItem,
    clearSection,
  }

  return (
    <HighlightContext.Provider value={api}>
      <div
        ref={containerRef}
        className={cn("relative", className)}
        onClick={onContainerClick}
      >
        {children}
      </div>

      {tooltip && (
        <div
          {...{ [POPOVER_ATTR]: "" }}
          style={anchoredStyle(tooltip.rect)}
          className="fixed z-50 flex items-center gap-1 rounded-xl border border-border bg-popover p-1 shadow-xl"
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAddNote}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            💬 Note
          </button>
          <span className="h-4 w-px bg-border" />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHighlight}
            className="rounded-lg bg-amber-400/90 px-2.5 py-1.5 text-xs font-semibold text-stone-900 transition-colors hover:bg-amber-400"
          >
            ✏️ Highlight
          </button>
        </div>
      )}

      {editor && (
        <NoteEditor
          key={editor.item.id}
          item={editor.item}
          style={editor.style}
          onSave={(note) => {
            updateNote(editor.item.id, note)
            setEditor(null)
          }}
          onDelete={() => {
            removeItem(editor.item.id)
            setEditor(null)
          }}
          onClose={() => setEditor(null)}
        />
      )}
    </HighlightContext.Provider>
  )
}

function NoteEditor({
  item,
  style,
  onSave,
  onDelete,
  onClose,
}: {
  item: ExamHighlightItem
  style: React.CSSProperties
  onSave: (note: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState(item.note ?? "")

  return (
    <div
      {...{ [POPOVER_ATTR]: "" }}
      style={{ ...style, width: POPOVER_WIDTH }}
      className="fixed z-50 space-y-2 rounded-xl border border-border bg-popover p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Ghi chú</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
      <p className="rounded-md bg-amber-100 px-2 py-1 text-[11px] leading-snug text-stone-800 dark:bg-amber-400/20 dark:text-amber-100">
        “{item.text.length > 120 ? `${item.text.slice(0, 120)}…` : item.text}”
      </p>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        placeholder="Nhập ghi chú của bạn..."
        className="min-h-20 resize-none text-xs"
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
        >
          Xóa highlight
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(draft)}
            className="h-7 text-xs font-semibold"
          >
            Lưu
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders `text` with the highlights registered for `targetId` wrapped in
 * `<mark>`. The root element carries `data-hl-target` so DOM selections can be
 * converted back to character offsets.
 */
export function SelectableHighlightedText({
  targetId,
  text,
  className,
}: {
  targetId: string
  text: string
  className?: string
}) {
  const api = useHighlights()
  const items = api ? api.itemsFor(targetId) : EMPTY_ITEMS
  const segments = splitTextByHighlights(text, items)

  return (
    <span {...{ [HL_TARGET_ATTR]: targetId }} className={className}>
      {segments.map((segment, i) =>
        segment.item ? (
          <mark
            key={i}
            {...{ [HL_ITEM_ATTR]: segment.item.id }}
            title={segment.item.note ?? "Bấm để ghi chú"}
            className={cn(
              "cursor-pointer rounded bg-amber-200 px-0.5 font-medium text-stone-900",
              "dark:bg-amber-400/70 dark:text-stone-950",
              segment.item.note &&
                "underline decoration-amber-600 decoration-dotted underline-offset-2"
            )}
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        )
      )}
    </span>
  )
}

/** "Xóa highlight (n)" control shown in the passage header. */
export function HighlightControls({ className }: { className?: string }) {
  const api = useHighlights()
  if (!api || api.sectionItems.length === 0) return null
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={api.clearSection}
      className={cn("h-7 text-xs", className)}
    >
      Xóa highlight ({api.sectionItems.length})
    </Button>
  )
}
