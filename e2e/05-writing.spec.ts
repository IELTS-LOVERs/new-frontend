import { test, expect } from "@playwright/test"
import { apiFetch, disableFullscreenGate } from "./helpers"
import { createScenario } from "./support/scenario"
import { dispatchPaste, openAs, startAttemptFromLobby } from "./support/exam"

/**
 * Flow 5 (frontend-spec §12.2) — Writing.
 * Đếm từ cập nhật đúng khi gõ; thao tác dán bị chặn và được ghi nhận thành
 * sự kiện PASTE; autosave hoạt động.
 */
test.describe("Flow 5 — Writing editor", () => {
  test("đếm từ, chặn paste & ghi event, autosave", async ({ page, request }) => {
    const scenario = await createScenario(request, {
      titlePrefix: "E2E Writing",
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

    await disableFullscreenGate(page)
    await openAs(page, scenario.student, "/student")
    const attemptId = await startAttemptFromLobby(page, scenario.assignmentId)

    const editor = page.getByPlaceholder(/Bắt đầu gõ bài viết/)
    await expect(editor).toBeVisible()

    // Đếm từ cập nhật theo nội dung gõ.
    await editor.fill("Hello world")
    await expect(page.getByText("2 words", { exact: true })).toBeVisible()
    await editor.fill("Hello world this is a test")
    await expect(page.getByText("6 words", { exact: true })).toBeVisible()

    // Dán nội dung → bị chặn (giá trị không đổi).
    const before = await editor.inputValue()
    await dispatchPaste(page, "textarea", "INJECTED PASTE TEXT")
    await expect(editor).toHaveValue(before)
    await expect(page.getByText("6 words", { exact: true })).toBeVisible()

    // Autosave báo "Đã lưu".
    await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({ timeout: 20_000 })

    // Sự kiện PASTE được ghi vào nhật ký anti-cheat.
    await expect
      .poll(
        async () => {
          const res = await apiFetch(page, "GET", `/api/attempts/${attemptId}/events`)
          const json = await res.json()
          return json?.data?.summary?.paste ?? 0
        },
        { timeout: 15_000, message: "Chờ sự kiện PASTE được ghi nhận" }
      )
      .toBeGreaterThanOrEqual(1)
  })
})
