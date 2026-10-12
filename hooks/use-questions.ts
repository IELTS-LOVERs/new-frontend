"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getQuestionsApi,
  getQuestionDetailApi,
  createQuestionApi,
  updateQuestionApi,
  deleteQuestionApi,
  type ListQuestionsParams,
  type CreateQuestionPayload,
} from "@/lib/api/questions"

export function useQuestionsQuery(params: ListQuestionsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.questions.list(params as Record<string, string | number | undefined>),
    queryFn: () => getQuestionsApi(params),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useQuestionDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.questions.detail(id),
    queryFn: () => getQuestionDetailApi(id),
    enabled: enabled && !!id,
    staleTime: 60_000,
  })
}

export function useCreateQuestionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateQuestionPayload) => createQuestionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
    },
  })
}

export function useUpdateQuestionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<CreateQuestionPayload>) => updateQuestionApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
    },
  })
}

export function useDeleteQuestionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteQuestionApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all })
    },
  })
}
