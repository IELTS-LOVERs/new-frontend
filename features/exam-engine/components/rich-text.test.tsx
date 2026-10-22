import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RichText } from "./rich-text"

describe("RichText", () => {
  it("renders bold, italic, highlight and strikethrough without HTML injection", () => {
    const { container } = render(
      <RichText text={"A **bold** and *italic* and ==marked== and ~~gone~~ <script>"} />
    )

    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.querySelector("em")?.textContent).toBe("italic")
    expect(container.querySelector("mark")?.textContent).toBe("marked")
    expect(container.querySelector("del")?.textContent).toBe("gone")
    expect(container.querySelector("script")).toBeNull()
    expect(screen.getByText(/<script>/)).toBeTruthy()
  })
})
