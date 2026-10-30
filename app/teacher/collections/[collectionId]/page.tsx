"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function CollectionIdRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const collectionId = params.collectionId as string

  useEffect(() => {
    if (collectionId) {
      router.replace(`/teacher/collections?c=${collectionId}`)
    } else {
      router.replace("/teacher/collections")
    }
  }, [collectionId, router])

  return (
    <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
      Đang chuyển hướng tới trang quản lý bộ đề...
    </div>
  )
}
