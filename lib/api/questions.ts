import { apiClient } from "./client"
import type {
  BankQuestionGroup,
  QuestionGroupConfig,
  QuestionGroupType,
  RichDoc,
  SkillType,
} from "./types"
import type { PaginatedMeta } from "./assignments"

export interface ListQuestionsParams {
  skill?: SkillType
  part?: number
  /** Matches the group's `groupType`. */
  type?: QuestionGroupType
  createdBy?: string
  scope?: "own" | "all"
  search?: string
  page?: number
  limit?: number
}

export interface ListQuestionsResult {
  items: BankQuestionGroup[]
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
  const { data, meta } = await apiClient<BankQuestionGroup[]>(`/api/questions${qs ? `?${qs}` : ""}`)
  return { items: data, meta: meta as PaginatedMeta | undefined }
}

export async function getQuestionDetailApi(id: string, scope?: "all"): Promise<BankQuestionGroup> {
  const qs = scope ? `?scope=${scope}` : ""
  const { data } = await apiClient<BankQuestionGroup>(`/api/questions/${id}${qs}`)
  return data
}

export interface BankQuestionItemPayload {
  prompt: string
  promptDoc?: RichDoc | null
  acceptedAnswers?: string[]
  points?: number
  explanation?: string
  mediaIds?: string[]
}

export interface CreateBankGroupPayload {
  skill: SkillType
  part: number
  groupType: QuestionGroupType
  instructions: string
  instructionsDoc?: RichDoc | null
  config: QuestionGroupConfig
  questions: BankQuestionItemPayload[]
}

export async function createQuestionApi(payload: CreateBankGroupPayload): Promise<BankQuestionGroup> {
  const { data } = await apiClient<BankQuestionGroup>("/api/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateQuestionApi(
  id: string,
  payload: Partial<CreateBankGroupPayload>
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

/**
 * Legacy flat question type → QuestionGroupType.
 * Only the two generic legacy types need remapping; the rest are identical.
 */
export const LEGACY_TYPE_TO_GROUP_TYPE: Record<string, QuestionGroupType> = {
  multiple_choice: "multiple_choice_single",
  matching: "matching_headings",
}

/** Convert a legacy flat `Question` object into a bank group payload (1 question). */
export function legacyQuestionToGroupPayload(q: {
  skill: SkillType
  type: string
  part: number
  prompt: string
  content?: string | null
  data?: Record<string, unknown>
  acceptedAnswers?: string[]
  points?: number
  explanation?: string | null
  mediaIds?: string[]
}): CreateBankGroupPayload {
  return {
    skill: q.skill,
    part: q.part,
    groupType: (LEGACY_TYPE_TO_GROUP_TYPE[q.type] ?? q.type) as QuestionGroupType,
    instructions: q.content ?? "",
    config: (q.data ?? {}) as QuestionGroupConfig,
    questions: [
      {
        prompt: q.prompt,
        acceptedAnswers: q.acceptedAnswers ?? [],
        points: q.points ?? 1,
        explanation: q.explanation ?? undefined,
        mediaIds: q.mediaIds ?? [],
      },
    ],
  }
}
