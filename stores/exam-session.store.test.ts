import { afterEach, describe, expect, it } from "vitest"
import {
  collectAllQuestionIds,
  examUsesGroups,
  useExamSessionStore,
} from "./exam-session.store"
import type { CandidateExam, CandidateSection } from "@/lib/api/types"

function makeExam(sections: CandidateSection[] = []): CandidateExam {
  return { id: "exam-1", title: "Mock exam", durationMinutes: 60, sections }
}

const readingSection: CandidateSection = {
  skill: "reading",
  part: 1,
  title: "Reading 1",
  questionGroups: [
    {
      id: "g1",
      groupType: "form_completion",
      instructions: "",
      config: {},
      questions: [
        { id: "q1", questionNumber: 1, prompt: "One" },
        { id: "q2", questionNumber: 2, prompt: "Two" },
      ],
    },
  ],
}

const legacySection: CandidateSection = {
  skill: "listening",
  part: 1,
  title: "Listening 1",
}

describe("useExamSessionStore", () => {
  afterEach(() => {
    useExamSessionStore.getState().reset()
  })

  it("khởi tạo ở trạng thái loading rỗng", () => {
    const s = useExamSessionStore.getState()
    expect(s.attemptId).toBeNull()
    expect(s.exam).toBeNull()
    expect(s.phase).toBe("loading")
    expect(s.deadlineMono).toBeNull()
    expect(s.answers).toEqual({})
    expect(s.flagged).toEqual({})
    expect(s.saveStatus).toBe("idle")
    expect(s.activeSectionIndex).toBe(0)
    expect(s.ui).toEqual({ fontScale: 1, theme: "white", splitRatio: 50 })
  })

  it("init set attempt/exam, tính deadline từ remainingSeconds và chuyển phase active", () => {
    const before = performance.now()
    useExamSessionStore.getState().init("attempt-1", makeExam(), 300)
    const after = performance.now()

    const s = useExamSessionStore.getState()
    expect(s.attemptId).toBe("attempt-1")
    expect(s.exam?.id).toBe("exam-1")
    expect(s.phase).toBe("active")
    expect(s.deadlineMono).toBeGreaterThanOrEqual(before + 300_000)
    expect(s.deadlineMono).toBeLessThanOrEqual(after + 300_000)
    // init xoá sạch dữ liệu phiên trước
    expect(s.answers).toEqual({})
    expect(s.flagged).toEqual({})
    expect(s.lastSavedAt).toBeNull()
  })

  it("setAnswer ghi giá trị và đánh dấu dirty", () => {
    useExamSessionStore.getState().setAnswer("q1", "hello")
    const a = useExamSessionStore.getState().answers.q1
    expect(a.value).toBe("hello")
    expect(a.dirty).toBe(true)
    expect(a.updatedAt).toBeGreaterThan(0)
  })

  it("setAnswer giữ saveStatus 'saving' khi đang lưu, còn lại về idle", () => {
    useExamSessionStore.getState().setSaveStatus("saving")
    useExamSessionStore.getState().setAnswer("q1", "x")
    expect(useExamSessionStore.getState().saveStatus).toBe("saving")

    useExamSessionStore.getState().setSaveStatus("error")
    useExamSessionStore.getState().setAnswer("q2", "y")
    expect(useExamSessionStore.getState().saveStatus).toBe("idle")
  })

  it("markAnswerSynced xoá dirty khi không có chỉnh sửa mới hơn", () => {
    useExamSessionStore.getState().setAnswer("q1", "a")
    const { updatedAt } = useExamSessionStore.getState().answers.q1

    useExamSessionStore.getState().markAnswerSynced("q1", updatedAt)

    expect(useExamSessionStore.getState().answers.q1.dirty).toBe(false)
  })

  it("markAnswerSynced bỏ qua nếu có chỉnh sửa mới hơn thời điểm gửi", () => {
    useExamSessionStore.getState().setAnswer("q1", "a")
    const { updatedAt } = useExamSessionStore.getState().answers.q1

    useExamSessionStore.getState().markAnswerSynced("q1", updatedAt - 1)

    expect(useExamSessionStore.getState().answers.q1.dirty).toBe(true)
  })

  it("markAnswerSynced bỏ qua câu không tồn tại", () => {
    useExamSessionStore.getState().markAnswerSynced("ghost", Date.now())
    expect(useExamSessionStore.getState().answers.ghost).toBeUndefined()
  })

  it("markAnswersSynced set 'saved', cập nhật lastSavedAt và tôn trọng câu mới hơn", async () => {
    useExamSessionStore.getState().setAnswer("q1", "a")
    useExamSessionStore.getState().setAnswer("q2", "b")
    const q1At = useExamSessionStore.getState().answers.q1.updatedAt

    useExamSessionStore.getState().markAnswersSynced(["q1", "q2"], Date.now())

    const s = useExamSessionStore.getState()
    expect(s.answers.q1.dirty).toBe(false)
    expect(s.answers.q2.dirty).toBe(false)
    expect(s.saveStatus).toBe("saved")
    expect(s.lastSavedAt).not.toBeNull()

    // gửi lại với mốc thời gian trước khi q1 được cập nhật → q1 vẫn dirty
    await new Promise((r) => setTimeout(r, 5))
    useExamSessionStore.getState().setAnswer("q1", "a2")
    useExamSessionStore.getState().markAnswersSynced(["q1"], q1At)
    expect(useExamSessionStore.getState().answers.q1.dirty).toBe(true)
  })

  it("toggleFlag bật/tắt cờ đánh dấu", () => {
    useExamSessionStore.getState().toggleFlag("q1")
    expect(useExamSessionStore.getState().flagged.q1).toBe(true)
    useExamSessionStore.getState().toggleFlag("q1")
    expect(useExamSessionStore.getState().flagged.q1).toBeUndefined()
  })

  it("điều hướng phần thi và câu đang chọn", () => {
    useExamSessionStore.getState().setActiveSectionIndex(2)
    useExamSessionStore.getState().setActiveQuestion("q9")
    expect(useExamSessionStore.getState().activeSectionIndex).toBe(2)
    expect(useExamSessionStore.getState().activeQuestionId).toBe("q9")
  })

  it("resyncTimer tính lại deadline theo server", () => {
    useExamSessionStore.getState().init("attempt-1", makeExam(), 100)
    const before = performance.now()
    useExamSessionStore.getState().resyncTimer(600)
    const after = performance.now()

    const deadline = useExamSessionStore.getState().deadlineMono!
    expect(deadline).toBeGreaterThanOrEqual(before + 600_000)
    expect(deadline).toBeLessThanOrEqual(after + 600_000)
  })

  it("cập nhật vị trí audio và tuỳ chọn UI", () => {
    useExamSessionStore.getState().setAudioPosition(0, 12.5)
    useExamSessionStore.getState().setAudioPosition(1, 3)
    expect(useExamSessionStore.getState().audio).toEqual({
      0: { position: 12.5 },
      1: { position: 3 },
    })

    useExamSessionStore.getState().setUIFontScale(1.25)
    useExamSessionStore.getState().setUITheme("cream")
    useExamSessionStore.getState().setSplitRatio(70)
    expect(useExamSessionStore.getState().ui).toEqual({
      fontScale: 1.25,
      theme: "cream",
      splitRatio: 70,
    })
  })

  it("setHighlights lưu danh sách highlight và reset xoá sạch", () => {
    useExamSessionStore.getState().setHighlights([
      {
        id: "hl-1",
        sectionIndex: 0,
        targetId: "passage",
        start: 10,
        end: 20,
        text: "test text",
        createdAt: 123,
      },
    ])
    expect(useExamSessionStore.getState().highlights).toHaveLength(1)
    expect(useExamSessionStore.getState().highlights[0].text).toBe("test text")

    useExamSessionStore.getState().reset()
    expect(useExamSessionStore.getState().highlights).toEqual([])
  })

  it("reset đưa toàn bộ state về ban đầu", () => {
    useExamSessionStore.getState().init("attempt-1", makeExam([readingSection]), 100)
    useExamSessionStore.getState().setAnswer("q1", "a")
    useExamSessionStore.getState().toggleFlag("q1")
    useExamSessionStore.getState().setPhase("finished")

    useExamSessionStore.getState().reset()

    const s = useExamSessionStore.getState()
    expect(s.attemptId).toBeNull()
    expect(s.phase).toBe("loading")
    expect(s.answers).toEqual({})
    expect(s.flagged).toEqual({})
    expect(s.deadlineMono).toBeNull()
  })
})

