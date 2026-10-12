"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getPendingGradingApi,
  getAttemptGradingViewApi,
  gradeWritingApi,
  type GradeWritingPayload,
} from "@/lib/api/grading"

export function usePendingGradingQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.grading.pending(),
    queryFn: getPendingGradingApi,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useAttemptGradingViewQuery(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.grading.detail(attemptId),
    queryFn: () => getAttemptGradingViewApi(attemptId),
    enabled: enabled && !!attemptId,
    staleTime: 30_000,
  })
}

export function useGradeWritingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GradeWritingPayload) => gradeWritingApi(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.pending() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
      queryClient.invalidateQueries({ queryKey: queryKeys.attempts.result(payload.attemptId) })
      queryClient.invalidateQueries({ queryKey: ["assignments", "progress"] })
    },
  })
}
