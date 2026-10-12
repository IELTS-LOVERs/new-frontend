"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getExamsApi,
  createExamApi,
  updateExamApi,
  deleteExamApi,
  cloneExamApi,
  publishExamApi,
  unpublishExamApi,
  closeExamApi,
  getTeacherExamDetailApi,
  type ListExamsParams,
  type CreateExamPayload,
} from "@/lib/api/exams"
import { getExamDetailApi } from "@/lib/api/attempts"

export function useExamsQuery(params: ListExamsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.exams.list(params as Record<string, string | number | undefined>),
    queryFn: () => getExamsApi(params),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useExamDetailQuery(examId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.exams.detail(examId),
    queryFn: () => getExamDetailApi(examId),
    enabled: enabled && !!examId,
    staleTime: 60_000,
  })
}

export function useTeacherExamDetailQuery(examId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.exams.detail(examId),
    queryFn: () => getTeacherExamDetailApi(examId),
    enabled: enabled && !!examId,
    staleTime: Number.POSITIVE_INFINITY, // Builder là source of truth cho tới khi lưu
  })
}

export function useCreateExamMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateExamPayload) => createExamApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useUpdateExamMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<CreateExamPayload>) => updateExamApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useDeleteExamMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteExamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useCloneExamMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cloneExamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function usePublishExamMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => publishExamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useUnpublishExamMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unpublishExamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useCloseExamMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => closeExamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}
