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
  kind?: "practice" | "mock"
}

export async function getMyAssignmentsApi(
  params: MyAssignmentsParams = {}
): Promise<MyAssignment[]> {
  const search = new URLSearchParams()
  if (params.classId) search.set("classId", params.classId)
  if (params.status) search.set("status", params.status)
  if (params.kind) search.set("kind", params.kind)
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
  const { data, meta } = await apiClient<Array<Record<string, unknown>>>(
    `/api/assignments${qs ? `?${qs}` : ""}`
  )
  const items: AssignmentSummary[] = (data ?? []).map((item) => {
    const rawExamId = item.examId
    const rawClassId = item.classId
    const examObj = rawExamId && typeof rawExamId === "object" ? (rawExamId as Record<string, unknown>) : null
    const classObj = rawClassId && typeof rawClassId === "object" ? (rawClassId as Record<string, unknown>) : null

    const examId = examObj ? String(examObj._id || examObj.id || "") : String(rawExamId || "")
    const classId = classObj ? String(classObj._id || classObj.id || "") : rawClassId ? String(rawClassId) : null
    const examTitle = (item.examTitle as string | undefined) || (examObj?.title as string | undefined) || ""
    const className = (item.className as string | undefined) || (classObj?.name as string | undefined) || null

    return {
      ...(item as unknown as AssignmentSummary),
      id: String(item.id || item._id || ""),
      examId,
      classId,
      examTitle,
      className,
      targetLabel: (item.targetLabel as string | undefined) || className || "—",
      stats: (item.stats as AssignmentSummary["stats"] | undefined) ?? {
        assigned: 0,
        submitted: 0,
        inProgress: 0,
      },
    }
  })
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
