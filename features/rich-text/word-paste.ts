import { sanitizePastedHtml } from "./sanitize"

/**
 * Word / Google Docs clipboard normalisation.
 *
 * Word puts list bullets in `mso-list` paragraph styles instead of real
 * `<ul>/<ol>` elements, uses `<span style="font-weight:bold">` instead of
 * `<strong>`, and adds a large amount of `mso-*` noise. The helpers below turn
 * that HTML into the small subset the TipTap schema understands, and can also
 * convert a pasted document into the completion-template DSL.
 */

const FONT_SIZE_SCALE = [14, 16, 18, 20, 24, 28] as const

function parseFontSize(style: string): string | null {
  const match = /font-size\s*:\s*([\d.]+)\s*(pt|px)/i.exec(style)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  if (!Number.isFinite(value)) return null
  const px = match[2].toLowerCase() === "pt" ? value * 1.3333 : value
  // Ignore body-sized Word text so the editor default (15px) wins.
  if (px < 17) return null
  const nearest = FONT_SIZE_SCALE.reduce((best, candidate) =>
    Math.abs(candidate - px) < Math.abs(best - px) ? candidate : best
  )
  return `${nearest}px`
}

function isWordListParagraph(el: Element): boolean {
  if (el.tagName.toLowerCase() !== "p") return false
  return (
    /mso-list/i.test(el.getAttribute("style") ?? "") ||
    /MsoListParagraph/i.test(el.getAttribute("class") ?? "")
  )
}

function wordListLevel(el: Element): number {
  const match = /level(\d+)/i.exec(el.getAttribute("style") ?? "")
  return match ? Math.max(1, Number.parseInt(match[1], 10)) : 1
}

function isOrderedWordList(el: Element): boolean {
  const text = (el.textContent ?? "").trim()
  return /^(?:\d+|[a-zA-Z])[.)]\s/.test(text)
}

function stripWordListMarker(el: Element): void {
  const marker = el.querySelector(
    'span[style*="mso-list:Ignore"], span[style*="mso-list: ignore"]'
  )
  if (marker) {
    marker.remove()
    return
  }

  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const first = walker.nextNode()
  if (first?.nodeValue) {
    first.nodeValue = first.nodeValue.replace(
      /^\s*(?:[•·▪◦o]|(?:\d+|[a-zA-Z])[.)])\s+/,
      ""
    )
  }
}

/** Convert Word's `mso-list` paragraphs into real nested `<ul>/<ol>` lists. */
function convertWordLists(doc: Document): void {
  const paragraphs = Array.from(doc.querySelectorAll("p")).filter(isWordListParagraph)
  if (paragraphs.length === 0) return

  const stacks: HTMLElement[] = []
  let lastItem: HTMLElement | null = null

  for (const paragraph of paragraphs) {
    const level = wordListLevel(paragraph)
    const ordered = isOrderedWordList(paragraph)
    const tag = ordered ? "ol" : "ul"

    // A normal paragraph between list items ends the current list run.
    const previous = paragraph.previousElementSibling
    const previousIsList =
      !!previous && ["ul", "ol"].includes(previous.tagName.toLowerCase())
    if (
      !previous ||
      (!isWordListParagraph(previous) &&
        !previousIsList &&
        previous.tagName.toLowerCase() !== "li")
    ) {
      stacks.length = 0
      lastItem = null
    }

    stacks.length = Math.min(stacks.length, level)

    let list = stacks[level - 1]
    if (!list || list.tagName.toLowerCase() !== tag) {
      list = doc.createElement(tag)
      if (level > 1 && lastItem) {
        lastItem.appendChild(list)
      } else {
        paragraph.parentNode?.insertBefore(list, paragraph)
      }
      stacks[level - 1] = list
      stacks.length = level
    }

    stripWordListMarker(paragraph)
    const item = doc.createElement("li")
    item.innerHTML = paragraph.innerHTML
    list.appendChild(item)
    lastItem = item
    paragraph.remove()
  }
}

/** Rewrite Word's inline style spans into semantic marks. */
function normalizeInlineStyles(doc: Document): void {
  doc.querySelectorAll("span").forEach((span) => {
    const style = span.getAttribute("style") ?? ""
    const fontSize = parseFontSize(style)
    const bold = /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style)
    const italic = /font-style\s*:\s*italic/i.test(style)
    const underline = /text-decoration[^;]*underline/i.test(style)
    const strike = /text-decoration[^;]*line-through/i.test(style)
    const background = /background-color\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()
    const hasHighlight =
      !!background && !/^(?:transparent|white|#fff(?:fff)?|initial|inherit)$/i.test(background)

    if (!fontSize && !bold && !italic && !underline && !strike && !hasHighlight) {
      span.replaceWith(...Array.from(span.childNodes))
      return
    }

    let wrapper: HTMLElement = span.ownerDocument.createElement("span")
    if (fontSize) wrapper.setAttribute("style", `font-size:${fontSize}`)
    wrapper.append(...Array.from(span.childNodes))

    if (hasHighlight) {
      const mark = span.ownerDocument.createElement("mark")
      mark.appendChild(wrapper)
      wrapper = mark
    }

    const marks: string[] = []
    if (bold) marks.push("strong")
    if (italic) marks.push("em")
    if (underline) marks.push("u")
    if (strike) marks.push("s")

    for (const tag of marks.reverse()) {
      const element = span.ownerDocument.createElement(tag)
      element.appendChild(wrapper)
      wrapper = element
    }

    span.replaceWith(wrapper)
  })
}

