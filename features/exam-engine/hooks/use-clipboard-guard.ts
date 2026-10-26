"use client"

import * as React from "react"
import { toast } from "sonner"

export type ClipboardAction = "COPY" | "CUT" | "PASTE"

const ACTION_LABEL: Record<ClipboardAction, string> = {
  COPY: "sao chép",
  CUT: "cắt",
  PASTE: "dán",
}

/**
 * #10: block copy / cut / paste while still allowing text selection so students
 * can highlight and take notes. Mock exams keep their own anti-cheat listeners
 * (which also record COPY/CUT/PASTE events), so this hook is only enabled for
 * practice exams with `disableTextSelection` turned on.
 *
 * @param enabled whether clipboard actions should be blocked
 * @param onBlocked optional callback, e.g. to log a mock anti-cheat event
 */
export function useClipboardGuard(
  enabled: boolean,
  onBlocked?: (action: ClipboardAction) => void
) {
  const lastToastRef = React.useRef(0)
  const onBlockedRef = React.useRef(onBlocked)

  React.useLayoutEffect(() => {
    onBlockedRef.current = onBlocked
  }, [onBlocked])

  React.useEffect(() => {
    if (!enabled || typeof document === "undefined") return

    const block = (action: ClipboardAction) => (event: ClipboardEvent) => {
      event.preventDefault()
      onBlockedRef.current?.(action)

      const now = Date.now()
      if (now - lastToastRef.current < 2000) return
      lastToastRef.current = now

      toast.warning(`Không thể ${ACTION_LABEL[action]} trong bài thi`, {
        description: "Bạn vẫn có thể bôi đen để highlight hoặc ghi chú.",
      })
    }

    const onCopy = block("COPY")
    const onCut = block("CUT")
    const onPaste = block("PASTE")

    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("paste", onPaste)

    return () => {
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("paste", onPaste)
    }
  }, [enabled])
}
