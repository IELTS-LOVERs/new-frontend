import { apiClient } from "./client"
import type { StudentDashboardStats, TeacherDashboardStats } from "./types"

export async function getStudentDashboardApi(): Promise<StudentDashboardStats> {
  const { data } = await apiClient<StudentDashboardStats>("/api/dashboard/student")
  return data
}

export async function getTeacherDashboardApi(): Promise<TeacherDashboardStats> {
  const { data } = await apiClient<TeacherDashboardStats>("/api/dashboard/teacher")
  return data
}
