"use client"

import * as React from "react"
import { getAttemptExamApi, getAttemptRevisionApi } from "@/lib/api/attempts"
import { useExamSessionStore } from "@/stores/exam-session.store"

/** How often to poll the lightweight revision endpoint while the tab is visible. */
export const EXAM_CONTENT_POLL_INTERVAL_MS = 10_000

export interface ExamContentUpdateEvent {
  revision: number
  addedQuestions: number
  removedQuestions: number
  sectionsChanged: boolean
  activeQuestionRemoved: boolean
  /** Epoch ms when the new content was applied. */
  at: number
}

interface UseExamContentSyncOptions {
  enabled?: boolean
  onUpdate?: (event: ExamContentUpdateEvent) => void
}

/**
 * Live content sync for students taking an exam.
 *
 * Polls `GET /attempts/:id/revision` (cheap) every 10s while the tab is
 * visible. When the teacher edits the exam, `revision` changes and the hook
 * downloads the new candidate exam and swaps it into the session store without
 * resetting answers, flags, highlights or the timer.
 */
export function useExamContentSync(
  attemptId: string | null,
  options: UseExamContentSyncOptions = {}
): void {
  const { enabled = true } = options
  const examRevision = useExamSessionStore((s) => s.examRevision)
  const phase = useExamSessionStore((s) => s.phase)
  const onUpdateRef = React.useRef(options.onUpdate)

  React.useEffect(() => {
    onUpdateRef.current = options.onUpdate
  }, [options.onUpdate])

  const inFlightRef = React.useRef(false)

  React.useEffect(() => {
    if (!attemptId || !enabled) return
    if (phase !== "active" && phase !== "offline") return

    let cancelled = false

    async function checkForUpdate() {
      if (cancelled || inFlightRef.current) return
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return
      }

      inFlightRef.current = true
      try {
        const latest = await getAttemptRevisionApi(attemptId!)
        if (cancelled) return
        if (latest.status !== "in_progress") return

        const currentRevision = useExamSessionStore.getState().examRevision
        if (latest.revision === currentRevision) return

        const content = await getAttemptExamApi(attemptId!)
        if (cancelled) return

        const summary = useExamSessionStore
          .getState()
          .applyExamUpdate(content.exam, content.revision)

        onUpdateRef.current?.({
          revision: content.revision,
          ...summary,
          at: Date.now(),
        })
      } catch {
        // Transient network error: keep the current content and retry next tick.
      } finally {
        inFlightRef.current = false
      }
    }

    const timer = window.setInterval(() => {
      void checkForUpdate()
    }, EXAM_CONTENT_POLL_INTERVAL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    // Check immediately so a student who just recovered an outdated snapshot
    // gets the latest content without waiting a full interval.
    void checkForUpdate()

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [attemptId, enabled, phase, examRevision])
}
