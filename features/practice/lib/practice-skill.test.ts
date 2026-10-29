import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  PRACTICE_SKILL_STORAGE_KEY,
  getServerPracticeSkill,
  readStoredPracticeSkill,
  subscribePracticeSkill,
  writeStoredPracticeSkill,
} from "./practice-skill"

describe("practice skill memory", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("trả null khi chưa chọn tab nào", () => {
    expect(readStoredPracticeSkill()).toBeNull()
  })

  it("đọc lại đúng tab đã ghi", () => {
    writeStoredPracticeSkill("listening")

    expect(window.localStorage.getItem(PRACTICE_SKILL_STORAGE_KEY)).toBe(
      "listening"
    )
    expect(readStoredPracticeSkill()).toBe("listening")
  })

  it("bỏ qua giá trị lưu không hợp lệ", () => {
    window.localStorage.setItem(PRACTICE_SKILL_STORAGE_KEY, "speaking")

    expect(readStoredPracticeSkill()).toBeNull()
  })

  it("không ném lỗi khi storage bị chặn (chế độ riêng tư)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })

    expect(readStoredPracticeSkill()).toBeNull()
    expect(() => writeStoredPracticeSkill("writing")).not.toThrow()
  })

  it("SSR không biết lựa chọn của người dùng nên trả null", () => {
    writeStoredPracticeSkill("listening")

    expect(getServerPracticeSkill()).toBeNull()
  })

  it("theo dõi thay đổi từ tab khác và huỷ theo dõi được", () => {
    const onChange = vi.fn()
    const unsubscribe = subscribePracticeSkill(onChange)

    window.dispatchEvent(new Event("storage"))
    expect(onChange).toHaveBeenCalledTimes(1)

    unsubscribe()
    window.dispatchEvent(new Event("storage"))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
