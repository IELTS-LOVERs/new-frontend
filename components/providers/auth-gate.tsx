"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore, initAuthFromStorage } from "@/stores/auth.store"
import { getMeApi, refreshAccessTokenApi } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { forceLogout } from "@/lib/auth-session"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserRole } from "@/lib/api/types"

interface AuthGateProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

function decodeJwtExp(token?: string | null): number | null {
  if (!token) return null
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const decodedText = new TextDecoder().decode(bytes)
    const json = JSON.parse(decodedText)
    return typeof json.exp === "number" ? json.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * AuthGate client-side:
 * 1. Hydrate token từ sessionStorage
 * 2. Nếu chưa có user hoặc token đã hết hạn: gọi refresh (cookie) → GET /users/me
 * 3. Tự động chạy background timer để gia hạn token trước khi hết hạn
 * 4. Nếu không có session: redirect /login?next=<path>
 * 5. Nếu sai role: redirect về trang gốc của role
 */
export function AuthGate({ children, allowedRoles }: AuthGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, accessToken, isAuthenticated, isHydrated, setAuth, setHydrated, setUser, logout } =
    useAuthStore()
  const [status, setStatus] = React.useState<"checking" | "ready" | "redirecting">("checking")

  // ─── Proactive silent auto-refresh timer ───
  React.useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    const expMs = decodeJwtExp(accessToken)
    const now = Date.now()
    // Gia hạn ngầm trước khi token hết hạn 2 phút (tối thiểu 10s, tối đa 10 phút)
    const msUntilRefresh = expMs
      ? Math.max(Math.min(expMs - now - 2 * 60 * 1000, 10 * 60 * 1000), 10 * 1000)
      : 10 * 60 * 1000

    const timer = setTimeout(async () => {
      try {
        const result = await refreshAccessTokenApi()
        if (
          !result.token &&
          (result.errorCode === "SESSION_REPLACED" || result.errorCode === "TOKEN_REVOKED")
        ) {
          forceLogout(
            result.errorCode === "TOKEN_REVOKED" ? "token_revoked" : "session_replaced"
          )
        }
      } catch {
        // Bỏ qua lỗi ngầm (mạng/5xx), client.ts sẽ thử lại khi cần
      }
    }, msUntilRefresh)

    return () => clearTimeout(timer)
  }, [isAuthenticated, accessToken])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    if (!isHydrated) {
      initAuthFromStorage()
      return
    }

    let cancelled = false

    async function bootstrap() {
      const expMs = decodeJwtExp(accessToken)
      const isTokenExpired = expMs !== null && expMs <= Date.now()

      // Đã có user + token VÀ token chưa hết hạn → kiểm tra role
      if (isAuthenticated && user && accessToken && !isTokenExpired) {
        if (!allowedRoles.includes(user.role)) {
          redirectToRoleHome(user.role)
          return
        }
        if (!cancelled) setStatus("ready")
        return
      }

      // Thử refresh token bằng cookie nếu chưa có token hoặc token đã hết hạn
      const refreshResult = await refreshAccessTokenApi()
      if (!refreshResult.token) {
        if (
          refreshResult.errorCode === "SESSION_REPLACED" ||
          refreshResult.errorCode === "TOKEN_REVOKED"
        ) {
          forceLogout(
            refreshResult.errorCode === "TOKEN_REVOKED" ? "token_revoked" : "session_replaced"
          )
          return
        }
        logout()
        redirectToLogin()
        return
      }

      try {
        const me = await getMeApi()
        if (cancelled) return
        setAuth(me, refreshResult.token)
        if (!allowedRoles.includes(me.role)) {
          redirectToRoleHome(me.role)
          return
        }
        if (!cancelled) setStatus("ready")
      } catch (err) {
        if (cancelled) return
        if (
          err instanceof ApiError &&
          (err.code === "SESSION_REPLACED" || err.code === "TOKEN_REVOKED")
        ) {
          // forceLogout đã được gọi từ api client.
          return
        }
        if (err instanceof ApiError && err.status === 401) {
          logout()
          redirectToLogin()
        } else {
          // Lỗi mạng/500 — vẫn cho vào nếu có token (degrade gracefully), hoặc thử logout
          logout()
          redirectToLogin()
        }
      }
    }

    function redirectToLogin() {
      if (cancelled) return
      setStatus("redirecting")
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${next}`)
    }

    function redirectToRoleHome(role: UserRole) {
      if (cancelled) return
      setStatus("redirecting")
      const dest = role === "student" ? "/student" : "/teacher"
      router.replace(dest)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [isHydrated, isAuthenticated, user, accessToken, allowedRoles, pathname, router, setAuth, setHydrated, setUser, logout])

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      </div>
    )
  }

  if (status === "redirecting") {
    return null
  }

  return <>{children}</>
}
