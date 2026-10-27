import { test, expect } from "@playwright/test"
import { disableFullscreenGate } from "./helpers"
import { apiGet, apiPatch, apiPost, loginViaApi, registerStudentViaApi } from "./support/api"
import { openAs, startAttemptFromLobby, submitAttempt } from "./support/exam"

/**
 * Flow 10 — Luyện tập Writing đầu-cuối (giáo viên chấm, không chấm tự động).
 *
 * 1. Giáo viên tạo bài luyện tập Writing (kind=practice) và xuất bản.
 * 2. Học sinh thấy bài trong tab Writing của /student/practice (badge Task),
 *    vào phòng chờ thấy "Số bài viết" + ghi chú giáo viên chấm, làm bài & nộp.
 * 3. Trang kết quả KHÔNG hiện 0/0 câu đúng mà hiện trạng thái "chờ giáo viên chấm".
 * 4. Bài nộp xuất hiện trong "Chờ chấm Writing"; giáo viên chấm; HS thấy điểm.
 *
 * Lưu ý: bài luyện tập được làm TỰ DO (không giao qua assignment — BE trả
 * PRACTICE_NOT_ASSIGNABLE), nên test bắt đầu bài từ phòng chờ của practice.
 */

const TEACHER = { email: "teacher@ielts.com", password: "Teacher@123" } as const

let seq = 0
function uniqueSuffix(): string {
  seq += 1
  return `e2e-writing-${Date.now().toString(36)}-${seq}`
}

/** Tạo bài luyện Writing đã xuất bản + một học sinh mới (chưa cần lớp). */
async function setupWritingPractice(request: Parameters<typeof apiGet>[0]) {
  const suffix = uniqueSuffix()
  const teacher = await loginViaApi(request, TEACHER.email, TEACHER.password)

  const exam = await apiPost(request, "/api/exams", teacher.token, {
    title: `E2E Writing Practice ${suffix}`,
    description: "Bài luyện Writing E2E (giáo viên chấm).",
    kind: "practice",
    durationMinutes: 40,
    sections: [
      {
        skill: "writing",
        part: 2,
        title: "Writing Task 2",
        instructions: "Write at least 250 words.",
        mediaIds: [],
        questionGroups: [
          {
            groupType: "writing_task_2",
            instructions: "Write at least 250 words.",
            config: { minWords: 250 },
            questions: [
              {
                questionNumber: 1,
                prompt: `E2E_WRITING_PROMPT ${suffix} Some people think technology isolates us. Discuss both views.`,
                acceptedAnswers: [],
                points: 1,
              },
            ],
          },
        ],
      },
    ],
  })
  await apiPatch(request, `/api/exams/${exam.id}/publish`, teacher.token)

  const student = await registerStudentViaApi(
    request,
    `${suffix}@e2e.test`,
    "Student@123",
    `E2E Writing Student ${suffix}`
  )

  return { teacher, student, examId: exam.id as string, examTitle: exam.title as string, suffix }
}

