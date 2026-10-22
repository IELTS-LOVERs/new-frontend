import { test, expect } from "@playwright/test"
import { loginAs } from "./helpers"
import { createScenario } from "./support/scenario"
import { openAs } from "./support/exam"

/**
 * Flow 2 (frontend-spec §12.2) — Giao bài.
 * GV giao đề đã xuất bản cho lớp qua AssignDialog; HS thấy bài tập ở
 * trang Tổng quan (/student) và danh sách Bài tập (/student/assignments).
 */
test.describe("Flow 2 — Giao bài cho lớp", () => {
  test("GV giao qua dialog → HS thấy ở Tổng quan và Bài tập", async ({
    page,
    context,
    request,
  }) => {
    const scenario = await createScenario(request, {
      titlePrefix: "E2E Giao bài",
      classPrefix: "E2E Assign Class",
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
              prompt: "Giao bài câu 1",
              acceptedAnswers: ["a"],
            },
          ],
        },
      ],
    })

    // ── GV: mở lớp và giao bài qua dialog ────────────────────────────────
    await loginAs(page, "teacher")
    await page.goto(`/teacher/classes/${scenario.classId}`)
    await expect(page.getByRole("heading", { name: scenario.className })).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole("button", { name: /Giao bài cho lớp/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Combobox đầu tiên trong dialog là "Đề thi" → chọn đề vừa tạo.
    await dialog.getByRole("combobox").first().click()
    await page.getByRole("option", { name: scenario.examTitle }).click()

    // Lớp đã được điền sẵn qua initialClassId.
    await dialog.getByRole("button", { name: "Giao bài", exact: true }).click()
    await expect(page.getByText("Đã giao bài!", { exact: true })).toBeVisible({ timeout: 15_000 })

    // ── HS: thấy bài tập ở trang Tổng quan ───────────────────────────────
    const studentPage = await context.newPage()
    await openAs(studentPage, scenario.student, "/student")
    await expect(studentPage.getByText(scenario.examTitle).first()).toBeVisible({ timeout: 20_000 })

    // ── HS: thấy bài tập ở danh sách Đề thi (tab "Cần làm") ─────────────
    await studentPage.goto("/student/exams")
    await expect(studentPage.getByText(scenario.examTitle).first()).toBeVisible({ timeout: 20_000 })
  })
})
