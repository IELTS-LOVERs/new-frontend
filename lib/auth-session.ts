import { useAuthStore } from "@/stores/auth.store"

export type ForcedLogoutReason =
  | "session_replaced"
  | "session_expired"
  | "token_revoked"

/** sessionStorage key used for the one-time "another device logged in" notice. */
export const SESSION_REPLACED_FLAG = "auth:session-replaced"

let redirecting = false

/**
 * Kết thúc phiên hiện tại ở client và đưa người dùng về trang đăng nhập.
 *
 * Dùng khi server đã thu hồi/thay thế phiên (ví dụ thiết bị khác đăng nhập).
 * Không gọi /api/auth/logout ở đây: cookie refresh trong trình duyệt có thể đã
 * thuộc về phiên mới (trường hợp nhiều tab cùng trình duyệt), gọi logout sẽ
 * vô tình huỷ luôn phiên mới đó.
 */
export function forceLogout(reason: ForcedLogoutReason = "session_expired"): void {
  if (typeof window === "undefined") return

  useAuthStore.getState().logout()

  if (redirecting) return
  if (window.location.pathname === "/login") return

  redirecting = true
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
  window.location.replace(`/login?reason=${reason}&next=${next}`)
}
