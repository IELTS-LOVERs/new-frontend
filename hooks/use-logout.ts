"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth.store"
import { logoutApi } from "@/lib/api/auth"

/**
 * Đăng xuất: gọi backend xoá cookie refresh, xoá token + cache client.
 */
export function useLogout() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      logout()
      queryClient.clear()
      router.replace("/login")
    },
  })
}
