import { test, expect } from "@playwright/test"
import { disableFullscreenGate } from "./helpers"
import { createScenario } from "./support/scenario"
import {
  installVisibilityProbe,
  openAs,
  startAttemptFromLobby,
  submitAttempt,
  triggerVisibilityChange,
} from "./support/exam"

/**
 * Flow 8 (frontend-spec §12.2) — Anti-cheat.
 * Chuyển tab → toast cảnh báo; vượt ngưỡng → GV thấy sự kiện ở nhật ký bài nộp
 * và ở tab "Cần kiểm tra".
 */
test.describe("Flow 8 — Anti-cheat", () => {
  test("đổi tab → toast cảnh báo; GV thấy sự kiện", async ({ page, context, request }) => {
    const scenario = await createScenario(request, {
      titlePrefix: "E2E AntiCheat",
      sections: [
        {
          skill: "listening",
          part: 1,
          title: "Listening Part 1",
          questions: [
            {
              skill: "listening",
              type: "form_completion",
              part: 1,
              prompt: "Anti-cheat question 1",
              acceptedAnswers: ["a"],
            },
          ],
        },
      ],
    })

    await disableFullscreenGate(page)
    await installVisibilityProbe(page)
    await openAs(page, scenario.student, "/student")
    const attemptId = await startAttemptFromLobby(page, scenario.assignmentId)

    // Lần rời tab đầu tiên → toast cảnh báo.
    await triggerVisibilityChange(page, true)
    await expect(page.getByText("Đã ghi nhận bạn rời phòng thi")).toBeVisible()

    // Vượt ngưỡng suspicious (mặc định TAB_SWITCH >= 5); mỗi sự kiện cách >1s
    // để không bị khử trùng.
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1200)
      await triggerVisibilityChange(page, true)
    }

    await submitAttempt(page)
    await expect(page.getByRole("heading", { name: /Bạn đã nộp bài thành công/ })).toBeVisible()

    // ── GV: nhật ký hành vi của bài nộp ──────────────────────────────────
    const teacherPage = await context.newPage()
    await openAs(teacherPage, scenario.teacher, "/teacher")
    await teacherPage.goto(`/teacher/submissions/${attemptId}?tab=log`)
    await expect(teacherPage.getByText("Rời tab / chuyển cửa sổ").first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(teacherPage.getByText("Rời tab", { exact: true })).toBeVisible()

    // ── GV: tab "Cần kiểm tra" liệt kê bài nghi vấn ──────────────────────
    await teacherPage.goto("/teacher/submissions?tab=suspicious")
    await expect(teacherPage.getByText(scenario.student.user.fullName)).toBeVisible({
      timeout: 20_000,
    })
  })
})
