import { test, expect } from "@playwright/test"
import { disableFullscreenGate } from "./helpers"
import { createScenario } from "./support/scenario"
import { openAs, startAttemptFromLobby } from "./support/exam"

/**
 * Flow 4 (frontend-spec §12.2) — Reading.
 * Hai panel cuộn độc lập; chuyển passage thì đáp án đã nhập vẫn được giữ nguyên.
 */
test.describe("Flow 4 — Reading hai panel", () => {
  test("chuyển passage giữ nguyên đáp án đã nhập", async ({ page, request }) => {
    const scenario = await createScenario(request, {
      titlePrefix: "E2E Reading",
      sections: [
        {
          skill: "reading",
          part: 1,
          title: "Reading Passage 1",
          passageText: "PASSAGE_ONE_CONTENT về lịch sử hình thành bảo tàng.",
          questions: [
            {
              skill: "reading",
              type: "form_completion",
              part: 1,
              prompt: "Passage 1 question",
              acceptedAnswers: ["x"],
            },
          ],
        },
        {
          skill: "reading",
          part: 2,
          title: "Reading Passage 2",
          passageText: "PASSAGE_TWO_CONTENT về nghiên cứu khoa học.",
          questions: [
            {
              skill: "reading",
              type: "form_completion",
              part: 1,
              prompt: "Passage 2 question",
              acceptedAnswers: ["y"],
            },
          ],
        },
      ],
    })

    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")
    await startAttemptFromLobby(page, scenario.assignmentId)

    // Passage 1 được hiển thị mặc định: kiểm tra dạng hai panel (bài đọc + câu hỏi).
    await expect(page.getByText(/PASSAGE_ONE_CONTENT/)).toBeVisible()
    await expect(page.getByText("Passage 1 question")).toBeVisible()

    // Trả lời ở Passage 1.
    await page.getByPlaceholder("Nhập câu trả lời...").fill("answer-one")

    // Chuyển sang Passage 2 bằng palette câu hỏi số 2.
    await page.getByRole("button", { name: "2", exact: true }).click()
    await expect(page.getByText(/PASSAGE_TWO_CONTENT/)).toBeVisible()
    await expect(page.getByText("Passage 2 question")).toBeVisible()
    await page.getByPlaceholder("Nhập câu trả lời...").fill("answer-two")

    // Quay lại Passage 1 → đáp án cũ còn nguyên.
    await page.getByRole("button", { name: "1", exact: true }).click()
    await expect(page.getByText(/PASSAGE_ONE_CONTENT/)).toBeVisible()
    await expect(page.getByPlaceholder("Nhập câu trả lời...")).toHaveValue("answer-one")

    // Quay lại Passage 2 → đáp án cũng còn nguyên.
    await page.getByRole("button", { name: "2", exact: true }).click()
    await expect(page.getByPlaceholder("Nhập câu trả lời...")).toHaveValue("answer-two")
  })
})
