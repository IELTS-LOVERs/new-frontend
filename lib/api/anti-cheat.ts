import { apiClient } from "./client"
import type { AntiCheatEvent } from "./types"

export interface RecordAntiCheatEventPayload {
  attemptId: string
  type: AntiCheatEvent["type"]
  timestamp?: string
  metadata?: Record<string, unknown>
}

export async function recordAntiCheatEventApi(
  payload: RecordAntiCheatEventPayload
): Promise<{ recorded: boolean; suspiciousFlag: boolean }> {
  const { data } = await apiClient<{ recorded: boolean; suspiciousFlag: boolean }>(
    "/api/anti-cheat/events",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
  return data
}

export interface SuspiciousAttemptReport {
  attemptId: string
  studentName: string
  examTitle: string
  submittedAt: string
  totalEvents: number
  eventsByType: Record<string, number>
}

export async function getSuspiciousAttemptsApi(limit = 50): Promise<SuspiciousAttemptReport[]> {
  const { data } = await apiClient<SuspiciousAttemptReport[]>(
    `/api/anti-cheat/suspicious?limit=${limit}`
  )
  return data
}
