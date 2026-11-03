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

async function readEnvelope(
  res: Awaited<ReturnType<APIRequestContext["fetch"]>>,
  label: string
): Promise<Record<string, unknown> | null> {
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  expect(
    res.ok(),
    `${label} thất bại → HTTP ${res.status()} ${body ? JSON.stringify(body) : ""}`
  ).toBeTruthy()
  return body
}

/** Gọi API backend trực tiếp bằng APIRequestContext (Node-side, không qua CORS). */
export async function apiRequest<T = any>(
  api: APIRequestContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  token?: string,
  data?: unknown
): Promise<T> {
  const res = await api.fetch(`${API_ORIGIN}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data !== undefined ? { data } : {}),
  })
  const body = await readEnvelope(res, `${method} ${path}`)
  return body?.data as T
}

export const apiGet = <T = any>(api: APIRequestContext, path: string, token?: string): Promise<T> =>
  apiRequest<T>(api, "GET", path, token)
export const apiPost = <T = any>(api: APIRequestContext, path: string, token: string | undefined, data?: unknown): Promise<T> =>
  apiRequest<T>(api, "POST", path, token, data)
export const apiPatch = <T = any>(api: APIRequestContext, path: string, token: string | undefined, data?: unknown): Promise<T> =>
  apiRequest<T>(api, "PATCH", path, token, data)
export const apiPut = <T = any>(api: APIRequestContext, path: string, token: string | undefined, data?: unknown): Promise<T> =>
  apiRequest<T>(api, "PUT", path, token, data)
export const apiDelete = <T = any>(api: APIRequestContext, path: string, token?: string): Promise<T> =>
  apiRequest<T>(api, "DELETE", path, token)

export async function loginViaApi(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<ApiSession> {
  const res = await api.post(`${API_ORIGIN}/api/auth/login`, { data: { email, password } })
  const body = await readEnvelope(res, `login ${email}`)
  const data = body?.data as { accessToken: string; user: ApiUser }
  return { token: data.accessToken, user: data.user }
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
  const data = body?.data as { accessToken: string; user: ApiUser }
  return { token: data.accessToken, user: data.user }
}
