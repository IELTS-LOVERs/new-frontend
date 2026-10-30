"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  addExamsToCollectionApi,
  createCollectionApi,
  deleteCollectionApi,
  getCollectionDetailApi,
  getCollectionsApi,
  getCollectionTreeApi,
  removeExamFromCollectionApi,
  reorderExamsInCollectionApi,
  updateCollectionApi,
  updateExamInCollectionApi,
  type AddExamsToCollectionPayload,
  type CreateCollectionPayload,
  type ListCollectionsParams,
  type ReorderExamsInCollectionPayload,
  type UpdateCollectionPayload,
  type UpdateExamInCollectionPayload,
} from "@/lib/api/collections"

export function useCollectionsQuery(params: ListCollectionsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.collections.list(params as Record<string, unknown>),
    queryFn: () => getCollectionsApi(params),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useCollectionTreeQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.collections.tree(),
    queryFn: () => getCollectionTreeApi(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCollectionDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.collections.detail(id),
    queryFn: () => getCollectionDetailApi(id),
    enabled: enabled && !!id,
    staleTime: 30_000,
  })
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCollectionPayload) => createCollectionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useUpdateCollectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCollectionPayload }) =>
      updateCollectionApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCollectionApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useAddExamsToCollectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddExamsToCollectionPayload }) =>
      addExamsToCollectionApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useReorderExamsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReorderExamsInCollectionPayload }) =>
      reorderExamsInCollectionApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useRemoveExamFromCollectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, examId }: { id: string; examId: string }) =>
      removeExamFromCollectionApi(id, examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useUpdateExamInCollectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      examId,
      payload,
    }: {
      id: string
      examId: string
      payload: UpdateExamInCollectionPayload
    }) => updateExamInCollectionApi(id, examId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}
