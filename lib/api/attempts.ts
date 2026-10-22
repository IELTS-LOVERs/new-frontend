import { apiClient } from "./client"
import type {
  AntiCheatEvent,
  AttemptResult,
  CandidateExam,
  StartAttemptResponse,
  AttemptRecoveryResponse,
  AttemptScores,
  SubmissionStatus,
} from "./types"

export interface CreateAttemptPayload {
  examId: string
  assignmentId?: string
}

export async function startAttemptApi(payload: CreateAttemptPayload): Promise<StartAttemptResponse> {
  const { data } = await apiClient<StartAttemptResponse>("/api/attempts", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 30000,
  })
  return data
}

export interface ListMyAttemptsParams {
  page?: number
  limit?: number
  status?: SubmissionStatus
  examId?: string
}

export interface MyAttemptItem {
  id: string
  exam: { id: string; title: string; durationMinutes: number; skills?: string[]; kind?: "practice" | "mock" }
  assignmentId: string | null
  startedAt: string
  expiresAt: string
  submittedAt: string | null
  status: SubmissionStatus
  scores: AttemptScores
  suspicious?: boolean
  examKind?: "practice" | "mock"
  scoringMode?: "band" | "raw"
  totalPoints?: number
  rawScore?: number
  percentage?: number
  correctCount?: number
  wrongCount?: number
  blankCount?: number
}

export interface ListMyAttemptsResult {
  items: MyAttemptItem[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

export async function getMyAttemptsApi(
  params: ListMyAttemptsParams = {}
): Promise<ListMyAttemptsResult> {
  const search = new URLSearchParams()
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  if (params.status) search.set("status", params.status)
  if (params.examId) search.set("examId", params.examId)
  const qs = search.toString()
  const { data } = await apiClient<ListMyAttemptsResult>(`/api/attempts/my${qs ? `?${qs}` : ""}`)
  return data
}

export async function getAttemptRecoveryApi(attemptId: string): Promise<AttemptRecoveryResponse> {
  const { data } = await apiClient<AttemptRecoveryResponse>(`/api/attempts/${attemptId}`)
  return data
}

export interface SaveAnswersPayload {
  answers: Array<{ questionId: string; value: string }>
}

export interface SaveAnswersResponse {
  savedCount: number
  serverRemainingSeconds: number
}

export async function saveAttemptAnswersApi(
  attemptId: string,
  payload: SaveAnswersPayload,
  options: { keepalive?: boolean } = {}
): Promise<SaveAnswersResponse> {
  const { data } = await apiClient<SaveAnswersResponse>(`/api/attempts/${attemptId}/answers`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    keepalive: options.keepalive,
  })
  return data
}

export interface SubmitAttemptResponse {
  attemptId: string
  status: "submitted" | "expired"
  submittedAt: string
  scores: AttemptScores
  message?: string
}

export async function submitAttemptApi(attemptId: string): Promise<SubmitAttemptResponse> {
  const { data } = await apiClient<SubmitAttemptResponse>(`/api/attempts/${attemptId}/submit`, {
    method: "POST",
    timeoutMs: 30000,
  })
  return data
}

export async function getAttemptResultApi(attemptId: string): Promise<AttemptResult> {
  const { data } = await apiClient<AttemptResult>(`/api/attempts/${attemptId}/result`)
  return data
}

export interface AttemptEventsResult {
  attemptId: string
  suspicious: boolean
  summary: {
    totalEvents: number
    tabSwitchOrBlur: number
    fullscreenExit: number
    paste: number
    copy: number
    cut: number
    reload: number
    contextMenu: number
    interruption: number
    suspicious: boolean
  }
  events: AntiCheatEvent[]
}

export async function getAttemptEventsApi(attemptId: string): Promise<AttemptEventsResult> {
  const { data } = await apiClient<AttemptEventsResult>(`/api/attempts/${attemptId}/events`)
  return data
}

export async function getExamDetailApi(examId: string): Promise<CandidateExam> {
  const { data } = await apiClient<CandidateExam>(`/api/exams/${examId}`)
  return data
}
