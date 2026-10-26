import { describe, expect, it } from "vitest"

import { clampFontSize, FONT_SIZE_OPTIONS } from "./schema"

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
