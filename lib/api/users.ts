import { apiClient } from "./client"
import type { User, UserRole, UserStatus } from "./types"
import type { PaginatedMeta } from "./assignments"

export interface ListUsersParams {
  role?: UserRole
  status?: UserStatus
  search?: string
  page?: number
  limit?: number
}

export interface ListUsersResult {
  items: User[]
  meta?: PaginatedMeta
}

export async function getUsersApi(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const search = new URLSearchParams()
  if (params.role) search.set("role", params.role)
  if (params.status) search.set("status", params.status)
  if (params.search) search.set("search", params.search)
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<User[]>(`/api/users${qs ? `?${qs}` : ""}`)
  return { items: data, meta: meta as PaginatedMeta | undefined }
}

export interface CreateUserPayload {
  email: string
  password: string
  fullName: string
  phone?: string
  role?: "teacher" | "admin"
  targetBand?: number
}

export async function createUserApi(payload: CreateUserPayload): Promise<User> {
  const { data } = await apiClient<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateUserStatusApi(id: string, status: UserStatus): Promise<User> {
  const { data } = await apiClient<User>(`/api/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return data
}

export async function resetUserPasswordApi(id: string, newPassword: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  })
  return data.message
}
