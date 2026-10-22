import { apiClient, ApiError } from "./client"
import { useAuthStore } from "@/stores/auth.store"
import type { User } from "./types"

export interface LoginResponse {
  user: User
  accessToken: string
}

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
  phone?: string
  targetBand?: number
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  })
  return data
}

export async function registerApi(payload: RegisterPayload): Promise<LoginResponse> {
  const { data } = await apiClient<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  })
  return data
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient("/api/auth/logout", { method: "POST", skipAuth: true })
  } catch {
    // Cookie có thể đã hết hạn — vẫn coi như đăng xuất ở client
  }
}

export interface RefreshAccessTokenResult {
  token: string | null
  errorCode?: string
}

export async function refreshAccessTokenApi(): Promise<RefreshAccessTokenResult> {
  try {
    const { data } = await apiClient<{ accessToken: string }>("/api/auth/refresh", {
      method: "POST",
      skipAuth: true,
    })
    const token = data?.accessToken ?? null
    if (token) {
      useAuthStore.getState().setAccessToken(token)
    }
    return { token }
  } catch (err) {
    if (err instanceof ApiError) {
      return { token: null, errorCode: err.code }
    }
    return { token: null }
  }
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<string> {
  const { data } = await apiClient<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data.message
}

export async function getMeApi(): Promise<User> {
  const { data } = await apiClient<User>("/api/users/me")
  return data
}

export async function updateMeApi(
  payload: Partial<Pick<User, "fullName" | "phone" | "targetBand" | "avatarMediaId">>
): Promise<User> {
  const { data } = await apiClient<User>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return data
}

export function applyAuthToStore(user: User, accessToken: string) {
  useAuthStore.getState().setAuth(user, accessToken)
}
