import { apiClient, downloadCsv } from "./client"
import type {
  PracticeCatalogResponse,
  PracticeHeatmapResponse,
  WeeklyReportResponse,
  IExamCurriculum,
  IExamPostSubmissionResources,
} from "./types"

export interface PracticeCatalogParams {
  collectionName?: string
  skill?: string
  search?: string
}

export async function getPracticeCatalogApi(
  params: PracticeCatalogParams = {}
): Promise<PracticeCatalogResponse> {
  const search = new URLSearchParams()
  if (params.collectionName) search.set("collectionName", params.collectionName)
  if (params.skill) search.set("skill", params.skill)
  if (params.search) search.set("search", params.search)
  const qs = search.toString()
  const { data } = await apiClient<PracticeCatalogResponse>(
    `/api/practice/catalog${qs ? `?${qs}` : ""}`
  )
  return data
}

export interface PracticeHeatmapParams {
  from?: string
  to?: string
  studentId?: string
}

export async function getPracticeHeatmapApi(
  params: PracticeHeatmapParams = {}
): Promise<PracticeHeatmapResponse> {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.studentId) search.set("studentId", params.studentId)
  const qs = search.toString()
  const { data } = await apiClient<PracticeHeatmapResponse>(
    `/api/practice/heatmap${qs ? `?${qs}` : ""}`
  )
  return data
}

export interface WeeklyReportParams {
  weekStart?: string
  studentId?: string
}

export async function getClassWeeklyReportApi(
  classId: string,
  params: WeeklyReportParams = {}
): Promise<WeeklyReportResponse> {
  const search = new URLSearchParams()
  if (params.weekStart) search.set("weekStart", params.weekStart)
  if (params.studentId) search.set("studentId", params.studentId)
  const qs = search.toString()
  const { data } = await apiClient<WeeklyReportResponse>(
    `/api/classes/${classId}/reports/weekly${qs ? `?${qs}` : ""}`
  )
  return data
}

export function getClassWeeklyReportCsvUrl(
  classId: string,
  params: { weekStart?: string } = {}
): string {
  const search = new URLSearchParams()
  if (params.weekStart) search.set("weekStart", params.weekStart)
  const qs = search.toString()
  return `/api/classes/${classId}/reports/weekly.csv${qs ? `?${qs}` : ""}`
}

export async function downloadWeeklyReportCsvApi(
  classId: string,
  params: { weekStart?: string; filename?: string } = {}
): Promise<void> {
  const url = getClassWeeklyReportCsvUrl(classId, { weekStart: params.weekStart })
  await downloadCsv(url, params.filename ?? `bao-cao-tuan-${classId}.csv`)
}

export async function updateExamResourcesApi(
  examId: string,
  payload: Partial<IExamPostSubmissionResources>
): Promise<{ id: string; message: string }> {
  const { data } = await apiClient<{ id: string; message: string }>(
    `/api/exams/${examId}/resources`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
  return data
}

export async function updateExamCurriculumApi(
  examId: string,
  payload: Partial<IExamCurriculum>
): Promise<{ id: string; message: string }> {
  const { data } = await apiClient<{ id: string; message: string }>(
    `/api/exams/${examId}/curriculum`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
  return data
}
