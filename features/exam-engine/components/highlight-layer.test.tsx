import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { HighlightLayer, SelectableHighlightedText } from "./highlight-layer"

function selectRange(root: Element, start: number, end: number) {
  const textNode = root.firstChild as Text
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  const selection = window.getSelection()
  if (!selection) throw new Error("jsdom không hỗ trợ Selection")
  selection.removeAllRanges()
  selection.addRange(range)
}

const PASSAGE = "usually good. usually bad."

function renderPassage() {
  render(
    <HighlightLayer sectionIndex={0}>
      <SelectableHighlightedText targetId="passage" text={PASSAGE} />
    </HighlightLayer>
  )
  const target = document.querySelector(
    '[data-hl-target="passage"]'
  ) as HTMLElement
  return target
}

describe("HighlightLayer + SelectableHighlightedText", () => {
  it("chỉ highlight đúng vùng bôi đen, không lan sang từ trùng", () => {
    const target = renderPassage()
    // Bôi đen từ "usually" thứ hai (index 14..21).
    selectRange(target, 14, 21)
    fireEvent.mouseUp(target)

    fireEvent.click(screen.getByRole("button", { name: /Highlight/ }))

    const marks = target.querySelectorAll("mark")
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe("usually")
    expect(target.textContent).toBe(PASSAGE)
    // Từ "usually" đầu tiên vẫn là văn bản thường.
    expect(target.textContent?.startsWith("usually good.")).toBe(true)
  })

  it("cho phép thêm, sửa và xoá ghi chú gắn với highlight", () => {
    const target = renderPassage()
    selectRange(target, 14, 21)
    fireEvent.mouseUp(target)
    fireEvent.click(screen.getByRole("button", { name: /Highlight/ }))

    const mark = target.querySelector("mark") as HTMLElement
    expect(mark).toBeTruthy()

    // Bấm vào highlight → mở editor.
    fireEvent.click(mark)
    expect(screen.getByText("Ghi chú")).toBeTruthy()

    const textarea = screen.getByPlaceholderText("Nhập ghi chú của bạn...")
    fireEvent.change(textarea, { target: { value: "Từ này quan trọng" } })
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }))

    expect(mark.getAttribute("title")).toBe("Từ này quan trọng")

    // Mở lại → xoá highlight.
    fireEvent.click(mark)
    fireEvent.click(screen.getByRole("button", { name: "Xóa highlight" }))
    expect(target.querySelectorAll("mark")).toHaveLength(0)
    expect(target.textContent).toBe(PASSAGE)
  })

  it("không render highlight khi không có vùng chọn", () => {
    const target = renderPassage()
    expect(target.querySelectorAll("mark")).toHaveLength(0)
    expect(target.textContent).toBe(PASSAGE)
  })
})
