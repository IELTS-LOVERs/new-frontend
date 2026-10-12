import { expect, type Page } from "@playwright/test"
import { seedSession } from "../helpers"
import type { ApiSession } from "./api"

/** Bơm session (token + user) rồi mở trang home của vai. */
export async function openAs(page: Page, session: ApiSession, path: string) {
  await seedSession(page, session.token, session.user)
  await page.goto(path)
}

/**
 * Mở phòng chờ (lobby) của assignment, tick đồng ý quy chế và bắt đầu làm bài.
 * Trả về attemptId trích từ URL sau khi vào phòng thi.
 */
export async function startAttemptFromLobby(page: Page, assignmentId: string): Promise<string> {
  await page.goto(`/exam/start/${assignmentId}`)
  const startButton = page.getByRole("button", { name: "Bắt đầu làm bài thi" })
  await expect(startButton).toBeVisible({ timeout: 30_000 })
  await expect(startButton).toBeDisabled()
  await page.getByRole("checkbox").check()
  await expect(startButton).toBeEnabled()
  await startButton.click()
  await waitForExamEngine(page)
  return currentAttemptId(page)
}

/** Chờ phòng thi thật sự render (nút Nộp bài ở top bar). */
export async function waitForExamEngine(page: Page) {
  await expect(page.getByRole("button", { name: "Nộp bài", exact: true })).toBeVisible({
    timeout: 45_000,
  })
}

export function currentAttemptId(page: Page): string {
  const match = page.url().match(/\/exam\/([^/?#]+)/)
  if (!match) throw new Error(`Không tìm thấy attemptId trong URL: ${page.url()}`)
  return match[1]
}

/** Nộp bài qua dialog xác nhận. */
export async function submitAttempt(page: Page) {
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Xác nhận nộp bài thi")).toBeVisible()
  await dialog.getByRole("button", { name: "Nộp bài ngay" }).click()
  await page.waitForURL(/\/exam\/[^/]+\/submitted/, { timeout: 30_000 })
}

/** Đọc số giây còn lại từ đồng hồ top bar. */
export async function readTimerSeconds(page: Page): Promise<number> {
  const timer = page.locator("header").getByText(/^(?:\d{1,2}:)?\d{2}:\d{2}$/).first()
  await expect(timer).toBeVisible()
  const text = (await timer.innerText()).trim()
  const parts = text.split(":").map((n) => Number(n))
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return parts[0] * 60 + parts[1]
}

/** Giá trị hiện tại của tất cả ô trả lời dạng text trong section đang hiển thị. */
export async function readTextAnswers(page: Page): Promise<string[]> {
  const inputs = page.getByPlaceholder("Nhập câu trả lời của bạn...")
  return inputs.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))
}

export async function fillTextAnswer(page: Page, index: number, value: string) {
  const input = page.getByPlaceholder("Nhập câu trả lời của bạn...").nth(index)
  await input.fill(value)
}

/**
 * Cài "probe" cho visibilitychange: cho phép test điều khiển document.hidden
 * rồi phát sự kiện visibilitychange như khi người dùng thật sự đổi tab.
 */
export async function installVisibilityProbe(page: Page) {
  await page.addInitScript(() => {
    let hidden = false
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    })
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (hidden ? "hidden" : "visible"),
    })
    ;(window as unknown as { __e2eSetHidden: (v: boolean) => void }).__e2eSetHidden = (value) => {
      hidden = value
      document.dispatchEvent(new Event("visibilitychange"))
    }
  })
}

/** Phát một sự kiện "đổi tab / ẩn trang" nhân tạo. */
export async function triggerVisibilityChange(page: Page, hidden = true) {
  await page.evaluate(
    (value) =>
      (window as unknown as { __e2eSetHidden: (v: boolean) => void }).__e2eSetHidden(value),
    hidden
  )
}

/** Phát sự kiện paste với dữ liệu clipboard lên một phần tử. */
export async function dispatchPaste(page: Page, selector: string, text: string) {
  await page.locator(selector).evaluate((el, value) => {
    const data = new DataTransfer()
    data.setData("text/plain", value)
    el.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
    )
  }, text)
}
