import { test, expect } from "@playwright/test"
import { apiFetch, disableFullscreenGate } from "./helpers"
import { apiGet, apiPatch, apiPut, type ApiSession } from "./support/api"
import { createScenario, type Scenario } from "./support/scenario"
import { fillTextAnswer, openAs, startAttemptFromLobby, submitAttempt } from "./support/exam"

/**
 * Flow 9 — Giáo viên sửa đề đã xuất bản khi học sinh đang làm bài.
 *
 * Kỳ vọng:
 *  - Đề published vẫn ở trạng thái published sau khi sửa, và API không chặn giáo viên.
 *  - Học sinh đang trong phòng thi nhận nội dung mới (không phải tự nộp bài),
 *    đáp án đã nhập và đồng hồ được giữ nguyên, kèm banner thông báo.
 *  - Đề đã đóng (closed) vẫn sửa được; kết quả đã chấm giữ nguyên (snapshot).
 */

interface ExamSections {
  sections: Array<{
    id: string
    skill: string
    part: number
    title: string
    instructions?: string
    passageText?: string
    mediaIds?: string[]
    questionGroups: Array<{
      id: string
      groupType: string
      instructions?: string
      config?: Record<string, unknown>
      questions: Array<{
        id: string
        questionNumber: number
        prompt: string
        acceptedAnswers: string[]
        points: number
      }>
    }>
  }>
}

export type { ExamSections }

/** Marker of a question created by `readingScenario` (the first one). */
const FIRST_QUESTION_MARKERS = ["LIVE_EDIT_QUESTION_OLD", "LIVE_EDIT_QUESTION_FRESH"]

/**
 * Đọc đề hiện tại rồi thay nội dung câu hỏi đầu tiên (giữ nguyên cấu trúc).
 *
 * QUAN TRỌNG: phải gửi lại `_id` của section/group/question (API trả về ở
 * trường `id`, còn payload dùng `_id` — đúng như editor map ở
 * `toUpdatePayload`). Nếu bỏ `_id`, BE sinh id mới cho câu hỏi và hệ thống sẽ
 * coi đó là "xoá câu cũ + thêm câu mới" (đáp án của HS bị bỏ, đúng thiết kế).
 */
async function editFirstQuestionPrompt(
  request: Parameters<typeof apiGet>[0],
  teacher: ApiSession,
  examId: string,
  newPrompt: string
): Promise<void> {
  const detail = (await apiGet(request, `/api/exams/${examId}`, teacher.token)) as ExamSections
  const sections = detail.sections.map((section) => ({
    _id: section.id,
    skill: section.skill,
    part: section.part,
    title: section.title,
    instructions: section.instructions ?? "",
    passageText: section.passageText ?? "",
    mediaIds: section.mediaIds ?? [],
    questionGroups: section.questionGroups.map((group) => ({
      _id: group.id,
      groupType: group.groupType,
      instructions: group.instructions ?? "",
      config: group.config ?? {},
      questions: group.questions.map((q) => ({
        _id: q.id,
        questionNumber: q.questionNumber,
        prompt: FIRST_QUESTION_MARKERS.some((m) => q.prompt.startsWith(m))
          ? newPrompt
          : q.prompt,
        acceptedAnswers: q.acceptedAnswers ?? [],
        points: q.points ?? 1,
      })),
    })),
  }))

  await apiPut(request, `/api/exams/${examId}`, teacher.token, { sections })
}

async function getExamStatus(
  request: Parameters<typeof apiGet>[0],
  teacher: ApiSession,
  examId: string
): Promise<{ status: string; contentRevision: number }> {
  const detail = await apiGet(request, `/api/exams/${examId}`, teacher.token)
  return { status: detail.status, contentRevision: detail.contentRevision }
}

function readingScenario(
  request: Parameters<typeof createScenario>[0],
  titlePrefix: string,
  firstPrompt = "LIVE_EDIT_QUESTION_OLD"
): Promise<Scenario> {
  return createScenario(request, {
    titlePrefix,
    sections: [
      {
        skill: "reading",
        part: 1,
        title: "Reading Passage 1",
        passageText: "LIVE_EDIT_PASSAGE gốc do giáo viên soạn.",
        questions: [
          {
            skill: "reading",
            type: "form_completion",
            part: 1,
            prompt: firstPrompt,
            acceptedAnswers: ["old"],
          },
        ],
      },
      {
        skill: "reading",
        part: 2,
        title: "Reading Passage 2",
        passageText: "LIVE_EDIT_PASSAGE_2.",
        questions: [
          {
            skill: "reading",
            type: "form_completion",
            part: 1,
            prompt: "LIVE_EDIT_QUESTION_2",
            acceptedAnswers: ["two"],
          },
        ],
      },
    ],
  })
}

