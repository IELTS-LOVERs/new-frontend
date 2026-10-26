import { describe, expect, it } from "vitest"

import { legacyTextToDoc } from "./legacy"

describe("legacyTextToDoc", () => {
  it("converts marker formatting into ProseMirror marks", () => {
    const doc = legacyTextToDoc("Hello **bold** and *italic* and ==mark== and ~~gone~~")

    const inline = doc.content?.[0]?.content ?? []
    expect(inline.map((node) => node.text)).toEqual([
      "Hello ",
      "bold",
      " and ",
      "italic",
      " and ",
      "mark",
      " and ",
      "gone",
    ])
    expect(inline[1]?.marks).toEqual([{ type: "bold" }])
    expect(inline[3]?.marks).toEqual([{ type: "italic" }])
    expect(inline[5]?.marks).toEqual([{ type: "highlight" }])
    expect(inline[7]?.marks).toEqual([{ type: "strike" }])
  })

  it("splits paragraphs on blank lines and keeps single newlines as hard breaks", () => {
    const doc = legacyTextToDoc("Line one\nline two\n\nSecond paragraph")

    expect(doc.content).toHaveLength(2)
    expect(doc.content?.[0]?.content?.some((node) => node.type === "hardBreak")).toBe(
      true
    )
    expect(doc.content?.[1]?.content?.[0]?.text).toBe("Second paragraph")
  })

  it("returns a single empty paragraph for blank input", () => {
    expect(legacyTextToDoc("")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    })
    expect(legacyTextToDoc(null)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    })
  })
})
