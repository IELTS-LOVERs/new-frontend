import { apiClient } from "./client"
import type { ClassDetail, ClassSummary } from "./types"

export interface JoinClassResponse {
  classId: string
  name: string
  message: string
}

export async function getClassesApi(): Promise<ClassSummary[]> {
  const { data } = await apiClient<ClassSummary[]>("/api/classes")
  return data
}

export async function getClassDetailApi(id: string): Promise<ClassDetail> {
  const { data } = await apiClient<ClassDetail>(`/api/classes/${id}`)
  return data
}

export async function joinClassApi(code: string): Promise<JoinClassResponse> {
  const { data } = await apiClient<JoinClassResponse>("/api/classes/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
  return data
}

export async function createClassApi(payload: {
  name: string
  description?: string
}): Promise<ClassSummary & { teacherId: string }> {
  const { data } = await apiClient<ClassSummary & { teacherId: string }>("/api/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateClassApi(
  id: string,
  payload: { name?: string; description?: string }
): Promise<ClassSummary> {
  const { data } = await apiClient<ClassSummary>(`/api/classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return data
}

export async function deleteClassApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/classes/${id}`, {
    method: "DELETE",
  })
  return data.message
}

export interface AddStudentResponse {
  message: string
  student: { id: string; email: string; fullName: string }
}

export async function addStudentToClassApi(id: string, email: string): Promise<AddStudentResponse> {
  const { data } = await apiClient<AddStudentResponse>(`/api/classes/${id}/students`, {
    method: "POST",
    body: JSON.stringify({ email }),
  })
  return data
}

export async function removeStudentFromClassApi(id: string, studentId: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(
    `/api/classes/${id}/students/${studentId}`,
    { method: "DELETE" }
  )
  return data.message
}

// REQ-002: học sinh tự rời lớp.
export async function leaveClassApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/classes/${id}/leave`, {
    method: "POST",
  })
  return data.message
}
