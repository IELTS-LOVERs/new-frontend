import { test, expect } from "@playwright/test"
import { disableFullscreenGate } from "./helpers"
import { createScenario } from "./support/scenario"
import {
  fillTextAnswer,
  openAs,
  startAttemptFromLobby,
  submitAttempt,
} from "./support/exam"

/**
 * Flow 3 (frontend-spec §12.2) — Listening.
 * HS vào lobby, tick đồng ý quy chế, bắt đầu làm bài, trả lời câu Listening,
 * chờ autosave "Đã lưu" rồi nộp bài → trang /exam/<id>/submitted.
 */
test.describe("Flow 3 — Listening", () => {
  test("lobby → trả lời → autosave Đã lưu → nộp bài", async ({ page, request }) => {
    const scenario = await createScenario(request, {
      titlePrefix: "E2E Listening",
      sections: [
        {
          skill: "listening",
          part: 1,
          title: "Listening Part 1",
          instructions: "Answer questions 1-2.",
          questions: [
            {
              skill: "listening",
              type: "form_completion",
              part: 1,
              prompt: "The city is",
              acceptedAnswers: ["london"],
            },
            {
              skill: "listening",
              type: "multiple_choice",
              part: 1,
              prompt: "What time does the tour start?",
              data: {
                options: [
                  { id: "A", text: "9:00" },
                  { id: "B", text: "10:30" },
                  { id: "C", text: "14:00" },
                ],
              },
              acceptedAnswers: ["B"],
            },
          ],
        },
      ],
    })

    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")

    // Lobby: tick đồng ý quy chế rồi bắt đầu.
    const attemptId = await startAttemptFromLobby(page, scenario.assignmentId)

    // Trả lời câu 1 (text) → chờ autosave "Đã lưu".
    await fillTextAnswer(page, 0, "london")
    await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({ timeout: 20_000 })

    // Trả lời câu 2 (multiple choice).
    await page.getByText("10:30", { exact: true }).click()

    // Nộp bài.
    await submitAttempt(page)

    await expect(page.getByRole("heading", { name: /Bạn đã nộp bài thành công/ })).toBeVisible()
    expect(page.url()).toContain(`/exam/${attemptId}/submitted`)
  })
})
