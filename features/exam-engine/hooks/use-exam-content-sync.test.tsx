import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useExamContentSync, type ExamContentUpdateEvent } from "./use-exam-content-sync"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { getAttemptExamApi, getAttemptRevisionApi } from "@/lib/api/attempts"
import type { CandidateExam } from "@/lib/api/types"

vi.mock("@/lib/api/attempts", () => ({
  getAttemptRevisionApi: vi.fn(),
  getAttemptExamApi: vi.fn(),
}))

function makeExam(questionIds: string[]): CandidateExam {
  return {
    id: "exam-1",
    title: "Mock exam",
    durationMinutes: 60,
    sections: [
      {
        skill: "reading",
        part: 1,
        title: "Reading 1",
        questionGroups: [
          {
            id: "g1",
            groupType: "form_completion",
            instructions: "",
            config: {},
            questions: questionIds.map((id, index) => ({
              id,
              questionNumber: index + 1,
              prompt: id,
            })),
          },
        ],
      },
    ],
  }
}

describe("useExamContentSync", () => {
  beforeEach(() => {
    useExamSessionStore.getState().reset()
    vi.mocked(getAttemptRevisionApi).mockReset()
    vi.mocked(getAttemptExamApi).mockReset()
  })

  afterEach(() => {
    useExamSessionStore.getState().reset()
  })

  it("downloads and applies new content when the revision changes", async () => {
    useExamSessionStore
      .getState()
      .init("attempt-1", makeExam(["q1", "q2"]), 300, 4)
    useExamSessionStore.getState().setAnswer("q1", "kept")

    vi.mocked(getAttemptRevisionApi).mockResolvedValue({
      revision: 5,
      status: "in_progress",
      remainingSeconds: 280,
    })
    vi.mocked(getAttemptExamApi).mockResolvedValue({
      exam: makeExam(["q1"]),
      revision: 5,
      remainingSeconds: 280,
      updatedAt: new Date().toISOString(),
    })

    const onUpdate = vi.fn<(event: ExamContentUpdateEvent) => void>()
    renderHook(() =>
      useExamContentSync("attempt-1", { enabled: true, onUpdate })
    )

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))

    const event = onUpdate.mock.calls[0][0]
    expect(event.revision).toBe(5)
    expect(event.removedQuestions).toBe(1)
    expect(event.addedQuestions).toBe(0)

    const state = useExamSessionStore.getState()
    expect(state.examRevision).toBe(5)
    expect(state.answers.q1?.value).toBe("kept")
    expect(state.exam?.sections[0].questionGroups?.[0].questions).toHaveLength(1)
  })

  it("does not download the exam when the revision is unchanged", async () => {
    useExamSessionStore
      .getState()
      .init("attempt-1", makeExam(["q1"]), 300, 4)

    vi.mocked(getAttemptRevisionApi).mockResolvedValue({
      revision: 4,
      status: "in_progress",
      remainingSeconds: 280,
    })

    const onUpdate = vi.fn()
    renderHook(() =>
      useExamContentSync("attempt-1", { enabled: true, onUpdate })
    )

    await waitFor(() => expect(getAttemptRevisionApi).toHaveBeenCalled())
    expect(getAttemptExamApi).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it("stops polling once the attempt is no longer in progress", async () => {
    useExamSessionStore
      .getState()
      .init("attempt-1", makeExam(["q1"]), 300, 4)

    vi.mocked(getAttemptRevisionApi).mockResolvedValue({
      revision: 6,
      status: "submitted",
      remainingSeconds: 0,
    })

    const onUpdate = vi.fn()
    renderHook(() =>
      useExamContentSync("attempt-1", { enabled: true, onUpdate })
    )

    await waitFor(() => expect(getAttemptRevisionApi).toHaveBeenCalled())
    expect(getAttemptExamApi).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it("does nothing when disabled", async () => {
    useExamSessionStore
      .getState()
      .init("attempt-1", makeExam(["q1"]), 300, 4)

    renderHook(() =>
      useExamContentSync("attempt-1", { enabled: false })
    )

    await Promise.resolve()
    expect(getAttemptRevisionApi).not.toHaveBeenCalled()
  })
})
