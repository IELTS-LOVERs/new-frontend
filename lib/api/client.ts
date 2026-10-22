import { useAuthStore } from "@/stores/auth.store"
import { forceLogout, type ForcedLogoutReason } from "@/lib/auth-session"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: any = null
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface RefreshAttempt {
  token: string | null
  errorCode?: string
}

let refreshPromise: Promise<RefreshAttempt> | null = null

async function refreshAccessToken(): Promise<RefreshAttempt> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!res.ok) {
        let errorCode: string | undefined
        try {
          const json = await res.json()
          errorCode = json?.error?.code
        } catch {
          // Body không phải JSON — dùng lỗi chung.
        }
        return { token: null, errorCode }
      }
      const json = await res.json()
      if (json.success && json.data?.accessToken) {
        const newToken = json.data.accessToken as string
        useAuthStore.getState().setAccessToken(newToken)
        return { token: newToken }
      }
      return { token: null }
    } catch {
      return { token: null }
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function toForcedLogoutReason(...codes: Array<string | undefined>): ForcedLogoutReason {
  if (codes.includes("SESSION_REPLACED")) return "session_replaced"
  if (codes.includes("TOKEN_REVOKED")) return "token_revoked"
  return "session_expired"
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const json = await res.clone().json()
    return json?.error?.code as string | undefined
  } catch {
    return undefined
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number
  skipAuth?: boolean
  /**
   * FIX-06: when true, pass `keepalive` to fetch so the request survives page
   * unload (used by the autosave flush on `pagehide`). Unlike `sendBeacon` this
   * still carries the Authorization header. Payloads must stay under ~64KB.
   */
  keepalive?: boolean
}

export async function apiClient<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: any }> {
  const { timeoutMs = 15000, skipAuth = false, headers = {}, ...rest } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  }

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`
    }
  }

  const normalizedUrl = path.startsWith("http") ? path : path.startsWith("/") ? path : `/${path}`

  try {
    let res = await fetch(normalizedUrl, {
      ...rest,
      headers: reqHeaders,
      signal: controller.signal,
      credentials: "include",
    })

    // If 401, attempt single-flight token refresh. Same-browser tabs share the
    // refresh cookie, so a tab holding an older access token recovers silently.
    if (res.status === 401 && !skipAuth && !path.includes("/auth/")) {
      const originalCode = await readErrorCode(res)
      const attempt = await refreshAccessToken()
      if (attempt.token) {
        reqHeaders["Authorization"] = `Bearer ${attempt.token}`
        res = await fetch(normalizedUrl, {
          ...rest,
          headers: reqHeaders,
          signal: controller.signal,
          credentials: "include",
        })
      } else {
        forceLogout(toForcedLogoutReason(attempt.errorCode, originalCode))
        throw new ApiError(
          401,
          attempt.errorCode ?? originalCode ?? "UNAUTHORIZED",
          "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."
        )
      }
    }

    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      if (!res.ok) {
        throw new ApiError(res.status, "HTTP_ERROR", `HTTP ${res.status} ${res.statusText}`)
      }
      return { data: (await res.text()) as unknown as T }
    }

    const json = await res.json()

    if (!res.ok || json.success === false) {
      const err = json.error || {}
      throw new ApiError(
        res.status,
        err.code || "UNKNOWN_ERROR",
        err.message || "Đã xảy ra lỗi không xác định.",
        err.details
      )
    }

    return { data: json.data as T, meta: json.meta }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  })
  if (!res.ok) {
    throw new ApiError(res.status, "EXPORT_FAILED", "Không thể tải file CSV.")
  }
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
