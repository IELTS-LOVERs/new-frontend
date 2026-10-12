"use client"

import * as React from "react"
import { useExamSessionStore } from "@/stores/exam-session.store"

/**
 * Timer đếm ngược: dùng deadlineMono (performance.now-based) đồng bộ từ server.
 * Cập nhật mỗi 250ms; khi resync từ server, lệch > 2s sẽ nhảy về giá trị server.
 */
export function useExamTimer(onExpire?: () => void) {
  const deadlineMono = useExamSessionStore((s) => s.deadlineMono)
  const phase = useExamSessionStore((s) => s.phase)
  const [secondsLeft, setSecondsLeft] = React.useState<number>(0)
  const expiredRef = React.useRef(false)

  React.useEffect(() => {
    if (deadlineMono === null) return
    expiredRef.current = false

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMono - performance.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadlineMono, onExpire])

  return { secondsLeft, isActive: phase === "active" }
}
