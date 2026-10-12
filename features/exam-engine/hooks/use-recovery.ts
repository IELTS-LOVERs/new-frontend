"use client"

import * as React from "react"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { loadAttemptSnapshot, clearAttemptSnapshot } from "../lib/idb"
import { getAttemptRecoveryApi } from "@/lib/api/attempts"
import { recordAntiCheatEventApi } from "@/lib/api/anti-cheat"

/**
 * Recovery khi F5 / mở lại attempt:
 * 1. Đọc IndexedDB snapshot (local, có dirty)
 * 2. GET /attempts/:id → server answers + remainingSeconds
 * 3. Merge: local dirty thắng, còn lại lấy server
 * 4. Ghi lại IndexedDB, flush các câu dirty ngay
 * 5. Ghi event RELOAD / INTERRUPTION khi phù hợp
 */
export function useExamRecovery(attemptId: string | null) {
  const init = useExamSessionStore((s) => s.init)
  const setPhase = useExamSessionStore((s) => s.setPhase)
  const setAnswer = useExamSessionStore((s) => s.setAnswer)
  const setActiveSectionIndex = useExamSessionStore((s) => s.setActiveSectionIndex)

  const [status, setStatus] = React.useState<"loading" | "done" | "error" | "finished">("loading")
  const [error, setError] = React.useState<string | null>(null)
  const [needsGesture, setNeedsGesture] = React.useState(false)

  React.useEffect(() => {
    if (!attemptId) return
    let cancelled = false

    async function run() {
      try {
        const [local, server] = await Promise.all([
          loadAttemptSnapshot(attemptId!),
          getAttemptRecoveryApi(attemptId!),
        ])

        if (cancelled) return

        if (server.status === "submitted" || server.status === "expired") {
          await clearAttemptSnapshot(attemptId!)
          setStatus("finished")
          setPhase("finished")
          return
        }

        // Merge: server answers trước
        init(attemptId!, server.exam, server.remainingSeconds)
        for (const a of server.answers) {
          setAnswer(a.questionId, a.value)
          // mark synced ngay
          useExamSessionStore.getState().markAnswersSynced([a.questionId], Date.now())
        }

        // local dirty ghi đè
        if (local) {
          for (const [qid, la] of Object.entries(local.answers)) {
            if (la.dirty) {
              setAnswer(qid, la.value)
            }
          }
          for (const qid of Object.keys(local.flagged ?? {})) {
            useExamSessionStore.getState().toggleFlag(qid)
          }
        }

        // Reload / Interruption event
        const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
        const navType = navEntries?.[0]?.type
        const sessionMarker = sessionStorage.getItem(`exam-session:${attemptId}`)
        if (navType === "reload") {
          void recordAntiCheatEventApi({ attemptId: attemptId!, type: "RELOAD" }).catch(() => {})
        } else if (!sessionMarker) {
          void recordAntiCheatEventApi({ attemptId: attemptId!, type: "INTERRUPTION" }).catch(() => {})
        }
        sessionStorage.setItem(`exam-session:${attemptId}`, "1")

        // Fullscreen cần user gesture sau F5
        if (!document.fullscreenElement) {
          setNeedsGesture(true)
          setPhase("resumeGate")
        } else {
          setPhase("active")
        }

        setStatus("done")
      } catch (err) {
        if (cancelled) return
        setStatus("error")
        setError(err instanceof Error ? err.message : "Không thể khôi phục bài làm.")
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [attemptId, init, setPhase, setAnswer, setActiveSectionIndex])

  const confirmResume = React.useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    setNeedsGesture(false)
    setPhase("active")
  }, [setPhase])

  return { status, error, needsGesture, confirmResume }
}
