import * as React from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  HighlightControls,
  HighlightLayer,
  SelectableHighlightedText,
} from "./highlight-layer"
import type { ExamHighlightItem } from "@/features/exam-engine/lib/highlight"

function selectRange(node: Node, start: number, end: number) {
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const selection = window.getSelection()
  if (!selection) throw new Error("jsdom không hỗ trợ Selection")
  selection.removeAllRanges()
  selection.addRange(range)
}

const PASSAGE = "usually good. usually bad."

function renderPassage() {
  render(
    <HighlightLayer sectionIndex={0}>
      <HighlightControls />
      <SelectableHighlightedText targetId="passage" text={PASSAGE} />
    </HighlightLayer>
  )
  const target = document.querySelector(
    '[data-hl-target="passage"]'
  ) as HTMLElement
  return target
}

function ControlledPassage() {
  const [items, setItems] = React.useState<ExamHighlightItem[]>([])
  return (
    <HighlightLayer sectionIndex={0} items={items} onItemsChange={setItems}>
      <HighlightControls />
      <SelectableHighlightedText targetId="passage" text={PASSAGE} />
    </HighlightLayer>
  )
}

describe("HighlightLayer + SelectableHighlightedText", () => {
  it("chỉ highlight đúng vùng bôi đen, không lan sang từ trùng", () => {
    const target = renderPassage()
    // Bôi đen từ "usually" thứ hai (index 14..21).
    const textNode = target.firstChild as Text
    selectRange(textNode, 14, 21)
    fireEvent.mouseUp(target)

    fireEvent.click(screen.getByRole("button", { name: /Highlight/ }))

    const marks = target.querySelectorAll("mark")
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toContain("usually")
    expect(target.textContent).toContain(PASSAGE)
    // Từ "usually" đầu tiên vẫn là văn bản thường.
    expect(target.textContent?.startsWith("usually good.")).toBe(true)
  })

  it("highlight được nhiều đoạn văn bản khác nhau đồng thời (multi-highlight trong controlled mode)", () => {
    render(<ControlledPassage />)
    const target = document.querySelector('[data-hl-target="passage"]') as HTMLElement

    // Highlight 1: "usually" đầu tiên (0..7)
    const node1 = target.firstChild as Text
    selectRange(node1, 0, 7)
    fireEvent.mouseUp(target)
    fireEvent.click(screen.getByRole("button", { name: /Highlight/ }))

    let marks = target.querySelectorAll("mark")
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toContain("usually")

    // Sau khi highlight 1, target có: <mark>usually</mark> và text node " good. usually bad."
    // Highlight 2: "bad" ở cuối (index 15..18 trong text node thứ hai: " good. usually bad.")
    const secondTextNode = target.childNodes[1] as Text
    selectRange(secondTextNode, 15, 18)
    fireEvent.mouseUp(target)
    fireEvent.click(screen.getByRole("button", { name: /Highlight/ }))

    marks = target.querySelectorAll("mark")
    // CẢ 2 ĐOẠN ĐỀU ĐƯỢC HIGHLIGHT ĐỒNG THỜI
    expect(marks).toHaveLength(2)
    expect(marks[0].textContent).toContain("usually")
    expect(marks[1].textContent).toContain("bad")
  })

  it("cho phép thêm, sửa và xoá ghi chú gắn với highlight", () => {
    const target = renderPassage()
    const textNode = target.firstChild as Text
    selectRange(textNode, 14, 21)
    fireEvent.mouseUp(target)
    fireEvent.click(screen.getByRole("button", { name: /Highlight/ }))

    const mark = target.querySelector("mark") as HTMLElement
    expect(mark).toBeTruthy()

    // Bấm vào highlight → mở editor.
    fireEvent.click(mark)
    expect(screen.getAllByText("Ghi chú").length).toBeGreaterThan(0)

    const textarea = screen.getByPlaceholderText("Nhập ghi chú của bạn...")
    fireEvent.change(textarea, { target: { value: "Từ này quan trọng" } })
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }))

    expect(mark.getAttribute("title")).toBe("Ghi chú: Từ này quan trọng")
    // Kiểm tra có badge Note inline
    expect(mark.textContent).toContain("Note")

    // Mở lại → xoá highlight.
    fireEvent.click(mark)
    fireEvent.click(screen.getByRole("button", { name: "Xóa highlight" }))
    expect(target.querySelectorAll("mark")).toHaveLength(0)
    expect(target.textContent).toBe(PASSAGE)
  })

  it("mở tab/drawer danh sách ghi chú và hiển thị thông tin đầy đủ", () => {
    render(<ControlledPassage />)
    const target = document.querySelector('[data-hl-target="passage"]') as HTMLElement

    // Tạo ghi chú
    const textNode = target.firstChild as Text
    selectRange(textNode, 0, 7)
    fireEvent.mouseUp(target)
    fireEvent.click(screen.getByRole("button", { name: /^Note$/ }))

    const textarea = screen.getByPlaceholderText("Nhập ghi chú của bạn...")
    fireEvent.change(textarea, { target: { value: "Ghi chú số 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }))

    // Nút Ghi chú trong HighlightControls hiển thị badge 1
    const notesTabBtn = screen.getByRole("button", { name: /Ghi chú/ })
    expect(notesTabBtn).toBeTruthy()
    fireEvent.click(notesTabBtn)

    // Sheet mở ra hiển thị tiêu đề và nội dung ghi chú
    expect(screen.getByText("Ghi chú của bạn")).toBeTruthy()
    expect(screen.getByText("Ghi chú số 1")).toBeTruthy()
    expect(screen.getAllByText(/usually/).length).toBeGreaterThanOrEqual(2)
  })

  it("tooltip sử dụng icon thật, không sử dụng ký tự emoji", () => {
    const target = renderPassage()
    const textNode = target.firstChild as Text
    selectRange(textNode, 0, 5)
    fireEvent.mouseUp(target)

    const noteBtn = screen.getByRole("button", { name: /^Note$/ })
    const hlBtn = screen.getByRole("button", { name: /^Highlight$/ })

    // Đảm bảo không chứa emoji 💬 hay ✏️
    expect(noteBtn.textContent).toBe("Note")
    expect(hlBtn.textContent).toBe("Highlight")
    // Chứa thẻ svg của Hugeicons
    expect(noteBtn.querySelector("svg")).toBeTruthy()
    expect(hlBtn.querySelector("svg")).toBeTruthy()
  })
})
