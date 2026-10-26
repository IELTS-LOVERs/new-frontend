import { describe, expect, it } from "vitest"

import { isRichDocEmpty, richDocToPlainText } from "./plain-text"
import type { RichDoc } from "@/lib/api/types"

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
    { type: "paragraph", content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Two" }] }] },
      ],
    },
    {
      type: "orderedList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }] },
      ],
    },
  ],
}

describe("richDocToPlainText", () => {
  it("flattens headings, paragraphs and lists into a plain-text fallback", () => {
    expect(richDocToPlainText(doc)).toBe(
      "Title\n\nHello world\n\n- One\n\n- Two\n\n1. First"
    )
  })

  it("renders hard breaks as newlines", () => {
    expect(
      richDocToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Line one" },
              { type: "hardBreak" },
              { type: "text", text: "Line two" },
            ],
          },
        ],
      })
    ).toBe("Line one\nLine two")
  })

  it("treats null/empty documents as empty", () => {
    expect(richDocToPlainText(null)).toBe("")
    expect(richDocToPlainText({ type: "doc", content: [{ type: "paragraph" }] })).toBe("")
    expect(isRichDocEmpty({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true)
    expect(isRichDocEmpty(doc)).toBe(false)
  })
})
