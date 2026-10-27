import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useExamRecovery } from "./use-recovery"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { getAttemptRecoveryApi } from "@/lib/api/attempts"
import { loadAttemptSnapshot, clearAttemptSnapshot } from "../lib/idb"
import { recordAntiCheatEventApi } from "@/lib/api/anti-cheat"
import type { CandidateExam } from "@/lib/api/types"

vi.mock("@/lib/api/attempts", () => ({
  getAttemptRecoveryApi: vi.fn(),
}))

vi.mock("@/lib/api/anti-cheat", () => ({
  recordAntiCheatEventApi: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../lib/idb", () => ({
  loadAttemptSnapshot: vi.fn(),
  clearAttemptSnapshot: vi.fn().mockResolvedValue(undefined),
}))

const exam: CandidateExam = {
  id: "exam-1",
  title: "Mock exam",
  durationMinutes: 60,
  sections: [],
}

describe("useExamRecovery", () => {
  beforeEach(() => {
    useExamSessionStore.getState().reset()
    sessionStorage.clear()
  })

  afterEach(() => {
    useExamSessionStore.getState().reset()
    sessionStorage.clear()
  })

  it("merge: local dirty thắng server, phần còn lại lấy từ server", async () => {
    vi.mocked(loadAttemptSnapshot).mockResolvedValue({
      answers: {
        q1: { value: "local-1", updatedAt: 1, dirty: true },
        q2: { value: "local-2", updatedAt: 1, dirty: true },
        q3: { value: "stale", updatedAt: 1, dirty: false },
      },
      flagged: { q2: true },
      highlights: [
        {
          id: "hl-recovered",
          sectionIndex: 0,
          targetId: "passage",
          start: 5,
          end: 15,
          text: "recovered",
          createdAt: 100,
        },
      ],
      savedAt: 1,
    })

    vi.mocked(getAttemptRecoveryApi).mockResolvedValue({
      attemptId: "attempt-1",
      status: "in_progress",
      remainingSeconds: 500,
      answers: [
        { questionId: "q1", value: "server-1" },
        { questionId: "q3", value: "server-3" },
      ],
      exam,
      revision: 1,
    })

    const { result } = renderHook(() => useExamRecovery("attempt-1"))

    await waitFor(() => expect(result.current.status).toBe("done"))

    const state = useExamSessionStore.getState()
    // q1: local dirty ghi đè server và vẫn dirty để autosave lưu lên.
    expect(state.answers.q1.value).toBe("local-1")
    expect(state.answers.q1.dirty).toBe(true)
    // q3: chỉ có trên server → nhận giá trị server và đã synced.
    expect(state.answers.q3.value).toBe("server-3")
    expect(state.answers.q3.dirty).toBe(false)
    // q2: chỉ có ở local dirty → được khôi phục.
    expect(state.answers.q2.value).toBe("local-2")
    expect(state.flagged.q2).toBe(true)
    // highlights từ local được khôi phục nguyên vẹn.
    expect(state.highlights).toHaveLength(1)
    expect(state.highlights[0].text).toBe("recovered")

    // jsdom không có fullscreen → cần user gesture để vào lại phòng thi.
    expect(result.current.needsGesture).toBe(true)
    expect(state.phase).toBe("resumeGate")

    // Không có marker phiên trước đó → ghi nhận INTERRUPTION.
    await waitFor(() =>
      expect(recordAntiCheatEventApi).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        type: "INTERRUPTION",
      })
    )
  })

  it("dọn snapshot và kết thúc khi server đã nộp bài", async () => {
    vi.mocked(loadAttemptSnapshot).mockResolvedValue(null)
    vi.mocked(getAttemptRecoveryApi).mockResolvedValue({
      attemptId: "attempt-1",
      status: "submitted",
      remainingSeconds: 0,
      answers: [],
      exam,
      revision: 1,
    })

    const { result } = renderHook(() => useExamRecovery("attempt-1"))

    await waitFor(() => expect(result.current.status).toBe("finished"))

    expect(clearAttemptSnapshot).toHaveBeenCalledWith("attempt-1")
    expect(useExamSessionStore.getState().phase).toBe("finished")
    expect(recordAntiCheatEventApi).not.toHaveBeenCalled()
  })

  it("báo lỗi khi không tải được attempt", async () => {
    vi.mocked(loadAttemptSnapshot).mockResolvedValue(null)
    vi.mocked(getAttemptRecoveryApi).mockRejectedValue(new Error("mất kết nối"))

    const { result } = renderHook(() => useExamRecovery("attempt-1"))

    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.error).toBe("mất kết nối")
  })
})

