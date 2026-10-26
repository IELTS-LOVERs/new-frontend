import { render, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RichTextEditor } from "./editor"

describe("RichTextEditor", () => {
  it("renders legacy markers as WYSIWYG content (no literal **)", async () => {
    const { container } = render(
      <RichTextEditor legacyText={"Hello **bold** and *italic*"} />
    )

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).not.toBeNull()
    })

    expect(container.textContent).not.toContain("**")
    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.querySelector("em")?.textContent).toBe("italic")
  })

  it("shows the font-size scale and block controls", async () => {
    const { container } = render(<RichTextEditor legacyText="Body" />)

    await waitFor(() => {
      expect(container.querySelector('[role="toolbar"]')).not.toBeNull()
    })

    const sizeSelect = container.querySelector('select[aria-label="Cỡ chữ"]')
    expect(sizeSelect).not.toBeNull()
    expect(
      Array.from(sizeSelect?.querySelectorAll("option") ?? []).map(
        (option) => option.textContent
      )
    ).toEqual(["Cỡ mặc định", "14", "16", "18", "20", "24", "28"])
    expect(container.textContent).toContain("H1")
    expect(
      container.querySelector('[role="toolbar"] button[aria-label="Danh sách gạch đầu dòng"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[role="toolbar"] button[aria-label="Danh sách đánh số"]')
    ).not.toBeNull()
  })
})
