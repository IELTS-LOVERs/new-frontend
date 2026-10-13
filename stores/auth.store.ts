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

function setAuthCookies(token: string, role?: string) {
  if (typeof document === "undefined") return
  const maxAge = 7 * 24 * 60 * 60 // 7 days
  document.cookie = `ielts_access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`
  if (role) {
    document.cookie = `ielts_user_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`
  }
}

function clearAuthCookies() {
  if (typeof document === "undefined") return
  document.cookie = "ielts_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
  document.cookie = "ielts_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
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
          setAuthCookies(token)
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
