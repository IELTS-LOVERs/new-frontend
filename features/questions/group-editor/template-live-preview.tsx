"use client"

import * as React from "react"
import { parseMarkdownTable } from "@/features/exam-engine/lib/template-layout"
import { RichText } from "@/features/exam-engine/components/rich-text"

/** Render DSL text with `[n]` blanks turned into visible chips. */
export function TemplatePreviewText({
  text,
  keyPrefix,
}: {
  text: string
  keyPrefix: string
}) {
  return (
    <>
      {text
        .split(/(\[\d+\])/g)
        .filter((chunk) => chunk.length > 0)
        .map((chunk, index) => {
          const blank = /^\[(\d+)\]$/.exec(chunk)
          if (blank) {
            return (
              <span
                key={`${keyPrefix}-blank-${index}`}
                className="mx-0.5 inline-flex min-w-6 items-center justify-center rounded border border-primary/40 bg-primary/10 px-1 font-mono text-[10px] font-bold text-primary"
              >
                {blank[1]}
              </span>
            )
          }
          return <RichText key={`${keyPrefix}-text-${index}`} text={chunk} />
        })}
    </>
  )
}

/**
 * Live preview of the completion template DSL. Mirrors what candidates see
 * (GFM table / bullet list / inline blanks) without changing the persisted
 * string, so authoring and rendering can never drift apart.
 */
export function TemplateLivePreview({
  template,
  groupType,
}: {
  template: string
  groupType: string
}) {
  const table = React.useMemo(() => parseMarkdownTable(template), [template])

  if (table) {
    return (
      <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/15 p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Xem trước
        </p>
        {table.preamble && (
          <p className="text-xs leading-relaxed text-foreground">
            <TemplatePreviewText text={table.preamble} keyPrefix="pre" />
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {table.header.map((cell, index) => (
                  <th
                    key={`th-${index}`}
                    className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold"
                  >
                    <TemplatePreviewText text={cell} keyPrefix={`th-${index}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={`tr-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`td-${rowIndex}-${cellIndex}`}
                      className="border border-border px-2 py-1 align-top"
                    >
                      <TemplatePreviewText
                        text={cell}
                        keyPrefix={`td-${rowIndex}-${cellIndex}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.trailing && (
          <p className="text-xs leading-relaxed text-foreground">
            <TemplatePreviewText text={table.trailing} keyPrefix="post" />
          </p>
        )}
      </div>
    )
  }

  const lines = template.replace(/\r\n/g, "\n").split("\n")
  const blocks: Array<
    { type: "paragraph"; text: string } | { type: "bullet"; text: string }
  > = []
  let paragraph: string[] = []

  const flush = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join("\n").trim()
    if (text) blocks.push({ type: "paragraph", text })
    paragraph = []
  }

  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      flush()
      blocks.push({ type: "bullet", text: bullet[1] })
    } else if (line.trim() === "") {
      flush()
    } else {
      paragraph.push(line)
    }
  }
  flush()

  if (blocks.length === 0) return null

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/15 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Xem trước{groupType === "flow_chart_completion" ? " · Flow chart" : ""}
      </p>
      <div className="exam-prose text-xs leading-relaxed">
        {blocks.map((block, index) =>
          block.type === "bullet" ? (
            <ul key={`block-${index}`} className="my-0.5 list-disc pl-4">
              <li>
                <TemplatePreviewText
                  text={block.text}
                  keyPrefix={`bullet-${index}`}
                />
              </li>
            </ul>
          ) : (
            <p key={`block-${index}`} className="my-0.5 whitespace-pre-line">
              <TemplatePreviewText
                text={block.text}
                keyPrefix={`para-${index}`}
              />
            </p>
          )
        )}
      </div>
    </div>
  )
}
