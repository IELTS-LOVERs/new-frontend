import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useAutosave } from "./use-autosave"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { ApiError } from "@/lib/api/client"
import { saveAttemptAnswersApi } from "@/lib/api/attempts"
import { saveAttemptSnapshot } from "../lib/idb"
import type { CandidateExam } from "@/lib/api/types"

vi.mock("@/lib/api/attempts", () => ({
  saveAttemptAnswersApi: vi.fn(),
}))

vi.mock("../lib/idb", () => ({
  saveAttemptSnapshot: vi.fn().mockResolvedValue(undefined),
}))

const mockSave = vi.mocked(saveAttemptAnswersApi)
const mockSnapshot = vi.mocked(saveAttemptSnapshot)

const exam: CandidateExam = {
  id: "exam-1",
  title: "Mock exam",
  durationMinutes: 60,
  sections: [],
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useExamSessionStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    useExamSessionStore.getState().reset()
  })

  it("debounce 2s rồi flush các câu dirty và đánh dấu synced", async () => {
    mockSave.mockResolvedValue({ savedCount: 1, serverRemainingSeconds: 120 })
    useExamSessionStore.getState().init("attempt-1", exam, 100)
    renderHook(() => useAutosave("attempt-1"))

    act(() => {
      useExamSessionStore.getState().setAnswer("q1", "A")
    })

    expect(mockSave).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith("attempt-1", {
      answers: [{ questionId: "q1", value: "A" }],
    })

    const state = useExamSessionStore.getState()
    expect(state.answers.q1.dirty).toBe(false)
    expect(state.saveStatus).toBe("saved")
    // Snapshot IndexedDB được ghi (throttle 300ms).
    expect(mockSnapshot).toHaveBeenCalled()
  })

  it("429 → lùi 10s rồi thử lại", async () => {
    mockSave.mockRejectedValue(new ApiError(429, "TOO_MANY_REQUESTS", "Quá nhiều yêu cầu"))
    useExamSessionStore.getState().init("attempt-1", exam, 100)
    renderHook(() => useAutosave("attempt-1"))

    act(() => {
      useExamSessionStore.getState().setAnswer("q1", "A")
    })

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })
    expect(mockSave).toHaveBeenCalledTimes(1)

    // 9s sau vẫn chưa thử lại (chờ đủ 10s do 429).
    await act(async () => {
      vi.advanceTimersByTime(9_000)
    })
    expect(mockSave).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    expect(mockSave).toHaveBeenCalledTimes(2)
    // Câu trả lời vẫn dirty vì lần lưu trước thất bại.
    expect(useExamSessionStore.getState().answers.q1.dirty).toBe(true)
  })

  it("EXAM_EXPIRED → dừng autosave và chuyển phase submitting", async () => {
    mockSave.mockRejectedValue(new ApiError(400, "EXAM_EXPIRED", "Bài thi đã hết giờ"))
    useExamSessionStore.getState().init("attempt-1", exam, 100)
    renderHook(() => useAutosave("attempt-1"))

    act(() => {
      useExamSessionStore.getState().setAnswer("q1", "A")
    })

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(useExamSessionStore.getState().phase).toBe("submitting")

    // Không còn retry nào được lên lịch.
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("không gọi API khi không có attemptId", async () => {
    renderHook(() => useAutosave(null))
    act(() => {
      useExamSessionStore.getState().setAnswer("q1", "A")
    })
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(mockSave).not.toHaveBeenCalled()
  })
})