/**
 * Normalise clipboard HTML coming from Word / Google Docs / Excel.
 * Safe to call with arbitrary HTML; returns an empty string on the server.
 */
export function normalizePastedHtml(html: string): string {
  if (!html) return ""
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return ""

  const doc = new DOMParser().parseFromString(html, "text/html")

  doc
    .querySelectorAll("style, meta, link, title, xml, script, iframe, object, embed")
    .forEach((node) => node.remove())

  // Word images cannot be represented in the editor.
  doc.querySelectorAll("img, v\\:imagedata, v\\:shape").forEach((node) => node.remove())

  // <o:p> is an empty Word paragraph wrapper; keep any children just in case.
  doc.querySelectorAll("o\\:p").forEach((node) => {
    node.replaceWith(...Array.from(node.childNodes))
  })

  const comments: ChildNode[] = []
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT)
  while (walker.nextNode()) comments.push(walker.currentNode as ChildNode)
  comments.forEach((node) => node.remove())

  convertWordLists(doc)
  normalizeInlineStyles(doc)

  doc.querySelectorAll("h4, h5, h6").forEach((heading) => {
    const h3 = doc.createElement("h3")
    h3.innerHTML = heading.innerHTML
    heading.replaceWith(h3)
  })

  doc.querySelectorAll("font").forEach((font) => {
    font.replaceWith(...Array.from(font.childNodes))
  })

  doc.querySelectorAll("span").forEach((span) => {
    if (!span.getAttribute("style")) {
      span.replaceWith(...Array.from(span.childNodes))
    }
  })

  return doc.body.innerHTML
}

/** Full clipboard pipeline used by the TipTap editor. */
export function cleanPastedHtml(html: string): string {
  return sanitizePastedHtml(normalizePastedHtml(html))
}

// ─── Template DSL conversion ────────────────────────────────────────────────

function escapeTablePipes(value: string): string {
  return value.replace(/\|/g, "/")
}

function inlineToDsl(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? ""
  if (node.nodeType !== Node.ELEMENT_NODE) return ""

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  if (tag === "br") return "\n"

  const inner = Array.from(element.childNodes).map(inlineToDsl).join("")
  switch (tag) {
    case "strong":
    case "b":
      return inner.trim() ? `**${inner}**` : inner
    case "em":
    case "i":
      return inner.trim() ? `*${inner}*` : inner
    case "mark":
      return inner.trim() ? `==${inner}==` : inner
    case "s":
    case "strike":
    case "del":
      return inner.trim() ? `~~${inner}~~` : inner
    default:
      return inner
  }
}

function listToDsl(list: Element, depth = 0): string {
  return Array.from(list.children)
    .filter((child) => child.tagName.toLowerCase() === "li")
    .map((item) => {
      const nested = Array.from(item.children).filter((child) =>
        ["ul", "ol"].includes(child.tagName.toLowerCase())
      )
      const own = Array.from(item.childNodes)
        .filter(
          (child) =>
            !(
              child.nodeType === Node.ELEMENT_NODE &&
              ["ul", "ol"].includes((child as Element).tagName.toLowerCase())
            )
        )
        .map(inlineToDsl)
        .join("")
        .trim()
      const line = `${"  ".repeat(depth)}- ${own}`.trimEnd()
      const children = nested.map((child) => listToDsl(child, depth + 1))
      return [line, ...children].join("\n")
    })
    .join("\n")
}

function tableToDsl(table: Element): string {
  const rows = Array.from(table.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) =>
        escapeTablePipes(
          Array.from(cell.childNodes).map(inlineToDsl).join(" ").replace(/\s+/g, " ").trim()
        )
      )
    )
    .filter((cells) => cells.length > 0)

  if (rows.length === 0) return ""

  const width = Math.max(...rows.map((row) => row.length))
  const padded = rows.map((row) => [
    ...row,
    ...Array.from({ length: width - row.length }, () => ""),
  ])
  const [header, ...body] = padded
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ]
  return lines.join("\n")
}

function blockToDsl(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.nodeValue ?? "").trim()
    return text
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ""

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  if (tag === "ul" || tag === "ol") return listToDsl(element)
  if (tag === "table") return tableToDsl(element)
  if (tag === "hr") return "---"
  if (["p", "h1", "h2", "h3", "blockquote", "pre", "div"].includes(tag)) {
    return Array.from(element.childNodes)
      .map(inlineToDsl)
      .join("")
      .trim()
  }
  return Array.from(element.childNodes).map(blockToDsl).filter(Boolean).join("\n\n")
}

/**
 * Convert pasted HTML into the completion-template DSL (`- bullet`, GFM table,
 * `**bold**`, `[1]` blanks are preserved as plain text).
 */
export function htmlToTemplateDsl(html: string): string {
  if (!html) return ""
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return ""

  const safe = sanitizePastedHtml(normalizePastedHtml(html))
  const doc = new DOMParser().parseFromString(safe, "text/html")
  return Array.from(doc.body.childNodes)
    .map(blockToDsl)
    .filter((block) => block.trim().length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
