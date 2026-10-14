import { describe, expect, it } from "vitest"
import { buildSampleTable } from "@/features/questions/lib/completion-template"
import { parseMarkdownTable, splitFlowSteps } from "./template-layout"

describe("parseMarkdownTable", () => {
  it("parse bảng markdown có separator", () => {
    const template = [
      "Complete the table below.",
      "",
      "| Country | Capital | Note |",
      "| --- | --- | --- |",
      "| France | [1] | [2] |",
      "| Japan | [3] | [4] |",
    ].join("\n")

    const table = parseMarkdownTable(template)
    expect(table).not.toBeNull()
    expect(table!.header).toEqual(["Country", "Capital", "Note"])
    expect(table!.rows).toEqual([
      ["France", "[1]", "[2]"],
      ["Japan", "[3]", "[4]"],
    ])
    expect(table!.preamble).toBe("Complete the table below.")
    expect(table!.trailing).toBe("")
  })

  it("parse bảng không có separator", () => {
    const template = ["| A | B |", "| x | [1] |"].join("\n")
    const table = parseMarkdownTable(template)
    expect(table!.header).toEqual(["A", "B"])
    expect(table!.rows).toEqual([["x", "[1]"]])
  })

  it("giữ lại phần văn bản sau bảng", () => {
    const template = [
      "| A | B |",
      "| --- | --- |",
      "| 1 | [1] |",
      "",
      "Answer all questions.",
    ].join("\n")
    const table = parseMarkdownTable(template)
    expect(table!.trailing).toBe("Answer all questions.")
  })

  it("trả về null khi template không phải dạng bảng", () => {
    expect(parseMarkdownTable("Just a normal note with [1].")).toBeNull()
    expect(parseMarkdownTable("")).toBeNull()
    expect(parseMarkdownTable(null)).toBeNull()
  })

  it("trả về null khi chỉ có header mà không có dòng dữ liệu", () => {
    expect(parseMarkdownTable("| A | B |")).toBeNull()
  })

  it("parse được bảng mẫu do builder sinh ra", () => {
    const table = parseMarkdownTable(buildSampleTable(1))
    expect(table).not.toBeNull()
    expect(table!.header).toEqual(["Category", "Detail", "Notes"])
    expect(table!.rows).toHaveLength(3)
    expect(table!.rows[0]).toEqual(["Item A", "[1]", "[2]"])
  })
})

describe("splitFlowSteps", () => {
  it("tách theo dòng trống kép", () => {
    const template = "Step one [1]\n\nStep two [2]\n\nStep three [3]"
    expect(splitFlowSteps(template)).toEqual([
      "Step one [1]",
      "Step two [2]",
      "Step three [3]",
    ])
  })

  it("tách theo gạch đầu dòng", () => {
    const template =
      "- Leaves are picked [1]\n- Leaves are dried [2]\n- Leaves are packed [3]"
    expect(splitFlowSteps(template)).toEqual([
      "Leaves are picked [1]",
      "Leaves are dried [2]",
      "Leaves are packed [3]",
    ])
  })

  it("loại bỏ mũi tên thừa ở đầu/cuối bước", () => {
    const template = "↓ Step one [1]\n\nStep two [2] →"
    expect(splitFlowSteps(template)).toEqual(["Step one [1]", "Step two [2]"])
  })

  it("trả về mảng rỗng khi không có nội dung", () => {
    expect(splitFlowSteps("")).toEqual([])
    expect(splitFlowSteps(null)).toEqual([])
  })
})
