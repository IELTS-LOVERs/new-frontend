import { describe, expect, it } from "vitest"
import type { QuestionItem } from "@/lib/api/types"
import {
  alignTemplatePlaceholders,
  appendToken,
  buildSampleTable,
  extractTemplatePlaceholders,
  insertTokenAtCursor,
  nextBlankNumber,
  reconcileTemplateQuestions,
  removeTemplatePlaceholder,
  rewriteTemplatePlaceholders,
} from "./completion-template"

function q(
  id: string,
  questionNumber: number,
  acceptedAnswers: string[] = []
): QuestionItem {
  return { id, questionNumber, prompt: "", acceptedAnswers, points: 1 }
}

describe("extractTemplatePlaceholders", () => {
  it("nhận diện cả cú pháp [1] và {{q1}}", () => {
    const template = "Tea was found in [1] and used for {{q2}} purposes."
    expect(extractTemplatePlaceholders(template)).toEqual([1, 2])
  })

  it("loại trùng và sắp xếp tăng dần", () => {
    const template = "[3] ... [1] ... [3] ... [q2]"
    expect(extractTemplatePlaceholders(template)).toEqual([1, 2, 3])
  })

  it("trả về mảng rỗng khi không có ô trống", () => {
    expect(extractTemplatePlaceholders("")).toEqual([])
    expect(extractTemplatePlaceholders("no blanks here")).toEqual([])
  })
})

describe("nextBlankNumber", () => {
  it("bắt đầu từ 1 khi chưa có câu hỏi", () => {
    expect(nextBlankNumber([])).toBe(1)
  })

  it("là số lớn nhất cộng một", () => {
    expect(
      nextBlankNumber([{ questionNumber: 14 }, { questionNumber: 16 }])
    ).toBe(17)
  })
})

describe("rewriteTemplatePlaceholders / alignTemplatePlaceholders", () => {
  it("đổi số ô trống và giữ cú pháp q", () => {
    expect(
      rewriteTemplatePlaceholders("A [1] B [q2] C {{1}} D {{q2}}", new Map([
        [1, 6],
        [2, 7],
      ]))
    ).toBe("A [6] B [q7] C {{6}} D {{q7}}")
  })

  it("căn template của nhóm ngân hàng theo số câu mới", () => {
    expect(
      alignTemplatePlaceholders(
        "Name: [1]\nCity: [2]\nPhone: [3]",
        [1, 2, 3],
        [21, 22, 23]
      )
    ).toBe("Name: [21]\nCity: [22]\nPhone: [23]")
  })

  it("giữ nguyên template đã khớp và không đụng ô trống lạ", () => {
    expect(
      alignTemplatePlaceholders("Name: [21]\nCity: [22]", [21, 22], [21, 22])
    ).toBe("Name: [21]\nCity: [22]")
    expect(alignTemplatePlaceholders("[1] [2] [9]", [1, 2], [5, 6])).toBe(
      "[5] [6] [9]"
    )
  })
})

describe("reconcileTemplateQuestions", () => {
  it("thêm câu hỏi cho ô trống mới và giữ nguyên đáp án đã nhập", () => {
    const existing = [q("a", 1, ["medicinal"])]
    const { questions, changed } = reconcileTemplateQuestions(
      "Tea [1] and [2]",
      existing,
      (num) => `new-${num}`
    )
    expect(changed).toBe(true)
    expect(questions).toHaveLength(2)
    expect(questions[0]).toBe(existing[0])
    expect(questions[0].acceptedAnswers).toEqual(["medicinal"])
    expect(questions[1]).toMatchObject({ id: "new-2", questionNumber: 2 })
  })

  it("xóa câu hỏi không còn ô trống tương ứng", () => {
    const existing = [q("a", 1), q("b", 2), q("c", 3)]
    const { questions, changed } = reconcileTemplateQuestions(
      "[1] [3]",
      existing,
      (n) => `new-${n}`
    )
    expect(changed).toBe(true)
    expect(questions.map((item) => item.questionNumber)).toEqual([1, 3])
  })

  it("không thay đổi gì khi template không có ô trống nào", () => {
    const existing = [q("a", 1), q("b", 2)]
    const { questions, changed } = reconcileTemplateQuestions(
      "",
      existing,
      (n) => `new-${n}`
    )
    expect(changed).toBe(false)
    expect(questions).toBe(existing)
  })

  it("báo không thay đổi khi mọi ô trống đã có câu hỏi", () => {
    const existing = [q("a", 1), q("b", 2)]
    const { questions, changed } = reconcileTemplateQuestions(
      "[1] [2]",
      existing,
      (n) => `new-${n}`
    )
    expect(changed).toBe(false)
    expect(questions).toHaveLength(2)
  })

  it("addOnly chỉ thêm câu hỏi còn thiếu và giữ câu hỏi cũ", () => {
    const existing = [q("a", 1, ["one"]), q("b", 2, ["two"]), q("c", 9)]
    const { questions, changed } = reconcileTemplateQuestions(
      "[1] [2] [3] [4]",
      existing,
      (n) => `new-${n}`,
      { addOnly: true }
    )

    expect(changed).toBe(true)
    expect(questions.map((item) => item.id)).toEqual(["a", "b", "c", "new-3", "new-4"])
    expect(questions[0].acceptedAnswers).toEqual(["one"])
  })

  it("addOnly không báo thay đổi khi đã đủ câu hỏi", () => {
    const existing = [q("a", 1), q("b", 2)]
    const { questions, changed } = reconcileTemplateQuestions(
      "[1] [2]",
      existing,
      (n) => `new-${n}`,
      { addOnly: true }
    )
    expect(changed).toBe(false)
    expect(questions).toBe(existing)
  })
})

describe("removeTemplatePlaceholder", () => {
  it("xóa cả cú pháp [X] và {{qX}} của đúng số đã cho", () => {
    const template = "A [1] B {{q1}} C [2]"
    expect(removeTemplatePlaceholder(template, 1)).toBe("A  B  C [2]")
  })
})

describe("insertTokenAtCursor", () => {
  it("chèn token tại vị trí con trỏ và trả về caret mới", () => {
    const { value, caret } = insertTokenAtCursor("Tea [] purposes", "[1]", 4, 4)
    expect(value).toBe("Tea [1][] purposes")
    expect(caret).toBe(7)
  })

  it("thay thế đoạn bôi đen bằng token", () => {
    const { value } = insertTokenAtCursor("Tea [] here", "[2]", 4, 6)
    expect(value).toBe("Tea [2] here")
  })
})

describe("appendToken", () => {
  it("nối token vào cuối khi ô nhập rỗng", () => {
    expect(appendToken("", "[1]").value).toBe("[1]")
  })

  it("tự thêm khoảng trắng phân tách khi cần", () => {
    expect(appendToken("Tea", "[2]").value).toBe("Tea [2]")
  })

  it("không thêm khoảng trắng khi đã có sẵn", () => {
    expect(appendToken("Tea ", "[2]").value).toBe("Tea [2]")
  })
})

describe("buildSampleTable", () => {
  it("tạo bảng markdown 3 cột với các ô trống liên tiếp từ số bắt đầu", () => {
    const table = buildSampleTable(5)
    expect(table).toBe(
      [
        "| Category | Detail | Notes |",
        "| --- | --- | --- |",
        "| Item A | [5] | [6] |",
        "| Item B | [7] | [8] |",
        "| Item C | [9] | [10] |",
      ].join("\n")
    )
    expect(extractTemplatePlaceholders(table)).toEqual([5, 6, 7, 8, 9, 10])
  })
})
