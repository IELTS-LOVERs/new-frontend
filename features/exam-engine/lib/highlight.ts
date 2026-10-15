/**
 * Offset-based highlight & note engine for the exam screen.
 *
 * Highlights are stored as absolute character offsets inside a *target*
 * element (the passage, a question prompt, an answer option, …). This is the
 * root-cause fix for the "usually" bug: the old implementation kept a list of
 * raw strings and re-matched them with a global `RegExp`, so every occurrence
 * of a word got marked. Working with `[start, end)` offsets means only the
 * exact characters the candidate selected are ever highlighted.
 *
 * The module is intentionally DOM-light so `splitTextByHighlights` and the
 * overlap helpers can be unit-tested in jsdom without mounting React.
 */

/** A single highlight (optionally carrying a note) inside a target block. */
export interface ExamHighlightItem {
  id: string
  /** Index of the owning section inside `exam.sections`. */
  sectionIndex: number
  /** `"passage"`, `q-<questionId>` or `opt-<questionId>-<optionId>`. */
  targetId: string
  /** 0-based index of the first highlighted character. */
  start: number
  /** Exclusive 0-based index of the last highlighted character. */
  end: number
  /** The text that was selected (kept for debugging / future persistence). */
  text: string
  /** Candidate note attached to this highlight. */
  note?: string
  createdAt: number
}

/** Attribute placed on every element whose text can be highlighted. */
export const HL_TARGET_ATTR = "data-hl-target"
/** Attribute placed on every rendered `<mark>` so clicks can find the item. */
export const HL_ITEM_ATTR = "data-hl-id"

/** A run of text, optionally owned by a highlight item. */
export interface HighlightSegment {
  text: string
  item?: ExamHighlightItem
}

let highlightSeq = 0

/** Generate a locally-unique highlight id (no dependency on crypto.randomUUID). */
export function createHighlightId(prefix = "hl"): string {
  highlightSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${highlightSeq}`
}

/** True when two `[start, end)` ranges share at least one character. */
export function isOverlapping(
  a: Pick<ExamHighlightItem, "start" | "end">,
  b: Pick<ExamHighlightItem, "start" | "end">
): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Keep only the offsets that are valid for a block of `textLength` characters,
 * then return them sorted by start offset. Invalid / empty ranges are dropped.
 */
export function normalizeHighlights(
  items: ExamHighlightItem[],
  textLength: number
): ExamHighlightItem[] {
  return items
    .filter(
      (i) => i.start >= 0 && i.end > i.start && i.end <= textLength
    )
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end)
}

/**
 * Split `text` into alternating plain / highlighted segments based on the
 * absolute offsets of `items`. Overlapping or out-of-range items are ignored
 * (the earliest valid range wins), so the output always covers `text` exactly.
 */
export function splitTextByHighlights(
  text: string,
  items: ExamHighlightItem[]
): HighlightSegment[] {
  if (!text) return []
  const valid = normalizeHighlights(items, text.length)
  if (valid.length === 0) return [{ text }]

  const segments: HighlightSegment[] = []
  let cursor = 0

  for (const item of valid) {
    // Skip items that overlap an already-emitted highlight.
    if (item.start < cursor) continue
    if (item.start > cursor) {
      segments.push({ text: text.slice(cursor, item.start) })
    }
    segments.push({ text: text.slice(item.start, item.end), item })
    cursor = item.end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) })
  }

  return segments
}

/** Find the highlight (if any) covering a given character offset. */
export function findHighlightAtOffset(
  items: ExamHighlightItem[],
  offset: number
): ExamHighlightItem | undefined {
  return items.find((i) => offset >= i.start && offset < i.end)
}

/**
 * Compute the `[start, end)` character offsets of a DOM `Range` relative to the
 * text content of `root`. Returns `null` when the range is collapsed or leaves
 * the root, so callers can safely ignore cross-block selections.
 */
export function getSelectionOffsets(
  range: Range,
  root: Node
): { start: number; end: number } | null {
  if (range.collapsed) return null
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null
  }

  const preRange = range.cloneRange()
  preRange.selectNodeContents(root)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length
  const end = start + range.toString().length
  if (end <= start) return null
  return { start, end }
}

/** Minimal viewport rect shape shared by `Range` / `DOMRect` / `getClientRects`. */
export interface RectLike {
  left: number
  width: number
  top: number
  bottom: number
}

/**
 * Bounding rect of a `Range`, tolerant of environments (jsdom) where
 * `Range.getBoundingClientRect` is not implemented — the tooltip still works,
 * it just falls back to a zero rect.
 */
export function getRangeRect(range: Range): RectLike {
  if (typeof range.getBoundingClientRect === "function") {
    return range.getBoundingClientRect()
  }
  const firstRect =
    typeof range.getClientRects === "function"
      ? range.getClientRects().item?.(0)
      : undefined
  return firstRect ?? { left: 0, width: 0, top: 0, bottom: 0 }
}

/**
 * Walk up from a DOM node to the closest element carrying `data-hl-target`.
 * Returns `null` when the node is not inside a highlight-able block.
 */
export function findHighlightTarget(node: Node | null): HTMLElement | null {
  let current: Node | null = node
  while (current) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      (current as HTMLElement).hasAttribute(HL_TARGET_ATTR)
    ) {
      return current as HTMLElement
    }
    current = current.parentNode
  }
  return null
}
