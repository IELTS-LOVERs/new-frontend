import { test, expect } from "@playwright/test"
import type { APIRequestContext, BrowserContext } from "@playwright/test"
import { disableFullscreenGate } from "./helpers"
import { createScenario, type Scenario } from "./support/scenario"
import { openAs, startAttemptFromLobby, submitAttempt } from "./support/exam"

/**
 * Flow 6 (frontend-spec §12.2) — Chấm Writing.
 *
 * GV mở Writing Review Studio cho bài Writing đã nộp, chọn band + nhận xét và
 * lưu. HS thấy band đã chấm ở trang "đã nộp".
 *
 * ⚠️ DEFECT đã phát hiện: trang chi tiết kết quả `/student/results/<attemptId>`
 * crash khi render (`Cannot read properties of undefined (reading 'push')`), nên
 * phần "HS thấy nhận xét chi tiết" được đánh dấu fixme (xem test thứ hai).
 */

async function setupSubmittedWriting(
  context: BrowserContext,
  request: APIRequestContext
): Promise<{ scenario: Scenario; attemptId: string; studentPage: Awaited<ReturnType<BrowserContext["newPage"]>> }> {
  const scenario = await createScenario(request, {
    titlePrefix: "E2E Grading",
    sections: [
      {
        skill: "writing",
        part: 1,
        title: "Writing Task 1",
        instructions: "Write at least 150 words.",
        questions: [
          {
            skill: "writing",
            type: "writing_task_1",
            part: 1,
            prompt: "The chart shows the number of international students in three countries.",
            acceptedAnswers: [],
          },
        ],
      },
    ],
  })

  const studentPage = await context.newPage()
  await disableFullscreenGate(studentPage)
  await openAs(studentPage, scenario.student, "/student")
  const attemptId = await startAttemptFromLobby(studentPage, scenario.assignmentId)
  await studentPage
    .getByPlaceholder(/Bắt đầu gõ bài viết/)
    .fill(
      "The chart illustrates the number of international students in three countries. " +
        "Overall, the figures increased steadily over the period."
    )
  await submitAttempt(studentPage)
  await expect(studentPage.getByRole("heading", { name: /Bạn đã nộp bài thành công/ })).toBeVisible()

  return { scenario, attemptId, studentPage }
}

async function gradeViaStudio(
  context: BrowserContext,
  scenario: Scenario,
  attemptId: string
): Promise<void> {
  const teacherPage = await context.newPage()
  await openAs(teacherPage, scenario.teacher, "/teacher")
  await teacherPage.goto(`/teacher/grading/${attemptId}`)
  await expect(teacherPage.getByRole("heading", { name: "Writing Review Studio" })).toBeVisible({
    timeout: 20_000,
  })

  // Chọn band Task 1 = 6.5 (grid Task 1 nằm trước grid Task 2 trong DOM).
  await teacherPage.getByRole("button", { name: "6.5", exact: true }).first().click()
  await teacherPage.getByPlaceholder(/Task Achievement/).fill("Nhận xét Task 1 E2E: bố cục rõ ràng.")
  await teacherPage
    .getByPlaceholder(/Lời nhắn động viên/)
    .fill("Nhận xét tổng quan E2E: tiếp tục phát huy.")

  await teacherPage.getByRole("button", { name: /Hoàn tất & Lưu đánh giá/ }).click()
  const confirm = teacherPage.getByRole("dialog")
  await expect(confirm.getByText("Xác nhận lưu điểm?")).toBeVisible()
  await confirm.getByRole("button", { name: "Xác nhận lưu điểm" }).click()
  await expect(teacherPage.getByText(/Đã lưu điểm cho/)).toBeVisible({ timeout: 20_000 })
}

test.describe("Flow 6 — Chấm Writing", () => {
  test("GV lưu band → HS thấy bài đã được chấm điểm", async ({ context, request }) => {
    const { scenario, attemptId, studentPage } = await setupSubmittedWriting(context, request)
    await gradeViaStudio(context, scenario, attemptId)

    // HS thấy điểm Writing đã chấm ở trang "đã nộp".
    await studentPage.goto(`/exam/${attemptId}/submitted`)
    await expect(
      studentPage.getByRole("heading", { name: /Bạn đã nộp bài thành công/ })
    ).toBeVisible({ timeout: 20_000 })
    await expect(studentPage.getByText(/Bài Writing đã được chấm/)).toBeVisible()
    // Band Writing = 6.5 cùng Overall = 6.5.
    await expect(studentPage.getByText("6.5").first()).toBeVisible()
  })

  /**
   * Regression test cho defect đã sửa: `buildCandidateExam` thiếu `skill` trên
   * từng câu hỏi khiến `rowsBySkill[q.skill]` undefined → crash trang kết quả.
   * Nay BE trả `skill` (fallback `section.skill`) và FE phòng vệ `q.skill ?? sec.skill`.
   */
  test(
    "HS thấy nhận xét chi tiết của GV ở trang kết quả",
    async ({ context, request }) => {
      const { scenario, attemptId, studentPage } = await setupSubmittedWriting(context, request)
      await gradeViaStudio(context, scenario, attemptId)

      await studentPage.goto(`/student/results/${attemptId}`)
      await expect(
        studentPage.getByText("Nhận xét & Đánh giá Writing từ Giáo viên")
      ).toBeVisible({ timeout: 20_000 })
      await expect(studentPage.getByText("Nhận xét Task 1 E2E: bố cục rõ ràng.")).toBeVisible()
      await expect(studentPage.getByText("Nhận xét tổng quan E2E: tiếp tục phát huy.")).toBeVisible()
      await expect(studentPage.getByText("Band 6.5", { exact: true })).toBeVisible()
    }
  )
})
