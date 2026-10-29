import { apiClient } from "./client"
import type {
  CollectionCategory,
  CollectionDetailResponse,
  CollectionItem,
} from "./types"
import type { PaginatedMeta } from "./assignments"

export interface ListCollectionsParams {
  search?: string
  category?: CollectionCategory
  page?: number
  limit?: number
}

export interface ListCollectionsResult {
  items: CollectionItem[]
  allCategories?: string[]
  meta?: PaginatedMeta
}

export interface CreateCollectionPayload {
  name: string
  category?: CollectionCategory
  description?: string
  bannerUrl?: string
  orderIndex?: number
}

export interface UpdateCollectionPayload {
  name?: string
  category?: CollectionCategory
  description?: string | null
  bannerUrl?: string | null
  orderIndex?: number
}

export type AddExamsToCollectionPayload =
  | {
      examIds: string[]
      testNumber?: number
      part?: number
      orderIndex?: number
    }
  | {
      items: Array<{
        examId: string
        testNumber?: number
        part?: number
        orderIndex?: number
      }>
    }

export interface UpdateExamInCollectionPayload {
  testNumber?: number | null
  part?: number | null
  orderIndex?: number | null
}

export async function getCollectionsApi(
  params: ListCollectionsParams = {}
): Promise<ListCollectionsResult> {
  const search = new URLSearchParams()
  if (params.search) search.set("search", params.search)
  if (params.category) search.set("category", params.category)
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<CollectionItem[]>(
    `/api/collections${qs ? `?${qs}` : ""}`
  )
  const metaObj = meta as (PaginatedMeta & { allCategories?: string[] }) | undefined
  return { items: data, allCategories: metaObj?.allCategories, meta: metaObj }
}

export async function getCollectionDetailApi(id: string): Promise<CollectionDetailResponse> {
  const { data } = await apiClient<CollectionDetailResponse>(`/api/collections/${id}`)
  return data
}

export async function createCollectionApi(
  payload: CreateCollectionPayload
): Promise<CollectionItem> {
  const { data } = await apiClient<CollectionItem>("/api/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function updateCollectionApi(
  id: string,
  payload: UpdateCollectionPayload
): Promise<CollectionItem> {
  const { data } = await apiClient<CollectionItem>(`/api/collections/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return data
}

export async function deleteCollectionApi(id: string): Promise<{ id: string; message: string }> {
  const { data } = await apiClient<{ id: string; message: string }>(`/api/collections/${id}`, {
    method: "DELETE",
  })
  return data
}

export async function addExamsToCollectionApi(
  id: string,
  payload: AddExamsToCollectionPayload
): Promise<{ count: number; message: string }> {
  const { data } = await apiClient<{ count: number; message: string }>(
    `/api/collections/${id}/exams`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
  return data
}

export async function removeExamFromCollectionApi(
  id: string,
  examId: string
): Promise<{ examId: string; message: string }> {
  const { data } = await apiClient<{ examId: string; message: string }>(
    `/api/collections/${id}/exams/${examId}`,
    {
      method: "DELETE",
    }
  )
  return data
}

export async function updateExamInCollectionApi(
  id: string,
  examId: string,
  payload: UpdateExamInCollectionPayload
): Promise<{ examId: string; message: string }> {
  const { data } = await apiClient<{ examId: string; message: string }>(
    `/api/collections/${id}/exams/${examId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
  return data
}
