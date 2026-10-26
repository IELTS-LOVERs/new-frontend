"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import { useAuthStore } from "@/stores/auth.store"
import {
  loginApi,
  registerApi,
  logoutApi,
  changePasswordApi,
  getMeApi,
  updateMeApi,
  type RegisterPayload,
  type ChangePasswordPayload,
} from "@/lib/api/auth"
import type { User } from "@/lib/api/types"
import { SESSION_REPLACED_FLAG } from "@/lib/auth-session"

export function useMeQuery(enabled = true) {
  const { accessToken } = useAuthStore()
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMeApi,
    enabled: enabled && !!accessToken,
    staleTime: 60_000,
  })
}

export function useLoginMutation() {
  const { setAuth } = useAuthStore()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      // #1: let the notice component show a one-time banner on this device.
      if (data.sessionReplaced && typeof window !== "undefined") {
        window.sessionStorage.setItem(SESSION_REPLACED_FLAG, "1")
        window.dispatchEvent(new Event("auth:session-replaced"))
      }
    },
  })
}

export function useRegisterMutation() {
  const { setAuth } = useAuthStore()
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
    },
  })
}

export function useLogoutMutation() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      logout()
      queryClient.clear()
    },
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePasswordApi(payload),
  })
}

export function useUpdateMeMutation() {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateMeApi>[0]) => updateMeApi(payload),
    onSuccess: (user: User) => {
      setUser(user)
      queryClient.setQueryData(queryKeys.auth.me, user)
    },
  })
}
