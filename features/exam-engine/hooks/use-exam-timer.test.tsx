import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useExamTimer } from "./use-exam-timer"
import { useExamSessionStore } from "@/stores/exam-session.store"
import type { CandidateExam } from "@/lib/api/types"

const exam: CandidateExam = {
  id: "exam-1",
  title: "Mock exam",
  durationMinutes: 60,
  sections: [],
}

describe("useExamTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
        "performance",
      ],
    })
    useExamSessionStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    useExamSessionStore.getState().reset()
  })

  it("đếm ngược theo deadlineMono và gọi onExpire đúng một lần", () => {
    const onExpire = vi.fn()

    act(() => {
      useExamSessionStore.getState().init("attempt-1", exam, 10)
    })

    const { result } = renderHook(() => useExamTimer(onExpire))
    expect(result.current.secondsLeft).toBe(10)
    expect(result.current.isActive).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(result.current.secondsLeft).toBe(7)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.secondsLeft).toBe(0)
    expect(onExpire).toHaveBeenCalledTimes(1)

    // Không gọi lại onExpire ở các tick sau khi đã hết giờ.
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it("giữ nguyên 0 giây khi chưa có deadline", () => {
    const { result } = renderHook(() => useExamTimer())
    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.isActive).toBe(false)
  })
})
