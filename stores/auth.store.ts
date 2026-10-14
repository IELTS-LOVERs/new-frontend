import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { User } from "@/lib/api/types"

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrated: boolean
  setAuth: (user: User, token: string) => void
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  setHydrated: (hydrated: boolean) => void
  logout: () => void
}

/**
 * Decode the `exp` claim from a JWT without verifying it (client-side only, no
 * secret available). Used to size the access cookie to the real token TTL.
 */
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json = JSON.parse(atob(base64)) as { exp?: number }
    return typeof json.exp === "number" ? json.exp : null
  } catch {
    return null
  }
}

/** Fallback access-cookie lifetime when the JWT cannot be decoded (2h). */
const FALLBACK_ACCESS_MAX_AGE = 2 * 60 * 60
/**
 * FIX-04: the non-sensitive role cookie keeps the 7-day "remember me" window so
 * middleware `hasSession` still lets AuthGate perform a silent refresh after the
 * short-lived access cookie expires.
 */
const ROLE_COOKIE_MAX_AGE = 7 * 24 * 60 * 60

/**
 * Builds the client-side auth cookies. Exported so the TTL/Secure logic can be
 * unit tested without a real DOM/location.
 */
export function buildAuthCookieStrings(
  token: string,
  role: string | undefined,
  options: { secure: boolean; nowSeconds: number }
): string[] {
  const secure = options.secure ? "; Secure" : ""

  // FIX-04: access cookie lifetime mirrors the real access token TTL.
  const exp = decodeJwtExp(token)
  const accessMaxAge = exp
    ? Math.max(0, exp - options.nowSeconds)
    : FALLBACK_ACCESS_MAX_AGE

  const cookies = [
    `ielts_access_token=${encodeURIComponent(token)}; path=/; max-age=${accessMaxAge}; SameSite=Lax${secure}`,
  ]

  if (role) {
    cookies.push(
      `ielts_user_role=${encodeURIComponent(role)}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
    )
  }

  return cookies
}

function setAuthCookies(token: string, role?: string) {
  if (typeof document === "undefined") return
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"

  for (const cookie of buildAuthCookieStrings(token, role, {
    secure,
    nowSeconds: Math.floor(Date.now() / 1000),
  })) {
    document.cookie = cookie
  }
}

function clearAuthCookies() {
  if (typeof document === "undefined") return
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : ""
  document.cookie = `ielts_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`
  document.cookie = `ielts_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,
      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ielts_access_token", token)
          sessionStorage.setItem("ielts_user", JSON.stringify(user))
          setAuthCookies(token, user.role)
        }
        set({ user, accessToken: token, isAuthenticated: true, isHydrated: true })
      },
      setAccessToken: (token) => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ielts_access_token", token)
          const currentRole = useAuthStore.getState().user?.role
          setAuthCookies(token, currentRole)
        }
        set({ accessToken: token, isAuthenticated: true })
      },
      setUser: (user) => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ielts_user", JSON.stringify(user))
          const currentToken = useAuthStore.getState().accessToken
          if (currentToken) setAuthCookies(currentToken, user.role)
        }
        set({ user })
      },
      setHydrated: (isHydrated) => set({ isHydrated }),
      logout: () => {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("ielts_access_token")
          sessionStorage.removeItem("ielts_user")
          clearAuthCookies()
        }
        set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true })
      },
    }),
    { name: "ielts-auth" }
  )
)

export function initAuthFromStorage() {
  if (typeof window === "undefined") return
  try {
    const token = sessionStorage.getItem("ielts_access_token")
    const userStr = sessionStorage.getItem("ielts_user")
    if (token && userStr) {
      const user = JSON.parse(userStr) as User
      setAuthCookies(token, user.role)
      useAuthStore.getState().setAuth(user, token)
      return
    }
  } catch (e) {
    console.error("Failed to restore auth from session", e)
  }
  useAuthStore.getState().setHydrated(true)
}
