"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Delete02Icon,
  EyeIcon,
  HighlighterIcon,
  Note01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
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

export interface HighlightApi {
  sectionIndex: number
  /** Highlights belonging to the current section (all targets). */
  sectionItems: ExamHighlightItem[]
  /** Highlights that carry a non-empty note in the current section. */
  sectionNotes: ExamHighlightItem[]
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
  isNotesOpen: boolean
  setIsNotesOpen: (open: boolean) => void
  openNotes: () => void
  closeNotes: () => void
  focusHighlight: (id: string) => void
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

function flashHighlightElement(el: HTMLElement, durationMs = 1800) {
  if (typeof window === "undefined") return
  el.style.outline = "2px solid #f59e0b"
  el.style.outlineOffset = "2px"
  el.style.boxShadow = "0 0 0 4px rgba(245, 158, 11, 0.3)"
  el.style.transition = "all 200ms ease"
  window.setTimeout(() => {
    el.style.outline = ""
    el.style.outlineOffset = ""
    el.style.boxShadow = ""
    el.style.transition = ""
  }, durationMs)
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

  // Keep latest items and callback in refs to avoid stale closures in addHighlight / handlers
  const itemsRef = React.useRef(items)
  itemsRef.current = items

  const onItemsChangeRef = React.useRef(onItemsChange)
  onItemsChangeRef.current = onItemsChange

  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null)
  const [editor, setEditor] = React.useState<EditorState | null>(null)
  const [isNotesOpen, setIsNotesOpen] = React.useState(false)

  const sectionItems = React.useMemo(
    () => items.filter((i) => i.sectionIndex === sectionIndex),
    [items, sectionIndex]
  )

  const sectionNotes = React.useMemo(
    () => sectionItems.filter((i) => Boolean(i.note && i.note.trim())),
    [sectionItems]
  )

  const itemsFor = React.useCallback(
    (targetId: string) =>
      items.filter(
        (i) => i.sectionIndex === sectionIndex && i.targetId === targetId
      ),
    [items, sectionIndex]
  )

  const setItems = React.useCallback(
    (updater: React.SetStateAction<ExamHighlightItem[]>) => {
      if (isControlled) {
        const next = typeof updater === "function" ? updater(itemsRef.current) : updater
        onItemsChangeRef.current?.(next)
      } else {
        setInternalItems(updater)
      }
    },
    [isControlled]
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
        // Drop anything that overlaps the new range within the same target so offsets stay disjoint.
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
    [sectionIndex, setItems]
  )

