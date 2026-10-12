import { apiClient } from "./client"
import type { PendingWritingSubmission, AttemptGradingView } from "./types"

export async function getPendingGradingApi(): Promise<{
  items: PendingWritingSubmission[]
  totalPending: number
}> {
  const { data, meta } = await apiClient<PendingWritingSubmission[]>("/api/grading/pending")
  return { items: data, totalPending: meta?.totalPending ?? data.length }
}

export async function getAttemptGradingViewApi(attemptId: string): Promise<AttemptGradingView> {
  const { data } = await apiClient<AttemptGradingView>(`/api/attempts/${attemptId}/grading`)
  return data
}

export interface GradeWritingPayload {
  attemptId: string
  task1?: { score: number; comment?: string }
  task2?: { score: number; comment?: string }
  generalFeedback?: string
}

export interface GradeWritingResult {
  id: string
  attemptId: string
  task1Score?: number
  task2Score?: number
  overallWritingScore: number
  attemptOverallBand: number
}

export async function gradeWritingApi(payload: GradeWritingPayload): Promise<GradeWritingResult> {
  const { data } = await apiClient<GradeWritingResult>("/api/writing-reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}
