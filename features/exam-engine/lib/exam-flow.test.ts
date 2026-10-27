import { describe, expect, it } from "vitest"
import type {
  CandidateExam,
  CandidateQuestionGroup,
  CandidateQuestionItem,
  CandidateSection,
} from "@/lib/api/types"
import {
  COMPLETION_GROUP_TYPES,
  INLINE_TOKEN_SPLIT,
  buildExamQuestionIndex,
  computeAnsweredCount,
  computeSectionReviews,
  countWords,
  findWritingQuestion,
  flattenSectionQuestions,
  formatQuestionRange,
  getGroupViewMeta,
  isAnswered,
  parseInlineToken,
  resolveInlineBlankQuestion,
} from "./exam-flow"

// ─── Fixtures ────────────────────────────────────────────────────────────────

function item(overrides: Partial<CandidateQuestionItem> = {}): CandidateQuestionItem {
  return {
    id: "q1",
    questionNumber: 1,
    prompt: "Write the answer.",
    ...overrides,
  }
}

function group(overrides: Partial<CandidateQuestionGroup> = {}): CandidateQuestionGroup {
  return {
    id: "g1",
    groupType: "form_completion",
    instructions: "Complete the notes.",
    config: {},
    questions: [item()],
    ...overrides,
  }
}

function section(overrides: Partial<CandidateSection> = {}): CandidateSection {
  return {
    skill: "reading",
    part: 1,
    title: "Section 1",
    questionGroups: [group()],
    ...overrides,
  }
}

describe("countWords", () => {
  it("đếm từ theo khoảng trắng và bỏ khoảng trắng thừa", () => {
    expect(countWords("The quick brown fox")).toBe(4)
    expect(countWords("  leading and trailing  ")).toBe(3)
    expect(countWords("line\nbreak\tused")).toBe(3)
  })

  it("trả về 0 cho chuỗi rỗng hoặc chỉ có khoảng trắng", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   \n\t ")).toBe(0)
  })
})

describe("flattenSectionQuestions", () => {
  it("làm phẳng toàn bộ question groups thành danh sách tuyến tính", () => {
    const flat = flattenSectionQuestions(
      section({
        questionGroups: [
          group({ id: "g1", groupType: "form_completion", questions: [item({ id: "q1", questionNumber: 1 })] }),
          group({
            id: "g2",
            groupType: "multiple_choice_single",
            questions: [item({ id: "q2", questionNumber: 2 }), item({ id: "q3", questionNumber: 3 })],
          }),
        ],
      })
    )

    expect(flat.map((q) => q.id)).toEqual(["q1", "q2", "q3"])
    expect(flat[1]).toMatchObject({ type: "multiple_choice_single", questionNumber: 2 })
  })

  it("gắn type/data từ group và trả về [] khi section không có nhóm câu", () => {
    expect(flattenSectionQuestions(section({ questionGroups: undefined }))).toEqual([])

    const flat = flattenSectionQuestions(
      section({ questionGroups: [group({ groupType: "note_completion", config: { maxWords: 2 } })] })
    )
    expect(flat[0].type).toBe("note_completion")
    expect(flat[0].data).toEqual({ maxWords: 2 })
  })
})

describe("buildExamQuestionIndex", () => {
  it("gắn sectionIndex cho mọi câu hỏi theo đúng phần", () => {
    const exam: CandidateExam = {
      id: "exam-1",
      title: "Mock",
      durationMinutes: 60,
      sections: [
        section({ skill: "listening", part: 1, questionGroups: [group({ questions: [item({ id: "l1" }), item({ id: "l2" })] })] }),
        section({ skill: "reading", part: 1, questionGroups: [group({ questions: [item({ id: "r1" })] })] }),
      ],
    }

    const index = buildExamQuestionIndex(exam)

    expect(index.map((q) => q.id)).toEqual(["l1", "l2", "r1"])
    expect(index.map((q) => q.sectionIndex)).toEqual([0, 0, 1])
  })

  it("trả về [] khi đề không có câu hỏi", () => {
    const exam: CandidateExam = {
      id: "exam-empty",
      title: "Empty",
      durationMinutes: 30,
      sections: [section({ questionGroups: [] })],
    }
    expect(buildExamQuestionIndex(exam)).toEqual([])
  })
})

describe("formatQuestionRange", () => {
  it("hiển thị khoảng câu và dạng một câu", () => {
    expect(formatQuestionRange([item({ questionNumber: 1 }), item({ questionNumber: 2 })])).toBe(
      "Questions 1–2"
    )
    expect(formatQuestionRange([item({ questionNumber: 7 })])).toBe("Question 7")
  })

  it("dùng min/max khi thứ tự câu bị đảo và bỏ qua số không hợp lệ", () => {
    expect(
      formatQuestionRange([
        item({ questionNumber: 7 }),
        item({ questionNumber: 3 }),
        item({ questionNumber: undefined }),
      ])
    ).toBe("Questions 3–7")
    expect(formatQuestionRange([])).toBe("Questions")
  })
})

