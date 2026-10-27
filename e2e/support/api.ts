import { expect, type APIRequestContext } from "@playwright/test"
import { API_ORIGIN } from "../helpers"

/** Base URL của Next.js app (khớp playwright.config.ts). */
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000"

export interface ApiUser {
  id: string
  email: string
  fullName: string
  role: string
  targetBand?: number | null
}

export interface ApiSession {
  token: string
  user: ApiUser
}

/** Đọc envelope { success, data, meta } và ném lỗi rõ ràng khi HTTP != 2xx. */
async function readEnvelope(
  res: Awaited<ReturnType<APIRequestContext["fetch"]>>,
  label: string
): Promise<any> {
  const body = await res.json().catch(() => null)
  expect(
    res.ok(),
    `${label} thất bại → HTTP ${res.status()} ${body ? JSON.stringify(body) : ""}`
  ).toBeTruthy()
  return body
}

/** Gọi API backend trực tiếp bằng APIRequestContext (Node-side, không qua CORS). */
export async function apiRequest(
  api: APIRequestContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  token?: string,
  data?: unknown
): Promise<any> {
  const res = await api.fetch(`${API_ORIGIN}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data !== undefined ? { data } : {}),
  })
  const body = await readEnvelope(res, `${method} ${path}`)
  return body?.data
}

export const apiGet = (api: APIRequestContext, path: string, token?: string) =>
  apiRequest(api, "GET", path, token)
export const apiPost = (api: APIRequestContext, path: string, token: string | undefined, data?: unknown) =>
  apiRequest(api, "POST", path, token, data)
export const apiPatch = (api: APIRequestContext, path: string, token: string | undefined, data?: unknown) =>
  apiRequest(api, "PATCH", path, token, data)
export const apiPut = (api: APIRequestContext, path: string, token: string | undefined, data?: unknown) =>
  apiRequest(api, "PUT", path, token, data)
export const apiDelete = (api: APIRequestContext, path: string, token?: string) =>
  apiRequest(api, "DELETE", path, token)

export async function loginViaApi(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<ApiSession> {
  const res = await api.post(`${API_ORIGIN}/api/auth/login`, { data: { email, password } })
  const body = await readEnvelope(res, `login ${email}`)
  return { token: body.data.accessToken, user: body.data.user }
}

export async function registerStudentViaApi(
  api: APIRequestContext,
  email: string,
  password: string,
  fullName: string
): Promise<ApiSession> {
  const res = await api.post(`${API_ORIGIN}/api/auth/register`, {
    data: { email, password, fullName },
  })
  const body = await readEnvelope(res, `register ${email}`)
  return { token: body.data.accessToken, user: body.data.user }
}
