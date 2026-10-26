import type { RichDoc, RichTextNodeJSON } from "@/lib/api/types"

/**
 * Visible plain text for a rich document. Used to keep the legacy
 * `passageText` / `instructions` / `prompt` fields in sync so search,
 * checklists and old render paths keep working.
 *
 * Block boundaries are rendered as blank lines; list items get a `- ` prefix.
 */
export function richDocToPlainText(doc: RichDoc | null | undefined): string {
  if (!doc) return ""
  return richDocToBlocks(doc)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function inlineText(node: RichTextNodeJSON): string {
  if (node.type === "text") return node.text ?? ""
  if (node.type === "hardBreak") return "\n"
  if (node.type === "image") return ""
  return (node.content ?? []).map(inlineText).join("")
}

function richDocToBlocks(node: RichTextNodeJSON): string[] {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).flatMap(richDocToBlocks)
    case "paragraph":
    case "heading":
    case "codeBlock":
      return [inlineText(node)]
    case "bulletList":
      return (node.content ?? []).flatMap((item) =>
        richDocToBlocks(item).map((line) => `- ${line}`)
      )
    case "orderedList":
      return (node.content ?? []).flatMap((item, index) =>
        richDocToBlocks(item).map((line) => `${index + 1}. ${line}`)
      )
    case "listItem":
    case "blockquote":
      return (node.content ?? []).flatMap(richDocToBlocks)
    case "horizontalRule":
      return []
    default:
      return node.content ? node.content.flatMap(richDocToBlocks) : [inlineText(node)]
  }
}

/** True when the document has no visible text. */
export function isRichDocEmpty(doc: RichDoc | null | undefined): boolean {
  return richDocToPlainText(doc).length === 0
}
