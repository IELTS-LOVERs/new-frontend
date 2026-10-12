import { test, expect } from "@playwright/test"
import { loginAs } from "./helpers"

/**
 * Flow 1A/1B (frontend-spec §12.2) — Tạo đề từ mẫu.
 * Giáo viên chọn mẫu "Full IELTS (L + R + W)" rồi "Tạo đề thi" và được đưa
 * tới trình soạn đề tại /teacher/exams/<id>/edit.
 */
test.describe("Flow 1 — Tạo đề từ mẫu", () => {
  test("chọn mẫu Full IELTS → tạo → vào trang soạn đề", async ({ page }) => {
    await loginAs(page, "teacher")

    await page.goto("/teacher/exams/new")
    await expect(page.getByRole("heading", { name: "Tạo đề thi mới" })).toBeVisible()

    // Chọn mẫu Full IELTS (L + R + W).
    const fullTemplate = page.getByRole("button", { name: /Full IELTS \(L \+ R \+ W\)/ })
    await fullTemplate.click()
    await expect(fullTemplate).toContainText("Đã chọn")

    // Bấm "Tạo đề thi".
    await page.getByRole("button", { name: /^Tạo đề thi/ }).click()

    // Điều hướng tới trang soạn đề của đề vừa tạo.
    await page.waitForURL(/\/teacher\/exams\/[0-9a-fA-F]{24}\/edit/, { timeout: 30_000 })
    await expect(page.getByText("Đã tạo bản nháp đề thi")).toBeVisible()

    // Trình soạn đề đã tải xong (builder "Cấu trúc đề" + nút xuất bản).
    await expect(page.getByRole("heading", { name: "Cấu trúc đề" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Xuất bản đề/ })).toBeVisible()
  })
})
