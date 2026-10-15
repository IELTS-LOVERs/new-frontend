import { describe, expect, it } from "vitest"
import {
  HL_TARGET_ATTR,
  createHighlightId,
  findHighlightAtOffset,
  findHighlightTarget,
  getSelectionOffsets,
  isOverlapping,
  normalizeHighlights,
  splitTextByHighlights,
  type ExamHighlightItem,
} from "./highlight"

function item(overrides: Partial<ExamHighlightItem> = {}): ExamHighlightItem {
  return {
    id: "hl-1",
    sectionIndex: 0,
    targetId: "passage",
    start: 0,
    end: 5,
    text: "hello",
    createdAt: 0,
    ...overrides,
  }
}

describe("createHighlightId", () => {
  it("sinh id duy nhất theo tiền tố", () => {
    const a = createHighlightId()
    const b = createHighlightId()
    expect(a).not.toBe(b)
    expect(a.startsWith("hl-")).toBe(true)
  })
})

describe("isOverlapping", () => {
  it("phát hiện chồng lấn và bỏ qua khoảng kề nhau", () => {
    expect(isOverlapping({ start: 0, end: 5 }, { start: 3, end: 8 })).toBe(true)
    expect(isOverlapping({ start: 0, end: 5 }, { start: 5, end: 8 })).toBe(false)
    expect(isOverlapping({ start: 2, end: 4 }, { start: 0, end: 10 })).toBe(true)
  })
})

describe("normalizeHighlights", () => {
  it("loại khoảng không hợp lệ và sắp xếp theo offset", () => {
    const items = [
      item({ id: "c", start: 10, end: 12 }),
      item({ id: "a", start: 0, end: 5 }),
      item({ id: "neg", start: -1, end: 3 }),
      item({ id: "empty", start: 4, end: 4 }),
      item({ id: "oob", start: 20, end: 40 }),
      item({ id: "b", start: 6, end: 8 }),
    ]
    expect(normalizeHighlights(items, 30).map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ])
  })
})

describe("splitTextByHighlights", () => {
  it("không thay đổi gì khi không có highlight", () => {
    expect(splitTextByHighlights("hello world", [])).toEqual([
      { text: "hello world" },
    ])
  })

  it("chỉ highlight đúng vùng offset được chọn (bug 'usually')", () => {
    const text = "usually good. usually bad."
    // Chỉ bôi đen từ "usually" thứ hai (index 14..21).
    const segments = splitTextByHighlights(text, [
      item({ start: 14, end: 21, text: "usually" }),
    ])

    expect(segments.map((s) => s.text).join("")).toBe(text)
    const highlighted = segments.filter((s) => s.item)
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0].text).toBe("usually")
    expect(highlighted[0].item?.start).toBe(14)

    // Từ "usually" đầu tiên phải là văn bản thường.
    expect(segments[0]).toEqual({ text: "usually good. " })
  })

  it("tách nhiều highlight rời rạc và bảo toàn toàn bộ văn bản", () => {
    const text = "abcdefghij"
    const segments = splitTextByHighlights(text, [
      item({ start: 2, end: 4 }),
      item({ start: 6, end: 9 }),
    ])
    expect(segments.map((s) => s.text).join("")).toBe(text)
    expect(segments).toEqual([
      { text: "ab" },
      { text: "cd", item: expect.objectContaining({ start: 2, end: 4 }) },
      { text: "ef" },
      { text: "ghi", item: expect.objectContaining({ start: 6, end: 9 }) },
      { text: "j" },
    ])
  })

  it("bỏ qua highlight chồng lấn (khoảng hợp lệ sớm nhất thắng)", () => {
    const text = "abcdefghij"
    const segments = splitTextByHighlights(text, [
      item({ start: 1, end: 6 }),
      item({ start: 3, end: 8 }),
    ])
    const highlighted = segments.filter((s) => s.item)
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0].text).toBe("bcdef")
  })

  it("trả về mảng rỗng với chuỗi rỗng", () => {
    expect(splitTextByHighlights("", [item()])).toEqual([])
  })
})

describe("findHighlightAtOffset", () => {
  it("tìm đúng item chứa offset", () => {
    const items = [item({ start: 0, end: 5 }), item({ id: "b", start: 6, end: 9 })]
    expect(findHighlightAtOffset(items, 7)?.id).toBe("b")
    expect(findHighlightAtOffset(items, 5)).toBeUndefined()
  })
})

describe("getSelectionOffsets", () => {
  function makeRoot(html: string) {
    const root = document.createElement("div")
    root.innerHTML = html
    document.body.appendChild(root)
    return root
  }

  it("tính offset ký tự cho vùng chọn trong một text node", () => {
    const root = makeRoot("usually good. usually bad.")
    const textNode = root.firstChild as Text
    const range = document.createRange()
    range.setStart(textNode, 14)
    range.setEnd(textNode, 21)

    expect(getSelectionOffsets(range, root)).toEqual({ start: 14, end: 21 })
  })

  it("tính offset xuyên qua nhiều phần tử con", () => {
    const root = makeRoot("<span>ab</span><span>cd</span>")
    const second = root.children[1].firstChild as Text
    const range = document.createRange()
    range.setStart(second, 1)
    range.setEnd(second, 2)

    expect(getSelectionOffsets(range, root)).toEqual({ start: 3, end: 4 })
  })

  it("trả về null khi vùng chọn rỗng hoặc nằm ngoài root", () => {
    const root = makeRoot("hello")
    const outside = document.createElement("p")
    outside.textContent = "nope"
    document.body.appendChild(outside)

    const collapsed = document.createRange()
    collapsed.setStart(root.firstChild as Text, 1)
    collapsed.collapse(true)
    expect(getSelectionOffsets(collapsed, root)).toBeNull()

    const foreign = document.createRange()
    foreign.setStart(outside.firstChild as Text, 0)
    foreign.setEnd(outside.firstChild as Text, 2)
    expect(getSelectionOffsets(foreign, root)).toBeNull()
  })
})

describe("findHighlightTarget", () => {
  it("leo cây DOM để tìm phần tử data-hl-target gần nhất", () => {
    const root = document.createElement("div")
    root.setAttribute(HL_TARGET_ATTR, "passage")
    root.innerHTML = `<span>hi</span>`
    document.body.appendChild(root)

    const textNode = root.querySelector("span")!.firstChild as Text
    expect(findHighlightTarget(textNode)).toBe(root)
    expect(findHighlightTarget(document.body)).toBeNull()
  })
})
