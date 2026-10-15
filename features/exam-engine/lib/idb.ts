"use client"

import { get, set, del } from "idb-keyval"
import type { ExamHighlightItem } from "./highlight"

const key = (attemptId: string) => `attempt:${attemptId}`

export interface AttemptSnapshot {
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  highlights?: ExamHighlightItem[]
  savedAt: number
}

export async function saveAttemptSnapshot(attemptId: string, snapshot: AttemptSnapshot) {
  try {
    await set(key(attemptId), snapshot)
  } catch {
    // bỏ qua lỗi IndexedDB (quota đầy, private mode)
  }
}

export async function loadAttemptSnapshot(attemptId: string): Promise<AttemptSnapshot | null> {
  try {
    const v = await get<AttemptSnapshot>(key(attemptId))
    return v ?? null
  } catch {
    return null
  }
}

export async function clearAttemptSnapshot(attemptId: string) {
  try {
    await del(key(attemptId))
  } catch {
    // bỏ qua
  }
}
