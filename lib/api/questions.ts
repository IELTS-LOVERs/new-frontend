import { apiClient } from "./client"
import type { Question, QuestionType, SkillType } from "./types"
import type { PaginatedMeta } from "./assignments"

export interface ListQuestionsParams {
  skill?: SkillType
  part?: number
  type?: QuestionType
  createdBy?: string
  scope?: "own" | "all"
  search?: string
  page?: number
  limit?: number
}

export interface ListQuestionsResult {
  items: Question[]
  meta?: PaginatedMeta
}

export async function getQuestionsApi(params: ListQuestionsParams = {}): Promise<ListQuestionsResult> {
  const search = new URLSearchParams()
  if (params.skill) search.set("skill", params.skill)
  if (params.part) search.set("part", String(params.part))
  if (params.type) search.set("type", params.type)
  if (params.createdBy) search.set("createdBy", params.createdBy)
  if (params.scope) search.set("scope", params.scope)
  if (params.search) search.set("search", params.search)
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<Question[]>(`/api/questions${qs ? `?${qs}` : ""}`)
  return { items: data, meta: meta as PaginatedMeta | undefined }
}

export async function getQuestionDetailApi(id: string, scope?: "all"): Promise<Question> {
  const qs = scope ? `?scope=${scope}` : ""
  const { data } = await apiClient<Question>(`/api/questions/${id}${qs}`)
  return data
}

export interface CreateQuestionPayload {
  skill: SkillType
  type: QuestionType
  part: number
  prompt: string
  content?: string
  data?: Record<string, any>
  acceptedAnswers?: string[]
  points?: number
  explanation?: string
  mediaIds?: string[]
}

export async function createQuestionApi(payload: CreateQuestionPayload): Promise<Question> {
  const { data } = await apiClient<Question>("/api/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateQuestionApi(
  id: string,
  payload: Partial<CreateQuestionPayload>
): Promise<{ id: string; message: string }> {
  const { data } = await apiClient<{ id: string; message: string }>(`/api/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return data
}

export async function deleteQuestionApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/questions/${id}`, {
    method: "DELETE",
  })
  return data.message
}
