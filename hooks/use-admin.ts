"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getSuspiciousAttemptsApi,
} from "@/lib/api/anti-cheat"
import {
  getUsersApi,
  createUserApi,
  updateUserStatusApi,
  resetUserPasswordApi,
  revokeUserSessionsApi,
  type ListUsersParams,
  type CreateUserPayload,
} from "@/lib/api/users"
import type { UserStatus } from "@/lib/api/types"

export function useSuspiciousAttemptsQuery(limit = 50, enabled = true) {
  return useQuery({
    queryKey: queryKeys.antiCheat.suspicious(limit),
    queryFn: () => getSuspiciousAttemptsApi(limit),
    enabled,
    staleTime: 30_000,
  })
}

export function useUsersQuery(params: ListUsersParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["users", params] as const,
    queryFn: () => getUsersApi(params),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useResetUserPasswordMutation() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPasswordApi(id, newPassword),
  })
}

export function useRevokeUserSessionsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeUserSessionsApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
