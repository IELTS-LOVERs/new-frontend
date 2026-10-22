import { describe, expect, it } from "vitest"

import { parseRichText, richTextToPlainText } from "./rich-text"

describe("parseRichText", () => {
  it("keeps plain text unchanged", () => {
    expect(parseRichText("Plain passage text")).toEqual([
      { type: "text", value: "Plain passage text" },
    ])
  })

  it("parses bold and italic markers", () => {
    expect(parseRichText("A **bold** and *italic* word")).toEqual([
      { type: "text", value: "A " },
      { type: "strong", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " and " },
      { type: "em", children: [{ type: "text", value: "italic" }] },
      { type: "text", value: " word" },
    ])
  })

  it("supports italic nested inside bold", () => {
    expect(parseRichText("**bold *italic* end**")).toEqual([
      {
        type: "strong",
        children: [
          { type: "text", value: "bold " },
          { type: "em", children: [{ type: "text", value: "italic" }] },
          { type: "text", value: " end" },
        ],
      },
    ])
  })

  it("parses highlight and keeps blank tokens as text", () => {
    expect(parseRichText("==key idea== about [1]")).toEqual([
      { type: "mark", children: [{ type: "text", value: "key idea" }] },
      { type: "text", value: " about [1]" },
    ])
  })

  it("leaves unmatched markers literal", () => {
    expect(parseRichText("2 * 3 = 6")).toEqual([
      { type: "text", value: "2 * 3 = 6" },
    ])
  })

  it("does not treat one half of a bold pair as italic", () => {
    expect(richTextToPlainText("**answer**")).toBe("answer")
    expect(richTextToPlainText("**answer** and *note*")).toBe("answer and note")
  })
})

describe("richTextToPlainText", () => {
  it("removes markers from nested formatting", () => {
    expect(richTextToPlainText("**bold *italic*** and ==marked==")).toBe(
      "bold italic and marked"
    )
  })
})
