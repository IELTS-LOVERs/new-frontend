"use client"

import * as React from "react"
import { toast } from "sonner"
import { recordAntiCheatEventApi } from "@/lib/api/anti-cheat"
import type { AntiCheatEvent } from "@/lib/api/types"

/**
 * Anti-cheat hook: ghi nhận TAB_SWITCH, WINDOW_BLUR, FULLSCREEN_EXIT, COPY, PASTE, CUT, CONTEXT_MENU.
 * Khử trùng cùng loại trong 1s. Lỗi gửi được nuốt (không bao giờ chặn làm bài).
 */
export function useAntiCheat(attemptId: string | null, enabled = true) {
  const lastSentRef = React.useRef<Record<string, number>>({})

  const send = React.useCallback(
    (type: AntiCheatEvent["type"]) => {
      if (!attemptId || !enabled) return
      const now = Date.now()
      if (lastSentRef.current[type] && now - lastSentRef.current[type] < 1000) return
      lastSentRef.current[type] = now
      void recordAntiCheatEventApi({
        attemptId,
        type,
        timestamp: new Date(now).toISOString(),
      }).catch(() => {
        // giữ im lặng — không chặn làm bài vì lỗi gửi event
      })
    },
    [attemptId, enabled]
  )

  React.useEffect(() => {
    if (!attemptId || !enabled) return

    const onVisibility = () => {
      if (document.hidden) {
        send("TAB_SWITCH")
        toast.warning("Đã ghi nhận bạn rời phòng thi", {
          description: "Vui lòng tập trung làm bài ở chế độ toàn màn hình.",
        })
      }
    }

    let blurTimer: ReturnType<typeof setTimeout> | null = null
    const onBlur = () => {
      if (document.hidden) return
      blurTimer = setTimeout(() => send("WINDOW_BLUR"), 1000)
    }
    const onFocus = () => {
      if (blurTimer) clearTimeout(blurTimer)
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        send("FULLSCREEN_EXIT")
      }
    }

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      send("COPY")
      toast.warning("Không hỗ trợ sao chép trong phòng thi")
    }
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault()
      send("CUT")
    }
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      send("PASTE")
      toast.warning("Không hỗ trợ dán trong phòng thi")
    }
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      send("CONTEXT_MENU")
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("paste", onPaste)
    document.addEventListener("contextmenu", onContextMenu)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("contextmenu", onContextMenu)
      if (blurTimer) clearTimeout(blurTimer)
    }
  }, [attemptId, enabled, send])

  return { send }
}
