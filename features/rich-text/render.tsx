"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { RichDoc, RichTextNodeJSON } from "@/lib/api/types"
import { clampFontSize } from "./schema"

const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:"]

function safeHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const url = new URL(value, "https://example.invalid")
    if (!ALLOWED_LINK_PROTOCOLS.includes(url.protocol)) return null
    return value
  } catch {
    return null
  }
}

function applyMarks(
  content: React.ReactNode,
  marks: RichTextNodeJSON["marks"] = []
): React.ReactNode {
  let wrapped: React.ReactNode = content
  let fontSize: string | null = null

  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        wrapped = <strong>{wrapped}</strong>
        break
      case "italic":
        wrapped = <em>{wrapped}</em>
        break
      case "underline":
        wrapped = <u>{wrapped}</u>
        break
      case "strike":
        wrapped = <s>{wrapped}</s>
        break
      case "code":
        wrapped = <code>{wrapped}</code>
        break
      case "highlight":
        wrapped = <mark className="rounded bg-amber-200/70 px-0.5 dark:bg-amber-400/30">{wrapped}</mark>
        break
      case "link": {
        const href = safeHref(mark.attrs?.href)
        wrapped = href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {wrapped}
          </a>
        ) : (
          wrapped
        )
        break
      }
      case "textStyle":
        fontSize = clampFontSize(mark.attrs?.fontSize as string | undefined)
        break
      default:
        break
    }
  }

  if (fontSize) {
    wrapped = <span style={{ fontSize }}>{wrapped}</span>
  }

  return wrapped
}

export { applyMarks }

function renderText(
  node: RichTextNodeJSON,
  key: string
): React.ReactNode {
  return (
    <React.Fragment key={key}>
      {applyMarks(node.text ?? "", node.marks)}
    </React.Fragment>
  )
}

function renderChildren(
  node: RichTextNodeJSON,
  keyPrefix: string
): React.ReactNode[] {
  return (node.content ?? []).map((child, index) =>
    renderNode(child, `${keyPrefix}-${index}`)
  )
}

function renderNode(
  node: RichTextNodeJSON,
  key: string
): React.ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key)
    case "hardBreak":
      return <br key={key} />
    case "horizontalRule":
      return <hr key={key} />
    case "paragraph": {
      const children = renderChildren(node, key)
      return (
        <p key={key}>
          {children.length > 0 ? children : <br />}
        </p>
      )
    }
    case "heading": {
      const rawLevel = Number(node.attrs?.level ?? 1)
      const level = Math.min(3, Math.max(1, Number.isFinite(rawLevel) ? rawLevel : 1))
      return React.createElement(
        `h${level}`,
        { key },
        ...renderChildren(node, key)
      )
    }
    case "bulletList":
      return <ul key={key}>{renderChildren(node, key)}</ul>
    case "orderedList": {
      const start = Number(node.attrs?.start)
      return (
        <ol key={key} start={Number.isFinite(start) && start !== 1 ? start : undefined}>
          {renderChildren(node, key)}
        </ol>
      )
    }
    case "listItem":
      return <li key={key}>{renderChildren(node, key)}</li>
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node, key)}</blockquote>
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{node.content?.map((child) => child.text ?? "").join("") ?? ""}</code>
        </pre>
      )
    default:
      return <React.Fragment key={key}>{renderChildren(node, key)}</React.Fragment>
  }
}

/**
 * Student-safe renderer for a rich document. Builds React elements only — no
 * `dangerouslySetInnerHTML` — so authored content cannot inject markup.
 */
export function RichDocView({
  doc,
  className,
}: {
  doc: RichDoc | null | undefined
  className?: string
}) {
  if (!doc) return null
  return (
    <div className={cn("exam-prose", className)}>
      {(doc.content ?? []).map((node, index) => renderNode(node, `doc-${index}`))}
    </div>
  )
}

/** Inline renderer for content that must live inside a `<p>`/`<span>`. */
export function RichDocInline({
  doc,
  className,
}: {
  doc: RichDoc | null | undefined
  className?: string
}) {
  if (!doc) return null

  const inline = (nodes: RichTextNodeJSON[], keyPrefix: string): React.ReactNode[] =>
    nodes.flatMap((node, index) => {
      const key = `${keyPrefix}-${index}`
      if (node.type === "text" || node.type === "hardBreak") {
        return [renderNode(node, key)]
      }
      if (node.type === "listItem") {
        return [
          ...inline(node.content ?? [], key),
          <React.Fragment key={`${key}-space`}> </React.Fragment>,
        ]
      }
      return inline(node.content ?? [], key)
    })

  return (
    <span className={cn("exam-prose inline", className)}>
      {inline(doc.content ?? [], "inline")}
    </span>
  )
}
