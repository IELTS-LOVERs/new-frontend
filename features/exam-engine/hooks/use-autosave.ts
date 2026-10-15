"use client"

import * as React from "react"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { saveAttemptAnswersApi } from "@/lib/api/attempts"
import { saveAttemptSnapshot } from "../lib/idb"
import { ApiError } from "@/lib/api/client"

export interface UseAutosaveOptions {
  /**
   * FIX-10: called once when the server reports the attempt is already over
   * (EXAM_EXPIRED / EXAM_ALREADY_SUBMITTED). The exam page uses this to trigger
   * the real submit/redirect flow instead of getting stuck on "Đang nộp…".
   */
  onFatal?: () => void
}

/**
 * Autosave pipeline:
 * - onChange → ghi store + IndexedDB (ngay, không throttle)
 * - debounce 2s → flush batch dirty answers lên server
 * - Tối đa 10s kể từ thay đổi đầu tiên
 * - Retry backoff 2s/4s/8s/... tối đa 30s khi lỗi mạng/5xx
 * - 429: chờ 10s
 * - EXAM_EXPIRED / EXAM_ALREADY_SUBMITTED: dừng autosave, chuyển phase + onFatal()
 */
export function useAutosave(
  attemptId: string | null,
  options: UseAutosaveOptions = {}
) {
  const answers = useExamSessionStore((s) => s.answers)
  const phase = useExamSessionStore((s) => s.phase)
  const setSaveStatus = useExamSessionStore((s) => s.setSaveStatus)
  const markAnswersSynced = useExamSessionStore((s) => s.markAnswersSynced)
  const resyncTimer = useExamSessionStore((s) => s.resyncTimer)
  const setPhase = useExamSessionStore((s) => s.setPhase)

  const inFlightRef = React.useRef(false)
  const flushAgainRef = React.useRef(false)
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstChangeAtRef = React.useRef<number | null>(null)
  const retryDelayRef = React.useRef(2000)
  const flushRef = React.useRef<(options?: { keepalive?: boolean }) => Promise<void>>(
    async () => {}
  )
  const onFatalRef = React.useRef<(() => void) | undefined>(options.onFatal)

  // Keep the latest callback without writing to the ref during render.
  React.useEffect(() => {
    onFatalRef.current = options.onFatal
  }, [options.onFatal])

  async function flush(flushOptions?: { keepalive?: boolean }) {
    if (!attemptId || inFlightRef.current) {
      flushAgainRef.current = true
      return
    }

    const state = useExamSessionStore.getState()
    const dirtyEntries = Object.entries(state.answers).filter(([, a]) => a.dirty)
    if (dirtyEntries.length === 0) {
      setSaveStatus(state.lastSavedAt ? "saved" : "idle")
      return
    }

    inFlightRef.current = true
    setSaveStatus("saving")
    const sentAt = Date.now()
    const payload = {
      answers: dirtyEntries.map(([questionId, a]) => ({ questionId, value: a.value })),
    }
    const sentIds = dirtyEntries.map(([id]) => id)

    try {
      const res = flushOptions?.keepalive
        ? await saveAttemptAnswersApi(attemptId, payload, { keepalive: true })
        : await saveAttemptAnswersApi(attemptId, payload)
      markAnswersSynced(sentIds, sentAt)
      resyncTimer(res.serverRemainingSeconds)
      setSaveStatus("saved")
      retryDelayRef.current = 2000
      firstChangeAtRef.current = null
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EXAM_EXPIRED" || err.code === "EXAM_ALREADY_SUBMITTED") {
          setPhase("submitting")
          inFlightRef.current = false
          // FIX-10: hand control back to the page so it can finalize/redirect.
          onFatalRef.current?.()
          return
        }
        if (err.status === 429) {
          retryDelayRef.current = 10_000
        } else if (err.status >= 500 || err.status === 0) {
          setSaveStatus("offline")
        } else {
          setSaveStatus("error")
        }
      } else {
        setSaveStatus("offline")
      }
      // Chỉ retry với lỗi tạm thời (mạng rớt status 0, server 5xx, rate limit 429)
      const isTransient =
        !(err instanceof ApiError) ||
        err.status === 0 ||
        err.status === 429 ||
        err.status >= 500

      if (isTransient) {
        const delay = retryDelayRef.current
        retryDelayRef.current = Math.min(delay * 2, 30_000)
        setTimeout(() => {
          void flushRef.current()
        }, delay)
      }
    } finally {
      inFlightRef.current = false
      if (flushAgainRef.current) {
        flushAgainRef.current = false
        void flushRef.current()
      }
    }
  }

  React.useEffect(() => {
    flushRef.current = flush
  })

  // Khi answers thay đổi → debounce 2s; nếu đã 10s kể từ thay đổi đầu tiên → flush ngay
  React.useEffect(() => {
    if (phase !== "active" && phase !== "offline") return
    const dirtyCount = Object.values(answers).filter((a) => a.dirty).length
    if (dirtyCount === 0) return

    const now = Date.now()
    if (firstChangeAtRef.current === null) firstChangeAtRef.current = now

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    const elapsed = now - firstChangeAtRef.current
    const wait = elapsed >= 10_000 ? 0 : 2_000

    debounceTimerRef.current = setTimeout(() => {
      void flushRef.current()
    }, wait)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [answers, phase])

  // FIX-06: ghi snapshot vào IndexedDB NGAY khi answers đổi (không throttle), để
  // F5/đóng tab trong vòng vài ms vẫn còn dữ liệu local.
  React.useEffect(() => {
    if (!attemptId) return
    const state = useExamSessionStore.getState()
    void saveAttemptSnapshot(attemptId, {
      answers: state.answers,
      flagged: state.flagged,
      savedAt: Date.now(),
    })
  }, [answers, attemptId])

  // flush khi tab ẩn / đóng
  React.useEffect(() => {
    if (!attemptId) return
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushRef.current()
    }
    // FIX-06: keepalive keeps the authenticated request alive through unload
    // (unlike sendBeacon it can still send the Authorization header).
    const onPageHide = () => void flushRef.current({ keepalive: true })
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [attemptId])

  return { flush }
}
