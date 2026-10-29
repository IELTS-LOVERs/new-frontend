import { apiClient } from "./client"
import type {
  ExamListItem,
  CandidateExam,
  SkillType,
  QuestionGroupType,
  QuestionGroupConfig,
  MediaItem,
  ExamKind,
  ExamScoringMode,
  BandConversion,
  BandThreshold,
  IExamCurriculum,
  IExamPostSubmissionResources,
  RichDoc,
} from "./types"
import type { PaginatedMeta } from "./assignments"

export type ExamListSort =
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "title_desc"
  | "collection_asc"

export interface ListExamsParams {
  status?: "draft" | "published" | "closed"
  kind?: "practice" | "mock"
  skill?: SkillType
  collectionName?: string
  search?: string
  sort?: ExamListSort
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
  if (params.kind) search.set("kind", params.kind)
  if (params.skill) search.set("skill", params.skill)
  if (params.collectionName) search.set("collectionName", params.collectionName)
  if (params.search) search.set("search", params.search)
  if (params.sort) search.set("sort", params.sort)
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
  promptDoc?: RichDoc | null
  acceptedAnswers?: string[]
  points?: number
  explanation?: string
  mediaIds?: string[]
}

export interface QuestionGroupPayload {
  _id?: string
  groupType: QuestionGroupType
  instructions?: string
  instructionsDoc?: RichDoc | null
  config?: QuestionGroupConfig
  questions?: QuestionItemPayload[]
}

export interface CreateExamSectionPayload {
  _id?: string
  skill: SkillType
  part: number
  title?: string
  instructions?: string
  instructionsDoc?: RichDoc | null
  passageText?: string
  passageDoc?: RichDoc | null
  transcript?: string
  mediaIds?: string[]
  questionGroups?: QuestionGroupPayload[]
}

export interface CreateExamPayload {
  title: string
  description?: string
  bannerUrl?: string | null
  durationMinutes?: number
  sections: CreateExamSectionPayload[]
  openAt?: string
  closeAt?: string
  kind?: ExamKind
  scoringMode?: ExamScoringMode
  bandConversion?: BandConversion
  disableTextSelection?: boolean
  curriculum?: IExamCurriculum
  postSubmissionResources?: IExamPostSubmissionResources
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
  bannerUrl?: string | null
  disableTextSelection?: boolean
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

export interface DeleteExamResult {
  message: string
  deletedAssignments: number
  deletedAttempts: number
  /** Attempts that were still in progress when an admin force deleted. */
  deletedActiveAttempts?: number
}

export async function deleteExamApi(
  id: string,
  options: { force?: boolean } = {}
): Promise<DeleteExamResult> {
  const qs = options.force ? "?force=true" : ""
  const { data } = await apiClient<DeleteExamResult>(`/api/exams/${id}${qs}`, {
    method: "DELETE",
  })
  return data
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

export async function reopenExamApi(
  id: string
): Promise<{ id: string; status: string; clearedCloseAt?: boolean }> {
  const { data } = await apiClient<{ id: string; status: string; clearedCloseAt?: boolean }>(
    `/api/exams/${id}/reopen`,
    { method: "PATCH" }
  )
  return data
}

export async function convertExamToDraftApi(
  id: string
): Promise<{ id: string; status: "draft" }> {
  const { data } = await apiClient<{ id: string; status: "draft" }>(
    `/api/exams/${id}/to-draft`,
    { method: "PATCH" }
  )
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
  promptDoc?: RichDoc | null
  acceptedAnswers: string[]
  points: number
  explanation?: string | null
  mediaIds?: string[]
}

export interface TeacherQuestionGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  instructionsDoc?: RichDoc | null
  config: QuestionGroupConfig
  /** Resolved group-level image (config.imageMediaId) with a presigned URL. */
  media?: MediaItem[]
  questions: TeacherQuestionItem[]
}

export interface TeacherExamSection {
  id?: string
  skill: SkillType
  part: number
  title: string
  instructions?: string | null
  instructionsDoc?: RichDoc | null
  passageText?: string | null
  passageDoc?: RichDoc | null
  transcript?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
  questionGroups?: TeacherQuestionGroup[]
}

export interface TeacherExamDetail {
  id: string
  title: string
  description?: string | null
  bannerUrl?: string | null
  durationMinutes: number
  status: "draft" | "published" | "closed"
  kind?: ExamKind
  scoringMode?: ExamScoringMode
  bandConversion?: BandConversion
  disableTextSelection?: boolean
  bandConversionDefaults?: {
    listening: BandThreshold[]
    readingAcademic: BandThreshold[]
    readingGeneral: BandThreshold[]
  }
  curriculum?: IExamCurriculum
  postSubmissionResources?: IExamPostSubmissionResources
  sections: TeacherExamSection[]
  openAt?: string | null
  closeAt?: string | null
  /** Teacher view: true when at least one student has attempted this exam. */
  hasAttempts?: boolean
  /** Teacher view: true when the exam is assigned to at least one class. */
  hasAssignments?: boolean
  /** Total attempts ever started (teacher view). */
  attemptsCount?: number
  /** Attempts currently in progress (teacher view). */
  activeAttemptsCount?: number
  /** Bumped when candidate-visible content changes. */
  contentRevision?: number
}

export async function getTeacherExamDetailApi(examId: string): Promise<TeacherExamDetail> {
  const { data } = await apiClient<TeacherExamDetail>(`/api/exams/${examId}`)
  return data
}

export type { CandidateExam }