  const updateNote = React.useCallback(
    (id: string, note: string) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, note: note.trim() || undefined } : i))
      )
    },
    [setItems]
  )

  const removeItem = React.useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
    },
    [setItems]
  )

  const clearSection = React.useCallback(() => {
    setItems((prev) => prev.filter((i) => i.sectionIndex !== sectionIndex))
  }, [sectionIndex, setItems])

  const focusHighlight = React.useCallback((id: string) => {
    const mark = document.querySelector<HTMLElement>(`[${HL_ITEM_ATTR}="${id}"]`)
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" })
      flashHighlightElement(mark)
      const item = itemsRef.current.find((i) => i.id === id)
      if (item) {
        const rect = mark.getBoundingClientRect()
        setEditor({
          item,
          style: {
            left: Math.min(rect.left, (window.innerWidth || 1440) - POPOVER_WIDTH - 16),
            top: rect.bottom + 8,
          },
        })
      }
    }
  }, [])

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
    sectionNotes,
    itemsFor,
    addHighlight,
    updateNote,
    removeItem,
    clearSection,
    isNotesOpen,
    setIsNotesOpen,
    openNotes: () => setIsNotesOpen(true),
    closeNotes: () => setIsNotesOpen(false),
    focusHighlight,
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

      {/* ─── Floating Tooltip (Note / Highlight with real icons) ───── */}
      {tooltip && (
        <div
          {...{ [POPOVER_ATTR]: "" }}
          style={anchoredStyle(tooltip.rect)}
          className="fixed z-50 flex items-center gap-1 rounded-xl border border-border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAddNote}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <HugeiconsIcon icon={Note01Icon} size={14} className="text-foreground" />
            <span>Note</span>
          </button>
          <span className="h-4 w-px bg-border" />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHighlight}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400/90 px-2.5 py-1.5 text-xs font-semibold text-stone-900 transition-colors hover:bg-amber-400"
          >
            <HugeiconsIcon icon={HighlighterIcon} size={14} className="text-stone-900" />
            <span>Highlight</span>
          </button>
        </div>
      )}

      {/* ─── Popover Note Editor on Mark ────────────────────────────── */}
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

      {/* ─── Notes Drawer / Panel ──────────────────────────────────── */}
      <Sheet open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  <HugeiconsIcon icon={Note01Icon} size={18} />
                </div>
                <SheetTitle className="text-base font-bold">Ghi chú của bạn</SheetTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {sectionNotes.length} ghi chú
              </Badge>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Xem lại và quản lý các ghi chú đã đánh dấu trong phần thi này.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {sectionNotes.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                  <HugeiconsIcon icon={Note01Icon} size={24} />
                </div>
                <p className="text-sm font-semibold text-foreground">Chưa có ghi chú nào</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Bôi đen bất kỳ đoạn văn bản nào trên bài đọc hoặc câu hỏi, sau đó chọn <strong>Note</strong> để thêm ghi chú.
                </p>
              </div>
            ) : (
              sectionNotes.map((item) => (
                <NoteDrawerCard
                  key={item.id}
                  item={item}
                  onFocus={() => {
                    focusHighlight(item.id)
                    setIsNotesOpen(false)
                  }}
                  onUpdate={(newNote) => updateNote(item.id, newNote)}
                  onDelete={() => removeItem(item.id)}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </HighlightContext.Provider>
  )
}

function NoteDrawerCard({
  item,
  onFocus,
  onUpdate,
  onDelete,
}: {
  item: ExamHighlightItem
  onFocus: () => void
  onUpdate: (note: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(item.note ?? "")

  const locationLabel =
    item.targetId === "passage"
      ? "Bài đọc"
      : item.targetId.startsWith("q-")
        ? "Câu hỏi"
        : item.targetId.startsWith("opt-")
          ? "Lựa chọn đáp án"
          : "Nội dung"

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs transition-all hover:border-amber-400/40">
      <div className="flex items-center justify-between">
        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {locationLabel}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFocus}
            className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            title="Cuộn tới vị trí trên bài"
          >
            <HugeiconsIcon icon={EyeIcon} size={13} />
            <span>Xem</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            title="Chỉnh sửa ghi chú"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={13} />
            <span>Sửa</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive"
            title="Xóa highlight và ghi chú"
          >
            <HugeiconsIcon icon={Delete02Icon} size={13} />
          </Button>
        </div>
      </div>

      <p className="rounded-md border-l-2 border-amber-400 bg-amber-50/60 p-2 text-xs italic leading-snug text-stone-800 dark:bg-amber-400/10 dark:text-amber-100">
        “{item.text.length > 140 ? `${item.text.slice(0, 140)}…` : item.text}”
      </p>

      {isEditing ? (
        <div className="space-y-2 pt-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-16 resize-none text-xs"
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(item.note ?? "")
                setIsEditing(false)
              }}
              className="h-6 px-2 text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onUpdate(draft)
                setIsEditing(false)
              }}
              className="h-6 px-2 text-xs font-semibold"
            >
              Lưu
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-foreground whitespace-pre-wrap leading-relaxed">
          {item.note}
        </p>
      )}
    </div>
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
      className="fixed z-50 space-y-2.5 rounded-xl border border-border bg-popover p-3.5 shadow-2xl animate-in fade-in-0 zoom-in-95"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <HugeiconsIcon icon={Note01Icon} size={14} className="text-amber-600 dark:text-amber-400" />
          <span>Ghi chú</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Đóng"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} />
        </button>
      </div>
      <p className="rounded-md border-l-2 border-amber-400 bg-amber-50/80 p-2 text-[11px] leading-snug text-stone-800 dark:bg-amber-400/20 dark:text-amber-100">
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
          className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} size={13} />
          <span>Xóa highlight</span>
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 px-2.5 text-xs"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(draft)}
            className="h-7 px-3 text-xs font-semibold"
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
            title={segment.item.note ? `Ghi chú: ${segment.item.note}` : "Bấm để thêm ghi chú"}
            className={cn(
              "cursor-pointer rounded bg-amber-200 px-0.5 font-medium text-stone-900 transition-colors",
              "hover:bg-amber-300 dark:bg-amber-400/70 dark:text-stone-950 dark:hover:bg-amber-400/90",
              segment.item.note &&
                "underline decoration-amber-600 decoration-dotted underline-offset-2"
            )}
          >
            {segment.text}
            {segment.item.note && (
              <span
                className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-400/40 px-1 py-0.2 text-[10px] font-bold text-amber-950 align-baseline select-none dark:bg-amber-300/30 dark:text-amber-100"
                title={`Ghi chú: ${segment.item.note}`}
              >
                <HugeiconsIcon icon={Note01Icon} size={10} className="inline" />
                <span>Note</span>
              </span>
            )}
          </mark>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        )
      )}
    </span>
  )
}

/** Header controls: "Ghi chú (n)" tab button + "Xóa highlight (n)" button. */
export function HighlightControls({ className }: { className?: string }) {
  const api = useHighlights()
  if (!api) return null

  const totalHighlights = api.sectionItems.length
  const totalNotes = api.sectionNotes.length

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={api.openNotes}
        className={cn(
          "h-7 gap-1.5 px-2.5 text-xs transition-colors",
          totalNotes > 0
            ? "border-amber-400/80 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-200"
            : "text-foreground"
        )}
      >
        <HugeiconsIcon
          icon={Note01Icon}
          size={14}
          className={totalNotes > 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}
        />
        <span>Ghi chú</span>
        {totalNotes > 0 && (
          <span className="rounded-full bg-amber-200 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-900 dark:bg-amber-400/30 dark:text-amber-100">
            {totalNotes}
          </span>
        )}
      </Button>

      {totalHighlights > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={api.clearSection}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} size={13} />
          <span>Xóa highlight ({totalHighlights})</span>
        </Button>
      )}
    </div>
  )
}
