import DOMPurify from "dompurify"

/**
 * Allowlist for pasted HTML. Everything the editor can represent is kept;
 * everything else (scripts, styles, images, Word-specific nodes) is removed.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "mark",
  "span",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "hr",
  "a",
]

const ALLOWED_ATTR = ["style", "href", "colspan", "rowspan"]

export function sanitizePastedHtml(html: string): string {
  if (!html) return ""
  if (typeof window === "undefined") return ""
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "img", "iframe", "object", "embed"],
  })
}
