"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import {
  getMediaApi,
  presignMediaApi,
  confirmMediaApi,
  deleteMediaApi,
  type ListMediaParams,
  type PresignMediaPayload,
} from "@/lib/api/media"

export function useMediaQuery(params: ListMediaParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.media.list(params.type, params.page, params.limit),
    queryFn: () => getMediaApi(params),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function usePresignMediaMutation() {
  return useMutation({
    mutationFn: (payload: PresignMediaPayload) => presignMediaApi(payload),
  })
}

export function useConfirmMediaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => confirmMediaApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
    },
  })
}

export function useDeleteMediaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMediaApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] })
    },
  })
}
