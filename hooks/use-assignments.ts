"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getMyAssignmentsApi,
  getTeacherAssignmentsApi,
  createAssignmentApi,
  getAssignmentDetailApi,
  updateAssignmentApi,
  deleteAssignmentApi,
  getAssignmentProgressApi,
  type CreateAssignmentPayload,
  type ListAssignmentsParams,
  type MyAssignmentsParams,
} from "@/lib/api/assignments"

export function useMyAssignmentsQuery(params: MyAssignmentsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assignments.my(params),
    queryFn: () => getMyAssignmentsApi(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useTeacherAssignmentsQuery(params: ListAssignmentsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assignments.teacher(params),
    queryFn: () => getTeacherAssignmentsApi(params),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useAssignmentDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assignments.detail(id),
    queryFn: () => getAssignmentDetailApi(id),
    enabled: enabled && !!id,
    staleTime: 30_000,
  })
}

export function useAssignmentProgressQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assignments.progress(id),
    queryFn: () => getAssignmentProgressApi(id),
    enabled: enabled && !!id,
    staleTime: 30_000,
  })
}

export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => createAssignmentApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

type UpdateAssignmentPayload = Parameters<typeof updateAssignmentApi>[1]

export function useUpdateAssignmentMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateAssignmentPayload & { id?: string }) =>
      updateAssignmentApi(payload.id ?? id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useDeleteAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAssignmentApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
