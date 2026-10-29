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

export interface StudentClassRef {
  id: string
  name: string
  code: string
}

/** Học sinh đã đăng ký + các lớp hiện tại (rỗng = chưa vào lớp nào). */
export interface RegisteredStudent extends User {
  classes: StudentClassRef[]
}

export interface ListStudentsParams {
  status?: UserStatus
  search?: string
  /** Chỉ lấy học sinh chưa thuộc lớp nào. */
  unassigned?: boolean
  page?: number
  limit?: number
}

export interface ListStudentsResult {
  items: RegisteredStudent[]
  meta?: PaginatedMeta
}

/**
 * Danh sách học sinh đã đăng ký — dành cho giáo viên để biết bạn nào còn chưa
 * vào lớp. Khác với `getUsersApi` (chỉ admin), endpoint này không trả giáo viên
 * hay quản trị viên.
 */
export async function getRegisteredStudentsApi(
  params: ListStudentsParams = {}
): Promise<ListStudentsResult> {
  const search = new URLSearchParams()
  if (params.status) search.set("status", params.status)
  if (params.search) search.set("search", params.search)
  if (params.unassigned) search.set("unassigned", "true")
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<RegisteredStudent[]>(
    `/api/users/students${qs ? `?${qs}` : ""}`
  )
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

export async function revokeUserSessionsApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/users/${id}/revoke-sessions`, {
    method: "POST",
  })
  return data.message
}