describe("examUsesGroups", () => {
  it("true khi có ít nhất một section dùng questionGroups", () => {
    expect(examUsesGroups(makeExam([readingSection]))).toBe(true)
    expect(examUsesGroups(makeExam([legacySection, readingSection]))).toBe(true)
  })

  it("false khi mọi section là legacy (không có nhóm câu)", () => {
    expect(examUsesGroups(makeExam([legacySection]))).toBe(false)
    expect(examUsesGroups(makeExam([]))).toBe(false)
  })
})

describe("collectAllQuestionIds", () => {
  it("gom id toàn bộ câu hỏi từ mọi nhóm của mọi phần", () => {
    const exam = makeExam([
      readingSection,
      {
        skill: "listening",
        part: 2,
        title: "Listening 2",
        questionGroups: [
          {
            id: "g2",
            groupType: "multiple_choice_single",
            instructions: "",
            config: {},
            questions: [{ id: "q3", questionNumber: 3, prompt: "Three" }],
          },
        ],
      },
    ])

    expect(collectAllQuestionIds(exam)).toEqual(["q1", "q2", "q3"])
  })

  it("bỏ qua section legacy không có câu hỏi", () => {
    expect(collectAllQuestionIds(makeExam([legacySection]))).toEqual([])
  })
})

describe("applyExamUpdate", () => {
  afterEach(() => {
    useExamSessionStore.getState().reset()
  })

  it("swaps content while keeping answers, flags, highlights and the deadline", () => {
    useExamSessionStore.getState().init("attempt-1", makeExam([readingSection]), 300, 3)
    const store = useExamSessionStore.getState()
    store.setAnswer("q1", "one")
    store.toggleFlag("q1")
    store.setHighlights([
      {
        id: "hl-1",
        sectionIndex: 0,
        targetId: "q-q1",
        start: 0,
        end: 3,
        text: "one",
        createdAt: 1,
      },
    ])
    const deadlineBefore = useExamSessionStore.getState().deadlineMono

    const updatedSection: CandidateSection = {
      ...readingSection,
      title: "Reading 1 (edited)",
    }
    const summary = useExamSessionStore
      .getState()
      .applyExamUpdate(makeExam([updatedSection]), 4)

    const s = useExamSessionStore.getState()
    expect(summary).toMatchObject({
      addedQuestions: 0,
      removedQuestions: 0,
      sectionsChanged: false,
      activeQuestionRemoved: false,
    })
    expect(s.exam?.sections[0].title).toBe("Reading 1 (edited)")
    expect(s.examRevision).toBe(4)
    expect(s.answers.q1?.value).toBe("one")
    expect(s.flagged.q1).toBe(true)
    expect(s.highlights).toHaveLength(1)
    expect(s.deadlineMono).toBe(deadlineBefore)
  })

  it("drops answers/flags/highlights for removed questions", () => {
    useExamSessionStore.getState().init("attempt-1", makeExam([readingSection]), 300, 1)
    const store = useExamSessionStore.getState()
    store.setAnswer("q1", "one")
    store.setAnswer("q2", "two")
    store.toggleFlag("q2")
    store.setHighlights([
      {
        id: "hl-1",
        sectionIndex: 0,
        targetId: "q-q2",
        start: 0,
        end: 3,
        text: "two",
        createdAt: 1,
      },
      {
        id: "hl-2",
        sectionIndex: 0,
        targetId: "passage",
        start: 0,
        end: 3,
        text: "txt",
        createdAt: 1,
      },
    ])

    const shortened: CandidateSection = {
      ...readingSection,
      questionGroups: [
        {
          ...readingSection.questionGroups![0],
          questions: [{ id: "q1", questionNumber: 1, prompt: "One" }],
        },
      ],
    }
    const summary = useExamSessionStore
      .getState()
      .applyExamUpdate(makeExam([shortened]), 2)

    const s = useExamSessionStore.getState()
    expect(summary.removedQuestions).toBe(1)
    expect(s.answers.q1?.value).toBe("one")
    expect(s.answers.q2).toBeUndefined()
    expect(s.flagged.q2).toBeUndefined()
    expect(s.highlights.map((h) => h.id)).toEqual(["hl-2"])
  })

  it("reports and moves away from a removed active question", () => {
    useExamSessionStore.getState().init("attempt-1", makeExam([readingSection]), 300, 1)
    useExamSessionStore.getState().setActiveQuestion("q2")

    const shortened: CandidateSection = {
      ...readingSection,
      questionGroups: [
        {
          ...readingSection.questionGroups![0],
          questions: [{ id: "q1", questionNumber: 1, prompt: "One" }],
        },
      ],
    }
    const summary = useExamSessionStore
      .getState()
      .applyExamUpdate(makeExam([shortened]), 2)

    expect(summary.activeQuestionRemoved).toBe(true)
    expect(useExamSessionStore.getState().activeQuestionId).toBe("q1")
  })

  it("clamps the active section when sections are removed", () => {
    useExamSessionStore
      .getState()
      .init("attempt-1", makeExam([readingSection, legacySection]), 300, 1)
    useExamSessionStore.getState().setActiveSectionIndex(1)

    const summary = useExamSessionStore
      .getState()
      .applyExamUpdate(makeExam([readingSection]), 2)

    expect(summary.sectionsChanged).toBe(true)
    expect(useExamSessionStore.getState().activeSectionIndex).toBe(0)
  })
})
