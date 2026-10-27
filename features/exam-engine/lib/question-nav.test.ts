import { afterEach, describe, expect, it, vi } from "vitest"
import {
  QUESTION_ID_ATTR,
  questionAnchorId,
  questionAnchorSelector,
  scrollToQuestion,
} from "./question-nav"

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("questionAnchorSelector / questionAnchorId", () => {
  it("tạo selector và id ổn định theo id câu hỏi", () => {
    expect(questionAnchorSelector("q28")).toBe(`[${QUESTION_ID_ATTR}="q28"]`)
    expect(questionAnchorId("q3")).toBe("exam-q-q3")
  })
})

describe("scrollToQuestion", () => {
  it("cuộn tới anchor và trả về true khi tìm thấy", () => {
    const el = document.createElement("div")
    el.setAttribute(QUESTION_ID_ATTR, "q3")
    document.body.appendChild(el)

    const spy = vi.fn()
    el.scrollIntoView = spy as unknown as typeof el.scrollIntoView

    expect(scrollToQuestion("q3")).toBe(true)
    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("trả về false khi không có anchor tương ứng", () => {
    expect(scrollToQuestion("missing")).toBe(false)
  })

  it("không nhầm hai câu cùng số nhưng khác id", () => {
    const listening = document.createElement("div")
    listening.setAttribute(QUESTION_ID_ATTR, "l1")
    const reading = document.createElement("div")
    reading.setAttribute(QUESTION_ID_ATTR, "r1")
    document.body.append(listening, reading)

    const listeningSpy = vi.fn()
    const readingSpy = vi.fn()
    listening.scrollIntoView = listeningSpy as unknown as typeof listening.scrollIntoView
    reading.scrollIntoView = readingSpy as unknown as typeof reading.scrollIntoView

    expect(scrollToQuestion("r1")).toBe(true)
    expect(listeningSpy).not.toHaveBeenCalled()
    expect(readingSpy).toHaveBeenCalled()
  })
})
