"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  startAttemptApi,
  getMyAttemptsApi,
  getAttemptRecoveryApi,
  saveAttemptAnswersApi,
  submitAttemptApi,
  getAttemptResultApi,
  getAttemptEventsApi,
  type CreateAttemptPayload,
  type SaveAnswersPayload,
  type ListMyAttemptsParams,
} from "@/lib/api/attempts"

export function useMyAttemptsQuery(params: ListMyAttemptsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attempts.my(params as Record<string, string | number | undefined>),
    queryFn: () => getMyAttemptsApi(params),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useAttemptRecoveryQuery(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attempts.detail(attemptId),
    queryFn: () => getAttemptRecoveryApi(attemptId),
    enabled: enabled && !!attemptId,
    staleTime: 0,
    retry: 0,
    refetchOnWindowFocus: false,
  })
}

export function useAttemptResultQuery(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attempts.result(attemptId),
    queryFn: () => getAttemptResultApi(attemptId),
    enabled: enabled && !!attemptId,
    staleTime: 60_000,
  })
}

export function useAttemptEventsQuery(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attempts.events(attemptId),
    queryFn: () => getAttemptEventsApi(attemptId),
    enabled: enabled && !!attemptId,
    staleTime: 30_000,
  })
}

export function useStartAttemptMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAttemptPayload) => startAttemptApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
      queryClient.invalidateQueries({ queryKey: ["attempts"] })
    },
  })
}

export function useSaveAnswersMutation(attemptId: string) {
  return useMutation({
    mutationFn: (payload: SaveAnswersPayload) => saveAttemptAnswersApi(attemptId, payload),
  })
}

export function useSubmitAttemptMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attemptId: string) => submitAttemptApi(attemptId),
    onSuccess: (_data, attemptId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.student() })
      queryClient.invalidateQueries({ queryKey: ["attempts"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts.result(attemptId) })
    },
  })
}
