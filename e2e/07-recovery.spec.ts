import { test, expect } from "@playwright/test"
import { apiFetch, disableFullscreenGate } from "./helpers"
import { createScenario } from "./support/scenario"
import {
  fillTextAnswer,
  openAs,
  readTextAnswers,
  readTimerSeconds,
  startAttemptFromLobby,
  waitForExamEngine,
} from "./support/exam"

/**
 * Flow 7 (frontend-spec §12.2) — Recovery.
 * Trả lời 5 câu → F5 → đáp án còn nguyên, đồng hồ lệch ≤ 2s, dữ liệu vẫn đồng bộ.
 */
test.describe("Flow 7 — Recovery sau F5", () => {
  test("F5 giữ nguyên 5 đáp án và đồng hồ ±2s", async ({ page, request }) => {
    const answers = ["ans-1", "ans-2", "ans-3", "ans-4", "ans-5"]

    const scenario = await createScenario(request, {
      titlePrefix: "E2E Recovery",
      sections: [
        {
          skill: "listening",
          part: 1,
          title: "Listening Part 1",
          questions: answers.map((answer, index) => ({
            skill: "listening" as const,
            type: "form_completion",
            part: 1,
            prompt: `Recovery question ${index + 1}`,
            acceptedAnswers: [answer],
          })),
        },
      ],
    })

    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")
    const attemptId = await startAttemptFromLobby(page, scenario.assignmentId)

    // Trả lời 5 câu và chờ autosave xác nhận.
    for (let i = 0; i < answers.length; i++) {
      await fillTextAnswer(page, i, answers[i])
    }
    await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({ timeout: 20_000 })

    // Ghi lại đồng hồ + thời điểm trước khi F5.
    const timerBefore = await readTimerSeconds(page)
    const wallBefore = Date.now()

    await page.reload()
    await waitForExamEngine(page)

    const timerAfter = await readTimerSeconds(page)
    const wallAfter = Date.now()

    // 1) Toàn bộ 5 đáp án còn nguyên.
    expect(await readTextAnswers(page)).toEqual(answers)

    // 2) Đồng hồ tiếp tục đúng trong sai số ±2s so với thời gian thực đã trôi.
    const elapsedSeconds = (wallAfter - wallBefore) / 1000
    const timerDelta = timerBefore - timerAfter
    expect(
      Math.abs(timerDelta - elapsedSeconds),
      `timer lệch quá 2s (trước=${timerBefore}, sau=${timerAfter}, trôi=${elapsedSeconds.toFixed(2)}s)`
    ).toBeLessThanOrEqual(2)

    // 3) Đáp án vẫn đồng bộ lên server sau khi khôi phục.
    await expect
      .poll(
        async () => {
          const res = await apiFetch(page, "GET", `/api/attempts/${attemptId}`)
          const json = await res.json()
          const values = (json?.data?.answers ?? []).map((a: { value: string }) => a.value)
          return values.sort()
        },
        { timeout: 15_000 }
      )
      .toEqual([...answers].sort())
  })
})