test.describe("Flow 10 — Luyện tập Writing (giáo viên chấm)", () => {
  test("HS vào tab Writing, làm & nộp; kết quả không hiện 0/0; GV chấm", async ({
    page,
    request,
  }) => {
    const scenario = await setupWritingPractice(request)

    // ── 1. Học sinh thấy bài trong tab Writing ───────────────────────────
    await openAs(page, scenario.student, "/student/practice")
    await page.getByRole("button", { name: "Writing", exact: true }).first().click()

    const card = page.getByText(scenario.examTitle, { exact: false }).first()
    await expect(card).toBeVisible({ timeout: 30_000 })
    // Badge Task 2 thay vì Part/Passage.
    await expect(page.getByText("Task 2", { exact: true }).first()).toBeVisible()

    // ── 2. Phòng chờ: hiện đúng kỹ năng + số bài viết + ghi chú chấm ────
    await page.goto(`/exam/start/practice/${scenario.examId}`)
    await expect(page.getByText("Writing", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Số bài viết")).toBeVisible()
    await expect(page.getByText(/được giáo viên chấm/i)).toBeVisible()

    await page.getByRole("button", { name: "Bắt đầu luyện tập" }).click()
    await page.waitForURL(/\/exam\/[0-9a-f]{24}/, { timeout: 30_000 })
    const attemptId = page.url().match(/\/exam\/([0-9a-f]{24})/)![1]

    const editor = page.getByPlaceholder(/Bắt đầu gõ bài viết/)
    await expect(editor).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText(/E2E_WRITING_PROMPT/)).toBeVisible()
    await editor.fill(
      "Technology has changed the way people interact. " +
        "On the one hand, it connects distant families; on the other, it can isolate individuals."
    )
    await submitAttempt(page)
    await expect(
      page.getByRole("heading", { name: /Bạn đã (nộp bài thành công|hoàn thành bài luyện tập)/ })
    ).toBeVisible()
    // Bài luyện tập chỉ có Writing: không hiện 0/0 câu đúng, thay bằng "Số bài viết".
    await expect(page.getByText("Số bài viết")).toBeVisible()
    await expect(page.getByText("Số câu đúng")).toHaveCount(0)
    await expect(page.getByText(/Writing sẽ được giáo viên chấm/)).toBeVisible()

    // ── 3. Kết quả: không 0/0, hiện trạng thái chờ giáo viên chấm ────────
    await page.goto(`/student/results/${attemptId}`)
    await expect(page.getByText(/Bài Writing đang chờ giáo viên chấm/)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("SỐ CÂU ĐÚNG")).toHaveCount(0)
    await expect(page.getByText("0/0")).toHaveCount(0)
    await expect(page.getByText("Giáo viên chấm").first()).toBeVisible()

    // ── 4. Bài nộp nằm trong "Chờ chấm Writing" ───────────────────────────
    // Hàng đợi chấm là teacher-scoped → phải gọi bằng session giáo viên.
    const queue = await apiGet(request, "/api/grading/pending", scenario.teacher.token)
    const queued = (queue as unknown as Array<{ attemptId: string }>) ?? []
    expect(queued.map((item) => item.attemptId)).toContain(attemptId)

    // Giáo viên chấm qua Writing Review Studio (bài luyện chỉ có Task 2).
    await openAs(page, scenario.teacher, "/teacher/submissions")
    await page.goto(`/teacher/grading/${attemptId}`)
    await expect(page.getByRole("heading", { name: "Writing Review Studio" })).toBeVisible({
      timeout: 30_000,
    })
    // Nút band hiển thị dạng "7.0"/"8.5" (BAND_OPTIONS), không phải "7".
    // Task 1 đứng trước Task 2 → band 7.0 của Task 2 là nút "7.0" cuối cùng.
    const bandSeven = page.getByRole("button", { name: "7.0", exact: true })
    await expect(bandSeven).toHaveCount(2)
    await bandSeven.last().click()
    await page.getByPlaceholder(/Task Response, Cohesion/).fill("Nhận xét Task 2 E2E.")
    await page.getByRole("button", { name: /Hoàn tất & Lưu đánh giá/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Xác nhận lưu điểm?")).toBeVisible()
    await dialog.getByRole("button", { name: "Xác nhận lưu điểm" }).click()
    await expect(page.getByText(/Đã lưu điểm cho/)).toBeVisible({ timeout: 20_000 })

    // ── 5. HS thấy điểm đã chấm ───────────────────────────────────────────
    await openAs(page, scenario.student, `/student/results/${attemptId}`)
    await expect(page.getByText(/Bài Writing đã được giáo viên chấm/)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Nhận xét Task 2 E2E.")).toBeVisible()
  })

  test("catalog Writing chỉ trả bài Writing và chứa bài vừa xuất bản", async ({ request }) => {
    const scenario = await setupWritingPractice(request)

    const catalog = await apiGet(
      request,
      "/api/practice/catalog?skill=writing",
      scenario.student.token
    )
    const items = catalog.items as Array<{ title: string; skills: string[] }>

    expect(items.length).toBeGreaterThan(0)
    // Mọi bài trả về cho tab Writing phải thực sự có skill writing.
    for (const item of items) expect(item.skills).toContain("writing")
    expect(items.some((i) => i.title === scenario.examTitle)).toBe(true)
  })
})
