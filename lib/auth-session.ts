import { useAuthStore } from "@/stores/auth.store"

export type ForcedLogoutReason =
  | "session_replaced"
  | "session_expired"
  | "token_revoked"

/** sessionStorage key used for the one-time "another device logged in" notice. */
export const SESSION_REPLACED_FLAG = "auth:session-replaced"

/** Decode the JWT payload without verifying it (client has no secret). */
function decodeJwtPayload(token?: string | null): { exp?: unknown } | null {
  if (!token) return null

  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as { exp?: unknown }
  } catch {
    return null
  }
}

/** Token expiry as Unix **seconds** — for cookie `max-age` values. */
export function decodeJwtExpSeconds(token?: string | null): number | null {
  const payload = decodeJwtPayload(token)
  return payload && typeof payload.exp === "number" ? payload.exp : null
}

/** Token expiry as Unix **milliseconds** — for `setTimeout` deadlines. */
export function decodeJwtExpMs(token?: string | null): number | null {
  const seconds = decodeJwtExpSeconds(token)
  return seconds === null ? null : seconds * 1000
}

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
