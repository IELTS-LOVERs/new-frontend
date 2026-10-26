"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { RichDoc, RichTextNodeJSON } from "@/lib/api/types"
import { useHighlights } from "@/features/exam-engine/components/highlight-layer"
import {
  HL_ITEM_ATTR,
  HL_TARGET_ATTR,
  splitTextByHighlights,
  type ExamHighlightItem,
} from "@/features/exam-engine/lib/highlight"
import { applyMarks } from "./render"

const EMPTY_ITEMS: ExamHighlightItem[] = []

/**
 * Renders a rich document on the exam screen while keeping the character
 * offsets used by the highlight/note engine. Offsets are threaded over the
 * visible text only (same convention as `getSelectionOffsets`, which uses
 * `Range.toString()` and therefore does not count block boundaries).
 */
export function SelectableRichDoc({
  targetId,
  doc,
  className,
}: {
  targetId: string
  doc: RichDoc | null | undefined
  className?: string
}) {
  const api = useHighlights()
  const items = api ? api.itemsFor(targetId) : EMPTY_ITEMS

  const renderLeaf = (
    value: string,
    start: number,
    marks: RichTextNodeJSON["marks"]
  ): React.ReactNode[] => {
    if (!value) return []
    const leafEnd = start + value.length
    const relative = items
      .filter((item) => item.start < leafEnd && item.end > start)
      .map((item) => ({
        ...item,
        start: Math.max(0, item.start - start),
        end: Math.min(value.length, item.end - start),
      }))
    const segments = splitTextByHighlights(value, relative)

    return segments.map((segment, index) => {
      const content = applyMarks(segment.text, marks)
      if (!segment.item) {
        return (
          <React.Fragment key={`leaf-${start}-${index}`}>
            {content}
          </React.Fragment>
        )
      }
      return (
        <mark
          key={`leaf-${start}-${index}`}
          {...{ [HL_ITEM_ATTR]: segment.item.id }}
          title={
            segment.item.note
              ? `Ghi chú: ${segment.item.note}`
              : "Bấm để thêm ghi chú"
          }
          className={cn(
            "cursor-pointer rounded bg-amber-200 px-0.5 font-medium text-stone-900 transition-colors",
            "hover:bg-amber-300 dark:bg-amber-400/70 dark:text-stone-950 dark:hover:bg-amber-400/90",
            segment.item.note && "exam-highlight-note underline decoration-amber-600 decoration-dotted underline-offset-2"
          )}
        >
          {content}
        </mark>
      )
    })
  }

  const renderNodes = (
    nodes: RichTextNodeJSON[],
    keyPrefix: string,
    startOffset: number
  ): { nodes: React.ReactNode[]; offset: number } =>
    nodes.reduce(
      (acc, node, index) => {
        const key = `${keyPrefix}-${index}`
        if (node.type === "text") {
          const text = node.text ?? ""
          return {
            offset: acc.offset + text.length,
            nodes: [
              ...acc.nodes,
              <React.Fragment key={key}>
                {renderLeaf(text, acc.offset, node.marks)}
              </React.Fragment>,
            ],
          }
        }
        if (node.type === "hardBreak") {
          return { offset: acc.offset, nodes: [...acc.nodes, <br key={key} />] }
        }
        if (node.type === "horizontalRule") {
          return { offset: acc.offset, nodes: [...acc.nodes, <hr key={key} />] }
        }

        const child = renderNodes(node.content ?? [], key, acc.offset)

        let rendered: React.ReactNode
        switch (node.type) {
          case "paragraph":
            rendered = (
              <p key={key}>{child.nodes.length > 0 ? child.nodes : <br />}</p>
            )
            break
          case "heading": {
            const rawLevel = Number(node.attrs?.level ?? 1)
            const level = Math.min(
              3,
              Math.max(1, Number.isFinite(rawLevel) ? rawLevel : 1)
            )
            rendered = React.createElement(`h${level}`, { key }, ...child.nodes)
            break
          }
          case "bulletList":
            rendered = <ul key={key}>{child.nodes}</ul>
            break
          case "orderedList":
            rendered = <ol key={key}>{child.nodes}</ol>
            break
          case "listItem":
            rendered = <li key={key}>{child.nodes}</li>
            break
          case "blockquote":
            rendered = <blockquote key={key}>{child.nodes}</blockquote>
            break
          case "codeBlock":
            rendered = (
              <pre key={key}>
                <code>
                  {(node.content ?? [])
                    .map((item) => item.text ?? "")
                    .join("")}
                </code>
              </pre>
            )
            break
          default:
            rendered = <React.Fragment key={key}>{child.nodes}</React.Fragment>
        }

        return { offset: child.offset, nodes: [...acc.nodes, rendered] }
      },
      { nodes: [] as React.ReactNode[], offset: startOffset }
    )

  if (!doc) return null

  const rendered = renderNodes(doc.content ?? [], targetId, 0)

  return (
    <div
      {...{ [HL_TARGET_ATTR]: targetId }}
      className={cn("exam-prose", className)}
    >
      {rendered.nodes}
    </div>
  )
}
