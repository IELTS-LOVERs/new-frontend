import { describe, expect, it } from "vitest"

import { clampFontSize, FONT_SIZE_OPTIONS, clampTextAlign, textAlignStyle } from "./schema"

describe("clampFontSize", () => {
  it("accepts values inside the toolbar scale", () => {
    for (const size of FONT_SIZE_OPTIONS) {
      expect(clampFontSize(`${size}px`)).toBe(`${size}px`)
    }
  })

  it("clamps free-form values into 12–28px", () => {
    expect(clampFontSize("8px")).toBe("12px")
    expect(clampFontSize("999px")).toBe("28px")
    expect(clampFontSize(20)).toBe("20px")
    expect(clampFontSize("17.4pt")).toBe("17px")
  })

  it("ignores empty and invalid values", () => {
    expect(clampFontSize(null)).toBeNull()
    expect(clampFontSize("")).toBeNull()
    expect(clampFontSize("large")).toBeNull()
  })
})

describe("clampTextAlign", () => {
  it("accepts the toolbar alignments, case and whitespace included", () => {
    expect(clampTextAlign("left")).toBe("left")
    expect(clampTextAlign(" Center ")).toBe("center")
    expect(clampTextAlign("RIGHT")).toBe("right")
  })

  it("rejects anything not offered by the toolbar", () => {
    expect(clampTextAlign("justify")).toBeNull()
    expect(clampTextAlign("sideways")).toBeNull()
    expect(clampTextAlign(null)).toBeNull()
    expect(clampTextAlign(undefined)).toBeNull()
    expect(clampTextAlign(2)).toBeNull()
  })
})

describe("textAlignStyle", () => {
  it("returns an inline style only for a valid alignment", () => {
    expect(textAlignStyle("center")).toEqual({ textAlign: "center" })
    expect(textAlignStyle("bogus")).toBeUndefined()
    expect(textAlignStyle(undefined)).toBeUndefined()
  })
})
