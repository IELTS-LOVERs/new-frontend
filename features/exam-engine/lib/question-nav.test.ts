import { afterEach, describe, expect, it, vi } from "vitest"
import {
  QUESTION_NUMBER_ATTR,
  questionAnchorId,
  questionAnchorSelector,
  scrollToQuestion,
} from "./question-nav"

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("questionAnchorSelector / questionAnchorId", () => {
  it("tạo selector và id ổn định theo số câu", () => {
    expect(questionAnchorSelector(28)).toBe(`[${QUESTION_NUMBER_ATTR}="28"]`)
    expect(questionAnchorId(3)).toBe("exam-q-3")
  })
})

describe("scrollToQuestion", () => {
  it("cuộn tới anchor và trả về true khi tìm thấy", () => {
    const el = document.createElement("div")
    el.setAttribute(QUESTION_NUMBER_ATTR, "3")
    document.body.appendChild(el)

    const spy = vi.fn()
    el.scrollIntoView = spy as unknown as typeof el.scrollIntoView

    expect(scrollToQuestion(3)).toBe(true)
    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("trả về false khi không có anchor tương ứng", () => {
    expect(scrollToQuestion(999)).toBe(false)
  })
})
