"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getPracticeCatalogApi,
  getPracticeHeatmapApi,
  getClassWeeklyReportApi,
  updateExamResourcesApi,
  updateExamCurriculumApi,
  type PracticeCatalogParams,
  type PracticeHeatmapParams,
  type WeeklyReportParams,
} from "@/lib/api/practice"
import type { IExamCurriculum, IExamPostSubmissionResources } from "@/lib/api/types"

export function usePracticeCatalogQuery(
  params: PracticeCatalogParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.practice.catalog(params),
    queryFn: () => getPracticeCatalogApi(params),
    enabled,
    staleTime: 30_000,
  })
}

export function usePracticeHeatmapQuery(
  params: PracticeHeatmapParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.practice.heatmap(params),
    queryFn: () => getPracticeHeatmapApi(params),
    enabled,
    staleTime: 60_000,
  })
}

export function useClassWeeklyReportQuery(
  classId: string,
  params: WeeklyReportParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.practice.weeklyReport(classId, params),
    queryFn: () => getClassWeeklyReportApi(classId, params),
    enabled: Boolean(classId) && enabled,
    staleTime: 30_000,
  })
}

export function useUpdateExamResourcesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      examId,
      payload,
    }: {
      examId: string
      payload: Partial<IExamPostSubmissionResources>
    }) => updateExamResourcesApi(examId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(variables.examId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}

export function useUpdateExamCurriculumMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      examId,
      payload,
    }: {
      examId: string
      payload: Partial<IExamCurriculum>
    }) => updateExamCurriculumApi(examId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(variables.examId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all })
    },
  })
}
