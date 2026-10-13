import { apiClient } from "./client"
import type {
  ExamListItem,
  CandidateExam,
  SkillType,
  QuestionGroupType,
  QuestionGroup,
  QuestionItem,
  QuestionGroupConfig,
} from "./types"
import type { PaginatedMeta } from "./assignments"

export interface ListExamsParams {
  status?: "draft" | "published" | "closed"
  page?: number
  limit?: number
}

export interface ListExamsResult {
  items: ExamListItem[]
  meta?: PaginatedMeta
}

export async function getExamsApi(params: ListExamsParams = {}): Promise<ListExamsResult> {
  const search = new URLSearchParams()
  if (params.status) search.set("status", params.status)
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<ExamListItem[]>(`/api/exams${qs ? `?${qs}` : ""}`)
  return { items: data, meta: meta as PaginatedMeta | undefined }
}

// === Section payload types ===

export interface QuestionItemPayload {
  _id?: string
  questionNumber: number
  prompt: string
  acceptedAnswers?: string[]
  points?: number
  explanation?: string
  mediaIds?: string[]
}

export interface QuestionGroupPayload {
  _id?: string
  groupType: QuestionGroupType
  instructions?: string
  config?: QuestionGroupConfig
  questions?: QuestionItemPayload[]
}

export interface CreateExamSectionPayload {
  _id?: string
  skill: SkillType
  part: number
  title?: string
  instructions?: string
  passageText?: string
  transcript?: string
  mediaIds?: string[]
  questionGroups?: QuestionGroupPayload[]
  /** @deprecated Use questionGroups */
  questionIds?: string[]
}

export interface CreateExamPayload {
  title: string
  description?: string
  durationMinutes?: number
  sections: CreateExamSectionPayload[]
  openAt?: string
  closeAt?: string
}

export interface CreateExamResponse {
  id: string
  title: string
  durationMinutes: number
  status: "draft"
  sectionsCount: number
}

export async function createExamApi(payload: CreateExamPayload): Promise<CreateExamResponse> {
  const { data } = await apiClient<CreateExamResponse>("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateExamApi(id: string, payload: Partial<CreateExamPayload>) {
  const { data } = await apiClient<{ id: string; message: string }>(`/api/exams/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return data
}

export interface UpdateExamMetadataPayload {
  title?: string
  description?: string
  openAt?: string | null
  closeAt?: string | null
}

export async function updateExamMetadataApi(id: string, payload: UpdateExamMetadataPayload) {
  const { data } = await apiClient<{ id: string; message: string }>(`/api/exams/${id}/metadata`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return data
}

export async function deleteExamApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/exams/${id}`, { method: "DELETE" })
  return data.message
}

export async function cloneExamApi(id: string): Promise<{ id: string; title: string; status: "draft" }> {
  const { data } = await apiClient<{ id: string; title: string; status: "draft" }>(
    `/api/exams/${id}/clone`,
    { method: "POST" }
  )
  return data
}

export async function publishExamApi(id: string): Promise<{ id: string; status: string }> {
  const { data } = await apiClient<{ id: string; status: string }>(`/api/exams/${id}/publish`, {
    method: "PATCH",
  })
  return data
}

export async function unpublishExamApi(id: string): Promise<{ id: string; status: string }> {
  const { data } = await apiClient<{ id: string; status: string }>(`/api/exams/${id}/unpublish`, {
    method: "PATCH",
  })
  return data
}

export async function closeExamApi(id: string): Promise<{ id: string; status: string }> {
  const { data } = await apiClient<{ id: string; status: string }>(`/api/exams/${id}/close`, {
    method: "PATCH",
  })
  return data
}

export async function migrateExamApi(
  id: string
): Promise<{ id: string; message: string; migratedSections: number }> {
  const { data } = await apiClient<{ id: string; message: string; migratedSections: number }>(
    `/api/exams/${id}/migrate`,
    { method: "POST" }
  )
  return data
}

// === Teacher exam detail types (with answer data) ===

export interface TeacherQuestionItem {
  id: string
  questionNumber: number
  prompt: string
  acceptedAnswers: string[]
  points: number
  explanation?: string | null
  mediaIds?: string[]
}

export interface TeacherQuestionGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  config: QuestionGroupConfig
  questions: TeacherQuestionItem[]
}

export interface TeacherExamSection {
  id?: string
  skill: SkillType
  part: number
  title: string
  instructions?: string | null
  passageText?: string | null
  transcript?: string | null
  mediaIds?: string[]
  questionGroups?: TeacherQuestionGroup[]
  /** @deprecated Legacy */
  questionIds?: string[]
  /** @deprecated Legacy */
  questions: Array<Record<string, any>>
}

export interface TeacherExamDetail {
  id: string
  title: string
  description?: string | null
  durationMinutes: number
  status: "draft" | "published" | "closed"
  sections: TeacherExamSection[]
  openAt?: string | null
  closeAt?: string | null
}

export async function getTeacherExamDetailApi(examId: string): Promise<TeacherExamDetail> {
  const { data } = await apiClient<TeacherExamDetail>(`/api/exams/${examId}`)
  return data
}

export type { CandidateExam }
