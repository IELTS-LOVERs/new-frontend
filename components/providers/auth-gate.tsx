"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore, initAuthFromStorage } from "@/stores/auth.store"
import { getMeApi, refreshAccessTokenApi } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserRole } from "@/lib/api/types"

interface AuthGateProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

/**
 * AuthGate client-side:
 * 1. Hydrate token từ sessionStorage
 * 2. Nếu chưa có user: gọi refresh (cookie) → GET /users/me
 * 3. Nếu không có session: redirect /login?next=<path>
 * 4. Nếu sai role: redirect về trang gốc của role
 */
export function AuthGate({ children, allowedRoles }: AuthGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, accessToken, isAuthenticated, isHydrated, setAuth, setHydrated, setUser, logout } =
    useAuthStore()
  const [status, setStatus] = React.useState<"checking" | "ready" | "redirecting">("checking")

  React.useEffect(() => {
    if (typeof window === "undefined") return

    if (!isHydrated) {
      initAuthFromStorage()
      return
    }

    let cancelled = false

    async function bootstrap() {
      // Đã có user + token → kiểm tra role
      if (isAuthenticated && user && accessToken) {
        if (!allowedRoles.includes(user.role)) {
          redirectToRoleHome(user.role)
          return
        }
        if (!cancelled) setStatus("ready")
        return
      }

      // Thử refresh token bằng cookie
      const token = await refreshAccessTokenApi()
      if (!token) {
        logout()
        redirectToLogin()
        return
      }

      try {
        const me = await getMeApi()
        if (cancelled) return
        setAuth(me, token)
        if (!allowedRoles.includes(me.role)) {
          redirectToRoleHome(me.role)
          return
        }
        if (!cancelled) setStatus("ready")
      } catch (err) {
        if (cancelled) return
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
