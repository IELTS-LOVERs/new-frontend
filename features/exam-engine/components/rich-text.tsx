"use client"

import * as React from "react"

import {
  parseRichText,
  type RichTextMark,
  type RichTextNode,
} from "@/features/exam-engine/lib/rich-text"

const MARK_CLASS: Record<RichTextMark, string> = {
  strong: "font-semibold",
  em: "italic",
  mark: "rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30",
  del: "line-through",
}

/**
 * Render authored inline formatting. Uses React elements only, so this is safe
 * for teacher-supplied strings (no `dangerouslySetInnerHTML`).
 */
export function RichText({
  text,
  className,
}: {
  text: string | null | undefined
  className?: string
}) {
  return (
    <span className={className}>
      {renderRichTextNodes(parseRichText(text), "rt")}
    </span>
  )
}

/** Render rich-text nodes with an optional custom renderer for text leaves. */
export function renderRichTextNodes(
  nodes: RichTextNode[],
  keyPrefix: string,
  renderText?: (value: string, key: string) => React.ReactNode
): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`
    if (node.type === "text") {
      return renderText ? (
        <React.Fragment key={key}>{renderText(node.value, key)}</React.Fragment>
      ) : (
        <React.Fragment key={key}>{node.value}</React.Fragment>
      )
    }

    const children = renderRichTextNodes(node.children, key, renderText)
    if (node.type === "strong") {
      return (
        <strong key={key} className={MARK_CLASS.strong}>
          {children}
        </strong>
      )
    }
    if (node.type === "em") {
      return <em key={key} className={MARK_CLASS.em}>{children}</em>
    }
    if (node.type === "mark") {
      return <mark key={key} className={MARK_CLASS.mark}>{children}</mark>
    }
    return <del key={key} className={MARK_CLASS.del}>{children}</del>
  })
}
