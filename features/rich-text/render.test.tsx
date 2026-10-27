import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RichDocInline, RichDocView } from "./render"
import type { RichDoc } from "@/lib/api/types"

const doc: RichDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Heading" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " " },
        { type: "text", text: "big", marks: [{ type: "textStyle", attrs: { fontSize: "999px" } }] },
        { type: "text", text: " <script>alert(1)</script>" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "item" }] },
          ],
        },
      ],
    },
  ],
}

describe("RichDocView", () => {
  it("renders headings, marks, lists and clamps font sizes", () => {
    const { container } = render(<RichDocView doc={doc} />)

    expect(container.querySelector("h2")?.textContent).toBe("Heading")
    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.querySelector("ul li")?.textContent).toBe("item")

    const sized = container.querySelector("span[style]") as HTMLElement | null
    expect(sized?.style.fontSize).toBe("28px")
  })

  it("never injects authored HTML as markup", () => {
    const { container } = render(<RichDocView doc={doc} />)

    expect(container.querySelector("script")).toBeNull()
    expect(container.textContent).toContain("<script>alert(1)</script>")
  })

  it("returns nothing for a null document", () => {
    const { container } = render(<RichDocView doc={null} />)
    expect(container.firstChild).toBeNull()
  })

  it("applies paragraph and heading alignment, ignoring unknown values", () => {
    const { container } = render(
      <RichDocView
        doc={{
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1, textAlign: "center" },
              content: [{ type: "text", text: "Title" }],
            },
            {
              type: "paragraph",
              attrs: { textAlign: "right" },
              content: [{ type: "text", text: "Right" }],
            },
            {
              type: "paragraph",
              attrs: { textAlign: "left" },
              content: [{ type: "text", text: "Left" }],
            },
            {
              type: "paragraph",
              attrs: { textAlign: "sideways" },
              content: [{ type: "text", text: "Bogus" }],
            },
          ],
        }}
      />
    )

    const heading = container.querySelector("h1") as HTMLElement
    const [right, left, bogus] = Array.from(
      container.querySelectorAll("p")
    ) as HTMLElement[]

    expect(heading.style.textAlign).toBe("center")
    expect(right.style.textAlign).toBe("right")
    expect(left.style.textAlign).toBe("left")
    expect(bogus.style.textAlign).toBe("")
  })
})

describe("RichDocInline", () => {
  it("flattens blocks into inline content", () => {
    const { container } = render(
      <RichDocInline
        doc={{
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "One" }] },
            { type: "paragraph", content: [{ type: "text", text: "Two" }] },
          ],
        }}
      />
    )

    expect(container.textContent).toBe("OneTwo")
  })
})
