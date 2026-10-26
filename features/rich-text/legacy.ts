import {
  parseRichText,
  type RichTextMark,
  type RichTextNode,
} from "@/features/exam-engine/lib/rich-text"
import type { RichDoc, RichTextMarkJSON, RichTextNodeJSON } from "@/lib/api/types"

const MARK_TO_PM: Record<RichTextMark, string> = {
  strong: "bold",
  em: "italic",
  mark: "highlight",
  del: "strike",
}

/**
 * Convert the legacy marker syntax (`**bold**`, `*italic*`, `==mark==`,
 * `~~strike~~`) into a ProseMirror document. Paragraphs are separated by blank
 * lines, matching the old renderer's `split(/\n{2,}/)` behaviour.
 */
export function legacyTextToDoc(text: string | null | undefined): RichDoc {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return { type: "doc", content: [{ type: "paragraph" }] }
  }

  const paragraphs = normalized.split(/\n{2,}/)
  const content: RichTextNodeJSON[] = paragraphs.map((paragraph) => ({
    type: "paragraph",
    content: inlineToProseMirror(parseRichText(paragraph)),
  }))

  return { type: "doc", content }
}

function inlineToProseMirror(
  nodes: RichTextNode[],
  marks: RichTextMarkJSON[] = []
): RichTextNodeJSON[] {
  return nodes.flatMap((node) => {
    if (node.type === "text") {
      return textWithBreaks(node.value, marks)
    }

    const nextMarks = [...marks, { type: MARK_TO_PM[node.type] }]
    return inlineToProseMirror(node.children, nextMarks)
  })
}

function textWithBreaks(
  value: string,
  marks: RichTextMarkJSON[]
): RichTextNodeJSON[] {
  const parts = value.split("\n")
  return parts.flatMap((part, index) => {
    const nodes: RichTextNodeJSON[] = []
    if (part.length > 0) {
      nodes.push({
        type: "text",
        text: part,
        ...(marks.length > 0 ? { marks } : {}),
      })
    }
    if (index < parts.length - 1) nodes.push({ type: "hardBreak" })
    return nodes
  })
}
