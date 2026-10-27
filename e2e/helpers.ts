import { expect, type Page } from "@playwright/test"

/** Backend API chạy trực tiếp (dùng cho assert phía server, không qua Next proxy). */
export const API_ORIGIN = process.env.E2E_API_ORIGIN ?? "http://localhost:4000"

/** Tài khoản seed sẵn (backend/api/src/scripts/seed.ts). */
export const ACCOUNTS = {
  student: { email: "student2@ielts.com", password: "Student@123" },
  studentSubmitted: { email: "student1@ielts.com", password: "Student@123" },
  teacher: { email: "teacher@ielts.com", password: "Teacher@123" },
  admin: { email: "admin@ielts.com", password: "Admin@123" },
} as const

export type AccountKey = keyof typeof ACCOUNTS

const ROLE_HOME = {
  student: "/student",
  studentSubmitted: "/student",
  teacher: "/teacher",
  admin: "/admin/users",
} as const

/**
 * Đăng nhập qua API rồi bơm token vào sessionStorage (app lưu access token ở
 * sessionStorage key `ielts_access_token` + `ielts_user`; AuthGate đọc lại)
 * và vào cookie (`ielts_access_token` + `ielts_user_role`) vì middleware chặn
 * route bảo vệ dựa trên cookie (xem stores/auth.store.ts → setAuth).
 */
export async function loginAs(page: Page, key: AccountKey) {
  const { email, password } = ACCOUNTS[key]
  const res = await page.request.post(`${API_ORIGIN}/api/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) throw new Error(`Đăng nhập API thất bại (${res.status()}) cho ${email}`)
  const json = (await res.json()) as { data: { accessToken: string; user: { role: string } } }
  const token = json.data.accessToken
  const user = JSON.stringify(json.data.user)
  const role = json.data.user.role

  await page.addInitScript(
    ([t, u, r]) => {
      sessionStorage.setItem("ielts_access_token", t as string)
      sessionStorage.setItem("ielts_user", u as string)
      if (r) document.cookie = `ielts_user_role=${encodeURIComponent(r as string)}; path=/; SameSite=Lax`
    },
    [token, user, role]
  )
  // Session cookie (không đặt max-age) → sống trong suốt phiên test.
  await page.context().addCookies(cookiesFor(page, token, role))

  await page.goto(ROLE_HOME[key])
  await expect(page).toHaveURL(new RegExp(ROLE_HOME[key].replace("/", "\\/")))
  return { token, user: json.data.user }
}

/** Cookie auth cho origin của web app (giống setAuth trong auth.store.ts). */
function cookiesFor(
  page: Page,
  token: string,
  role?: string
): Array<{ name: string; value: string; url: string }> {
  const configured = process.env.E2E_BASE_URL ?? page.url() ?? "http://127.0.0.1:3000"
  const origin = new URL(configured).origin
  const cookies = [{ name: "ielts_access_token", value: encodeURIComponent(token), url: origin }]
  if (role) {
    cookies.push({ name: "ielts_user_role", value: encodeURIComponent(role), url: origin })
  }
  return cookies
}

/** Bơm token thủ công (khi đã có token từ nơi khác). */
export async function seedSession(page: Page, token: string, user: unknown) {
  const role = (user as { role?: string } | null)?.role
  await page.addInitScript(
    ([t, u, r]) => {
      sessionStorage.setItem("ielts_access_token", t as string)
      sessionStorage.setItem("ielts_user", u as string)
      if (r) document.cookie = `ielts_user_role=${encodeURIComponent(r as string)}; path=/; SameSite=Lax`
    },
    [token, JSON.stringify(user), role ?? ""]
  )

  await page.context().addCookies(cookiesFor(page, token, role ?? undefined))
}

/**
 * Ép `document.fullscreenElement` luôn khác null để tránh ResumeGate chặn phòng thi
 * trong môi trường headless (không thể fullscreen thật).
 */
export async function disableFullscreenGate(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => document.documentElement,
    })
  })
}

export async function getToken(page: Page): Promise<string | null> {
  return page.evaluate(() => sessionStorage.getItem("ielts_access_token"))
}

/** Gọi API backend trực tiếp (Bearer lấy từ sessionStorage). */
export async function apiFetch(page: Page, method: string, path: string, data?: unknown) {
  const token = await getToken(page)
  return page.request.fetch(`${API_ORIGIN}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data,
  })
}
