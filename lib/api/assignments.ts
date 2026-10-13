import { apiClient, downloadCsv } from "./client"
import type {
  AssignmentProgress,
  AssignmentSummary,
  AssignmentStatus,
  AttemptScores,
  MyAssignment,
  SubmissionStatus,
} from "./types"

// Backend `/assignments/:id/progress` trả { assignment, overview, students[] } với
// mỗi học sinh lồng trong `student { id, fullName, email }` + `scores`. UI cần dạng
// phẳng. Khai báo hình dạng thô để adapter map ở tầng API.
interface RawAssignmentProgress {
  assignment?: {
    id?: string
    examTitle?: string
    deadline?: string | null
    maxAttempts?: number
    status?: AssignmentStatus
    class?: { id?: string; name?: string; code?: string } | null
  }
  overview?: {
    totalStudents?: number
    submittedCount?: number
    inProgressCount?: number
    notStartedCount?: number
    averageBand?: number | null
  }
  students?: Array<{
    student?: { id?: string; fullName?: string; email?: string }
    status?: SubmissionStatus
    scores?: AttemptScores
    submittedAt?: string | null
    suspicious?: boolean
  }>
}

export interface ListAssignmentsParams {
  classId?: string
  examId?: string
  page?: number
  limit?: number
}

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ListAssignmentsResult {
  items: AssignmentSummary[]
  meta?: PaginatedMeta
}

export interface MyAssignmentsParams {
  classId?: string
  status?: "all" | "not_started" | "in_progress" | "submitted" | "expired"
}

export async function getMyAssignmentsApi(
  params: MyAssignmentsParams = {}
): Promise<MyAssignment[]> {
  const search = new URLSearchParams()
  if (params.classId) search.set("classId", params.classId)
  if (params.status) search.set("status", params.status)
  const qs = search.toString()
  const { data } = await apiClient<MyAssignment[]>(
    `/api/assignments/my${qs ? `?${qs}` : ""}`
  )
  return data
}

export async function getTeacherAssignmentsApi(
  params: ListAssignmentsParams = {}
): Promise<ListAssignmentsResult> {
  const search = new URLSearchParams()
  if (params.classId) search.set("classId", params.classId)
  if (params.examId) search.set("examId", params.examId)
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<any[]>(
    `/api/assignments${qs ? `?${qs}` : ""}`
  )
  const items: AssignmentSummary[] = (data ?? []).map((item: any) => ({
    ...item,
    examTitle: item.examTitle || item.examId?.title || "",
    className: item.className || item.classId?.name || null,
    targetLabel: item.targetLabel || item.className || item.classId?.name || "—",
    stats: item.stats ?? { assigned: 0, submitted: 0, inProgress: 0 },
  }))
  return { items, meta: meta as PaginatedMeta | undefined }
}

export interface CreateAssignmentPayload {
  examId: string
  classId?: string
  studentId?: string
  deadline?: string
  maxAttempts?: number
  shuffleQuestions?: boolean
  showScoreAfterSubmit?: boolean
}

export async function createAssignmentApi(
  payload: CreateAssignmentPayload
): Promise<AssignmentSummary> {
  const { data } = await apiClient<AssignmentSummary>("/api/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function getAssignmentDetailApi(id: string) {
  const { data } = await apiClient(`/api/assignments/${id}`)
  return data as any
}

export async function updateAssignmentApi(
  id: string,
  payload: Partial<{
    deadline: string | null
    status: AssignmentStatus
    maxAttempts: number
    shuffleQuestions: boolean
    showScoreAfterSubmit: boolean
  }>
) {
  const { data } = await apiClient(`/api/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return data as { id: string; deadline: string | null; status: AssignmentStatus }
}

export async function deleteAssignmentApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/assignments/${id}`, {
    method: "DELETE",
  })
  return data.message
}

export async function getAssignmentProgressApi(id: string): Promise<AssignmentProgress> {
  const { data } = await apiClient<RawAssignmentProgress>(`/api/assignments/${id}/progress`)
  const students = data?.students ?? []

  return {
    id: data?.assignment?.id ?? id,
    examId: "",
    examTitle: data?.assignment?.examTitle ?? "",
    className: data?.assignment?.class?.name ?? null,
    deadline: data?.assignment?.deadline ?? null,
    maxAttempts: data?.assignment?.maxAttempts ?? 1,
    status: data?.assignment?.status ?? "active",
    averageBand: data?.overview?.averageBand ?? null,
    students: students.map((s) => ({
      studentId: s.student?.id ?? "",
      studentName: s.student?.fullName ?? "",
      studentEmail: s.student?.email ?? "",
      status: s.status ?? "not_started",
      listening: s.scores?.listeningBand ?? null,
      reading: s.scores?.readingBand ?? null,
      writing: s.scores?.writingBand ?? null,
      overall: s.scores?.overallBand ?? null,
      submittedAt: s.submittedAt ?? null,
      // Backend chưa trả attemptId cho từng học sinh → giữ null (fallback G2).
      attemptId: null,
      needsCheck: Boolean(s.suspicious),
    })),
  }
}

export async function exportAssignmentCsvApi(id: string, filename?: string): Promise<void> {
  await downloadCsv(`/api/assignments/${id}/export`, filename ?? `assignment-${id}.csv`)
}
