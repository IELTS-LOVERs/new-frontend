"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getClassesApi,
  getClassDetailApi,
  joinClassApi,
  createClassApi,
  updateClassApi,
  deleteClassApi,
  addStudentToClassApi,
  removeStudentFromClassApi,
  leaveClassApi,
} from "@/lib/api/classes"

export function useClassesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.classes.list(),
    queryFn: getClassesApi,
    enabled,
    staleTime: 60_000,
  })
}

export function useClassDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.classes.detail(id),
    queryFn: () => getClassDetailApi(id),
    enabled: enabled && !!id,
    staleTime: 60_000,
  })
}

export function useJoinClassMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => joinClassApi(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.student() })
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() })
    },
  })
}

export function useCreateClassMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) => createClassApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useUpdateClassMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name?: string; description?: string }) => updateClassApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useDeleteClassMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClassApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useAddStudentMutation(classId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => addStudentToClassApi(classId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

export function useRemoveStudentMutation(classId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) => removeStudentFromClassApi(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.teacher() })
    },
  })
}

// REQ-002: học sinh tự rời lớp.
export function useLeaveClassMutation(classId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => leaveClassApi(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.student() })
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.my() })
    },
  })
}
