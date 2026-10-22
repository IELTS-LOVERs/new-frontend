/**
 * Lightweight inline formatting for authored exam content.
 *
 * The persisted schema stays a plain string — teachers write Markdown-style
 * markers (`**bold**`, `*italic*`, `==highlight==`) and the renderer turns
 * them into React elements. No HTML is ever injected, so authored content
 * cannot break the page or execute scripts.
 */

export type RichTextMark = "strong" | "em" | "mark" | "del"

export type RichTextNode =
  | { type: "text"; value: string }
  | { type: RichTextMark; children: RichTextNode[] }

interface MarkerDefinition {
  marker: string
  type: RichTextMark
}

// Order matters: `**` must win over `*`.
const MARKERS: MarkerDefinition[] = [
  { marker: "**", type: "strong" },
  { marker: "==", type: "mark" },
  { marker: "~~", type: "del" },
  { marker: "*", type: "em" },
]

function findClosingMarker(
  text: string,
  marker: string,
  from: number
): number {
  let index = text.indexOf(marker, from)

  // `***` closes italic immediately followed by bold. Use the last two stars
  // for the bold pair so the first star remains available to close italic.
  if (marker === "**") {
    while (index !== -1 && text[index + 2] === "*") {
      index += 1
    }
  }

  if (marker !== "*") return index

  // A lone `*` must not consume one half of a `**` pair.
  while (index !== -1) {
    const before = text[index - 1]
    const after = text[index + 1]
    if (before !== "*" && after !== "*") return index
    index = text.indexOf(marker, index + 1)
  }
  return -1
}

function parseSegment(text: string): RichTextNode[] {
  const nodes: RichTextNode[] = []
  let plainStart = 0
  let cursor = 0

  while (cursor < text.length) {
    let matched: MarkerDefinition | undefined

    for (const definition of MARKERS) {
      if (text.startsWith(definition.marker, cursor)) {
        matched = definition
        break
      }
    }

    if (!matched) {
      cursor += 1
      continue
    }

    const contentStart = cursor + matched.marker.length
    const close = findClosingMarker(text, matched.marker, contentStart)
    if (close === -1) {
      cursor = contentStart
      continue
    }

    if (cursor > plainStart) {
      nodes.push({ type: "text", value: text.slice(plainStart, cursor) })
    }

    const inner = text.slice(contentStart, close)
    if (inner.length > 0) {
      nodes.push({ type: matched.type, children: parseSegment(inner) })
    }

    cursor = close + matched.marker.length
    plainStart = cursor
  }

  if (plainStart < text.length) {
    nodes.push({ type: "text", value: text.slice(plainStart) })
  }

  return nodes
}

/** Parse authored text into plain-text and formatting nodes. */
export function parseRichText(text: string | null | undefined): RichTextNode[] {
  if (!text) return []
  return parseSegment(text)
}

/** Visible text after removing formatting markers. */
export function richTextToPlainText(text: string | null | undefined): string {
  const flatten = (nodes: RichTextNode[]): string =>
    nodes
      .map((node) => (node.type === "text" ? node.value : flatten(node.children)))
      .join("")
  return flatten(parseRichText(text))
}