describe("findWritingQuestion", () => {
  const writingSection = section({
    skill: "writing",
    questionGroups: [
      group({
        id: "w1",
        groupType: "writing_task_1",
        instructions: "Report the chart.",
        questions: [item({ id: "t1", prompt: "Task 1 prompt", media: [{ id: "m1", url: "/a.png", type: "image" }] })],
      }),
      group({
        id: "w2",
        groupType: "writing_task_2",
        instructions: "Write an essay.",
        questions: [item({ id: "t2", prompt: "Task 2 prompt" })],
      }),
    ],
  })

  it("tìm đúng task 1 và task 2", () => {
    expect(findWritingQuestion(writingSection, "writing_task_1")).toMatchObject({
      id: "t1",
      prompt: "Task 1 prompt",
      content: "Report the chart.",
    })
    expect(findWritingQuestion(writingSection, "writing_task_2")?.id).toBe("t2")
  })

  it("trả về media của câu hỏi (dùng để render ảnh task 1)", () => {
    const view = findWritingQuestion(writingSection, "writing_task_1")
    expect(view?.media).toEqual([{ id: "m1", url: "/a.png", type: "image" }])
  })

  it("gộp ảnh của group (config.imageMediaId) lên trước media câu hỏi", () => {
    const withGroupImage = section({
      skill: "writing",
      questionGroups: [
        group({
          id: "w1",
          groupType: "writing_task_1",
          media: [{ id: "g-img", url: "/chart.png", type: "image" }],
          questions: [item({ id: "t1" })],
        }),
      ],
    })

    const view = findWritingQuestion(withGroupImage, "writing_task_1")
    expect(view?.media).toEqual([{ id: "g-img", url: "/chart.png", type: "image" }])
  })

  it("trả về undefined khi section thiếu task", () => {
    expect(findWritingQuestion(section({ skill: "writing", questionGroups: [] }), "writing_task_1")).toBeUndefined()
  })

  it("content là undefined khi group không có instructions", () => {
    const noInstr = section({
      skill: "writing",
      questionGroups: [group({ groupType: "writing_task_1", instructions: "", questions: [item({ id: "t1" })] })],
    })
    expect(findWritingQuestion(noInstr, "writing_task_1")?.content).toBeUndefined()
  })
})

describe("parseInlineToken", () => {
  it("nhận diện token [X] và {{qX}} ở nhiều biến thể", () => {
    expect(parseInlineToken("[1]")).toBe(1)
    expect(parseInlineToken("[ 12 ]")).toBe(12)
    expect(parseInlineToken("{{3}}")).toBe(3)
    expect(parseInlineToken("{{q7}}")).toBe(7)
    expect(parseInlineToken("{{ 10 }}")).toBe(10)
  })

  it("trả về null cho văn bản thường và các chuỗi gần giống", () => {
    expect(parseInlineToken("plain text")).toBeNull()
    expect(parseInlineToken("1")).toBeNull()
    expect(parseInlineToken("[abc]")).toBeNull()
    expect(parseInlineToken("")).toBeNull()
  })

  it("INLINE_TOKEN_SPLIT tách nguyên token, không lộ chữ số", () => {
    const parts = "Cost is [1] dollars and {{q2}} items".split(INLINE_TOKEN_SPLIT)
    expect(parts).toEqual(["Cost is ", "[1]", " dollars and ", "{{q2}}", " items"])
  })
})

describe("resolveInlineBlankQuestion", () => {
  const questions = [
    item({ id: "a", questionNumber: 5 }),
    item({ id: "b", questionNumber: 6 }),
  ]

  it("ưu tiên khớp đúng questionNumber", () => {
    expect(resolveInlineBlankQuestion(questions, 6)?.id).toBe("b")
  })

  it("fallback theo vị trí khi không khớp số", () => {
    expect(resolveInlineBlankQuestion(questions, 1)?.id).toBe("a")
  })

  it("trả về undefined khi số vượt quá danh sách", () => {
    expect(resolveInlineBlankQuestion(questions, 99)).toBeUndefined()
  })
})

