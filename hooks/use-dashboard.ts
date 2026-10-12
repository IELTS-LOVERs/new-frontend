"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import { getStudentDashboardApi, getTeacherDashboardApi } from "@/lib/api/dashboard"

export function useStudentDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.student(),
    queryFn: getStudentDashboardApi,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useTeacherDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.teacher(),
    queryFn: getTeacherDashboardApi,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
