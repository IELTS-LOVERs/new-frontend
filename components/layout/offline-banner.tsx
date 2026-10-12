"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { WifiOff01Icon } from "@hugeicons/core-free-icons"

export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false)

  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-medium text-white">
      <HugeiconsIcon icon={WifiOff01Icon} size={14} />
      Mất kết nối mạng. Dữ liệu đang được lưu an toàn trên máy và sẽ đồng bộ khi có mạng trở lại.
    </div>
  )
}
