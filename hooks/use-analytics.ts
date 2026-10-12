"use client"

import { useQuery, useQueries } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getStudentProgressApi,
  getClassAnalyticsApi,
  getExamAnalyticsApi,
} from "@/lib/api/analytics"

export function useStudentProgressQuery(studentId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics.studentProgress(studentId),
    queryFn: () => getStudentProgressApi(studentId),
    enabled,
    staleTime: 60_000,
  })
}

export function useClassAnalyticsQuery(classId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics.class(classId),
    queryFn: () => getClassAnalyticsApi(classId),
    enabled: enabled && !!classId,
    staleTime: 60_000,
  })
}

export function useClassAnalyticsQueries(classIds: string[], enabled = true) {
  return useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.analytics.class(classId),
      queryFn: () => getClassAnalyticsApi(classId),
      enabled: enabled && !!classId,
      staleTime: 60_000,
    })),
  })
}

export function useExamAnalyticsQuery(examId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics.exam(examId),
    queryFn: () => getExamAnalyticsApi(examId),
    enabled: enabled && !!examId,
    staleTime: 60_000,
  })
}