describe("getGroupViewMeta", () => {
  it("nhận diện true/false/not-given và yes/no/not-given", () => {
    expect(getGroupViewMeta(group({ groupType: "true_false_not_given" })).isTFNG).toBe(true)
    expect(getGroupViewMeta(group({ groupType: "yes_no_not_given" })).isYNNG).toBe(true)
    expect(getGroupViewMeta(group({ groupType: "multiple_choice_single" })).isMatching).toBe(false)
  })

  it("đánh dấu isMatching cho mọi groupType matching_*", () => {
    for (const type of ["matching_headings", "matching_information", "matching_features", "matching_sentence_endings"] as const) {
      expect(getGroupViewMeta(group({ groupType: type })).isMatching).toBe(true)
    }
  })

  it("chỉ coi các group completion/short_answer là isCompletion", () => {
    for (const type of COMPLETION_GROUP_TYPES) {
      expect(getGroupViewMeta(group({ groupType: type })).isCompletion).toBe(true)
    }
    expect(getGroupViewMeta(group({ groupType: "multiple_choice_single" })).isCompletion).toBe(false)
    expect(getGroupViewMeta(group({ groupType: "matching_features" })).isCompletion).toBe(false)
  })

  it("sinh wordLimitText đúng số ít/số nhiều", () => {
    expect(getGroupViewMeta(group({ config: { maxWords: 1 } })).wordLimitText).toBe("NO MORE THAN 1 WORD")
    expect(getGroupViewMeta(group({ config: { maxWords: 3 } })).wordLimitText).toBe("NO MORE THAN 3 WORDS")
    expect(getGroupViewMeta(group({ config: {} })).wordLimitText).toBeUndefined()
  })

  it("xây matchPool theo từng groupType matching", () => {
    expect(
      getGroupViewMeta(group({ groupType: "matching_headings", config: { headingsPool: [{ id: "i", text: "Heading" }] } })).matchPool
    ).toEqual([{ id: "i", text: "Heading" }])

    expect(
      getGroupViewMeta(group({ groupType: "matching_information", config: { paragraphLabels: ["A", "B"] } })).matchPool
    ).toEqual([
      { id: "A", text: "A" },
      { id: "B", text: "B" },
    ])

    expect(
      getGroupViewMeta(group({ groupType: "matching_features", config: { featuresPool: [{ id: "A", text: "Alpha" }] } })).matchPool
    ).toEqual([{ id: "A", text: "Alpha" }])

    expect(
      getGroupViewMeta(group({ groupType: "matching_sentence_endings", config: { endingsPool: [{ id: "B", text: "Beta" }] } })).matchPool
    ).toEqual([{ id: "B", text: "Beta" }])

    expect(getGroupViewMeta(group({ groupType: "multiple_choice_single" })).matchPool).toEqual([])
  })

  it("chuyển tiếp options/optionsPool/labelsPool từ config", () => {
    const meta = getGroupViewMeta(
      group({
        config: {
          options: [{ id: "A", text: "Alpha" }],
          optionsPool: [{ id: "W1", text: "Word" }],
          labels: [{ id: "L1", label: "Label" }],
        },
      })
    )
    expect(meta.options).toEqual([{ id: "A", text: "Alpha" }])
    expect(meta.optionsPool).toEqual([{ id: "W1", text: "Word" }])
    expect(meta.labelsPool).toEqual([{ id: "L1", label: "Label" }])
  })
})

describe("isAnswered / computeAnsweredCount", () => {
  it("chỉ tính câu trả lời có nội dung sau khi trim", () => {
    expect(isAnswered("answer")).toBe(true)
    expect(isAnswered("   ")).toBe(false)
    expect(isAnswered("")).toBe(false)
    expect(isAnswered(undefined)).toBe(false)
  })

  it("đếm số câu đã trả lời", () => {
    expect(
      computeAnsweredCount({
        q1: { value: "A", updatedAt: 0, dirty: false },
        q2: { value: "  ", updatedAt: 0, dirty: true },
        q3: { value: "", updatedAt: 0, dirty: true },
        q4: { value: "D", updatedAt: 0, dirty: true },
      })
    ).toBe(2)
  })
})

describe("computeSectionReviews", () => {
  const exam: CandidateExam = {
    id: "exam-1",
    title: "Full test",
    durationMinutes: 90,
    sections: [
      section({
        skill: "listening",
        part: 1,
        questionGroups: [group({ questions: [item({ id: "l1", questionNumber: 1 }), item({ id: "l2", questionNumber: 2 })] })],
      }),
      section({
        skill: "writing",
        part: 1,
        questionGroups: [
          group({
            groupType: "writing_task_1",
            questions: [item({ id: "w1", questionNumber: 1, prompt: "Task 1" })],
          }),
          group({
            groupType: "writing_task_2",
            questions: [item({ id: "w2", questionNumber: 2, prompt: "Task 2" })],
          }),
        ],
      }),
    ],
  }

  it("tổng hợp tiến độ, cờ đánh dấu và số từ cho từng phần", () => {
    const reviews = computeSectionReviews(
      exam,
      {
        l1: { value: "cat", updatedAt: 0, dirty: false },
        w1: { value: "one two three four", updatedAt: 0, dirty: true },
        w2: { value: "  ", updatedAt: 0, dirty: true },
      },
      { l2: true }
    )

    expect(reviews).toHaveLength(2)

    const [listening, writing] = reviews
    expect(listening.isWriting).toBe(false)
    expect(listening.total).toBe(2)
    expect(listening.answered).toBe(1)
    expect(listening.flaggedCount).toBe(1)

    expect(writing.isWriting).toBe(true)
    expect(writing.total).toBe(2)
    expect(writing.answered).toBe(1)
    expect(writing.wordCounts).toEqual([4, 0])
  })

  it("user flow: học sinh mở dialog nộp sau khi làm 1 phần", () => {
    const reviews = computeSectionReviews(exam, { l1: { value: "cat", updatedAt: 0, dirty: false } }, {})
    const answeredTotal = reviews.reduce((sum, r) => sum + r.answered, 0)
    const total = reviews.reduce((sum, r) => sum + r.total, 0)

    expect(answeredTotal).toBe(1)
    expect(total).toBe(4)
  })
})
