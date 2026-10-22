import { afterEach, describe, expect, it } from "vitest"
import { useAuthStore } from "@/stores/auth.store"
import { forceLogout } from "./auth-session"

afterEach(() => {
  useAuthStore.getState().logout()
  window.history.pushState({}, "", "/")
})

describe("forceLogout", () => {
  it("clears the auth store and client-side session storage", () => {
    window.history.pushState({}, "", "/login")
    useAuthStore.getState().setAuth(
      {
        id: "user-1",
        email: "student@example.com",
        fullName: "Student",
        role: "student",
        status: "active",
        phone: null,
        targetBand: null,
        avatarMediaId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never,
      "access-token"
    )

    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    forceLogout("session_replaced")

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(sessionStorage.getItem("ielts_access_token")).toBeNull()
    expect(sessionStorage.getItem("ielts_user")).toBeNull()
  })
})
