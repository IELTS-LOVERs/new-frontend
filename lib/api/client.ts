import { useAuthStore } from "@/stores/auth.store"

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

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!res.ok) {
        useAuthStore.getState().logout()
        return null
      }
      const json = await res.json()
      if (json.success && json.data?.accessToken) {
        const newToken = json.data.accessToken as string
        useAuthStore.getState().setAccessToken(newToken)
        return newToken
      }
      useAuthStore.getState().logout()
      return null
    } catch {
      useAuthStore.getState().logout()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number
  skipAuth?: boolean
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

    // If 401, attempt single-flight token refresh
    if (res.status === 401 && !skipAuth && !path.includes("/auth/")) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        reqHeaders["Authorization"] = `Bearer ${newToken}`
        res = await fetch(normalizedUrl, {
          ...rest,
          headers: reqHeaders,
          signal: controller.signal,
          credentials: "include",
        })
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
