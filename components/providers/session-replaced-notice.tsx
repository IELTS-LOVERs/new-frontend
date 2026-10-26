"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { SESSION_REPLACED_FLAG } from "@/lib/auth-session"

export const SESSION_REPLACED_EVENT = "auth:session-replaced"

/**
 * #1: show a one-time notice on the device that just logged in and thereby
 * replaced the session of another device. The flag lives in sessionStorage so a
 * reload does not show it again; the older device is redirected to
 * `/login?reason=session_replaced` by the auth gate instead.
 */
export function SessionReplacedNotice() {
  const pathname = usePathname()

  const showOnce = React.useCallback(() => {
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(SESSION_REPLACED_FLAG) !== "1") return
    window.sessionStorage.removeItem(SESSION_REPLACED_FLAG)

    toast.info(
      "Tài khoản đã được đăng nhập trên một thiết bị khác. Thiết bị này hiện là phiên hoạt động.",
      {
        description: "Nếu không phải bạn, hãy đổi mật khẩu.",
        duration: 10_000,
      }
    )
  }, [])

  React.useEffect(() => {
    showOnce()
    window.addEventListener(SESSION_REPLACED_EVENT, showOnce)
    return () => window.removeEventListener(SESSION_REPLACED_EVENT, showOnce)
  }, [pathname, showOnce])

  return null
}