test.describe("Flow 9 — Sửa đề khi học sinh đang làm", () => {
  test("sửa đề published → HS nhận nội dung mới, giữ đáp án & đồng hồ", async ({
    page,
    request,
  }) => {
    const scenario = await readingScenario(request, "E2E Live Edit")

    // Chỉ câu đầu tiên (của section 1) mang marker LIVE_EDIT_QUESTION_*; câu 2
    // luôn mang LIVE_EDIT_QUESTION_2 nên không cần điều kiện vị trí.
    expect(scenario.questionIds).toHaveLength(2)

    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")
    const attemptId = await startAttemptFromLobby(page, scenario.assignmentId)

    // Câu hỏi cũ hiển thị, HS trả lời câu 1.
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toBeVisible()
    await fillTextAnswer(page, 0, "câu trả lời trước khi sửa")
    await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({ timeout: 20_000 })

    // Giáo viên sửa đề ĐÃ XUẤT BẢN (không cần đưa về nháp).
    await editFirstQuestionPrompt(
      request,
      scenario.teacher,
      scenario.examId,
      "LIVE_EDIT_QUESTION_NEW"
    )

    const after = await getExamStatus(request, scenario.teacher, scenario.examId)
    expect(after.status).toBe("published")
    expect(after.contentRevision).toBeGreaterThanOrEqual(1)

    // HS nhận banner "Giáo viên vừa cập nhật đề" và nội dung mới (poll ~10s).
    // Banner + toast cùng câu chữ → chỉ assert trên thẻ <p> của banner.
    await expect(
      page.locator("p", { hasText: "Giáo viên vừa cập nhật đề lúc" }).first()
    ).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText("LIVE_EDIT_QUESTION_NEW")).toBeVisible()
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toHaveCount(0)

    // Đáp án đã nhập vẫn còn, HS vẫn đang trong phòng thi (không bị tự nộp).
    await expect(page.getByPlaceholder("Nhập câu trả lời...")).toHaveValue(
      "câu trả lời trước khi sửa"
    )
    await expect(page.getByRole("button", { name: "Nộp bài", exact: true })).toBeVisible()
    expect(page.url()).toContain(`/exam/${attemptId}`)

    // Kết quả nộp sau khi sửa: bài làm + prompt mới được giữ trong snapshot.
    await submitAttempt(page)
    await page.goto(`/student/results/${attemptId}`)
    await expect(page.getByText("LIVE_EDIT_QUESTION_NEW")).toHaveCount(1, { timeout: 20_000 })
    await expect(page.getByText("câu trả lời trước khi sửa")).toBeVisible()
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toHaveCount(0)
  })

  test("sửa đề đã đóng (closed) vẫn được; kết quả đã nộp giữ nguyên", async ({
    page,
    request,
  }) => {
    const scenario = await readingScenario(request, "E2E Live Edit Closed")

    // HS làm bài và nộp trước khi giáo viên sửa.
    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")
    const attemptId = await startAttemptFromLobby(page, scenario.assignmentId)
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toBeVisible()
    await fillTextAnswer(page, 0, "old")
    await submitAttempt(page)

    // Đóng đề.
    await apiPatch(request, `/api/exams/${scenario.examId}/close`, scenario.teacher.token)
    expect((await getExamStatus(request, scenario.teacher, scenario.examId)).status).toBe("closed")

    // Vẫn sửa được nội dung; trạng thái đóng được giữ.
    await editFirstQuestionPrompt(
      request,
      scenario.teacher,
      scenario.examId,
      "LIVE_EDIT_QUESTION_CLOSED"
    )
    const after = await getExamStatus(request, scenario.teacher, scenario.examId)
    expect(after.status).toBe("closed")
    expect(after.contentRevision).toBeGreaterThanOrEqual(1)

    // Kết quả đã nộp dùng snapshot → vẫn là nội dung cũ, không bị viết lại.
    const result = await apiFetch(page, "GET", `/api/attempts/${attemptId}/result`)
    const json = await result.json()
    const prompts = (json?.data?.details ?? []).map((d: { prompt?: string }) => d.prompt ?? "")
    expect(prompts.join(" ")).toContain("LIVE_EDIT_QUESTION_OLD")
    expect(prompts.join(" ")).not.toContain("LIVE_EDIT_QUESTION_CLOSED")

    // Trang kết quả của HS cũng không đổi.
    await page.goto(`/student/results/${attemptId}`)
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText("LIVE_EDIT_QUESTION_CLOSED")).toHaveCount(0)
  })

  test("chỉ đổi metadata (tiêu đề) không làm HS bị thông báo cập nhật", async ({
    page,
    request,
  }) => {
    const scenario = await readingScenario(request, "E2E Live Edit Meta")

    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")
    await startAttemptFromLobby(page, scenario.assignmentId)
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toBeVisible()

    const before = await getExamStatus(request, scenario.teacher, scenario.examId)
    await apiPut(request, `/api/exams/${scenario.examId}`, scenario.teacher.token, {
      title: `${scenario.examTitle} (đổi tên)`,
    })
    const after = await getExamStatus(request, scenario.teacher, scenario.examId)

    expect(after.contentRevision).toBe(before.contentRevision)
    expect(after.status).toBe("published")
    // Chờ quá 1 chu kỳ poll: nội dung không đổi nên không có banner.
    await page.waitForTimeout(15_000)
    await expect(
      page.locator("p", { hasText: "Giáo viên vừa cập nhật đề lúc" })
    ).toHaveCount(0)
    await expect(page.getByText("LIVE_EDIT_QUESTION_OLD")).toBeVisible()
  })
})
