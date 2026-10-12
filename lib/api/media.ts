import { apiClient } from "./client"
import type { PaginatedMeta } from "./assignments"
import type { MediaItem } from "./types"

export interface ListMediaParams {
  type?: "audio" | "image"
  page?: number
  limit?: number
}

export interface MediaListItem extends MediaItem {
  bucket?: string
  key?: string
  mimeType?: string
  size?: number
  status?: "pending" | "confirmed"
  uploadedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface ListMediaResult {
  items: MediaListItem[]
  meta?: PaginatedMeta
}

export async function getMediaApi(params: ListMediaParams = {}): Promise<ListMediaResult> {
  const search = new URLSearchParams()
  if (params.type) search.set("type", params.type)
  if (params.page) search.set("page", String(params.page))
  if (params.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  const { data, meta } = await apiClient<MediaListItem[]>(`/api/media${qs ? `?${qs}` : ""}`)
  return { items: data, meta: meta as PaginatedMeta | undefined }
}

export interface PresignMediaPayload {
  filename: string
  mimeType: "audio/mpeg" | "audio/wav" | "image/png" | "image/jpeg"
  type: "audio" | "image"
  size: number
}

export interface PresignMediaResponse {
  mediaId: string
  uploadUrl: string
  publicUrl: string
  expiresInSeconds: number
}

export async function presignMediaApi(payload: PresignMediaPayload): Promise<PresignMediaResponse> {
  const { data } = await apiClient<PresignMediaResponse>("/api/media/presign", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data
}

export async function confirmMediaApi(id: string): Promise<{ id: string; status: string }> {
  const { data } = await apiClient<{ id: string; status: string }>(`/api/media/${id}/confirm`, {
    method: "POST",
  })
  return data
}

export async function deleteMediaApi(id: string): Promise<string> {
  const { data } = await apiClient<{ message: string }>(`/api/media/${id}`, { method: "DELETE" })
  return data.message
}
