"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/api/query-keys"
import { addStudentToClassApi } from "@/lib/api/classes"
import {
  getRegisteredStudentsApi,
  type ListStudentsParams,
} from "@/lib/api/users"

/** Key riêng cho danh sách học sinh đã đăng ký (tách khỏi key admin `users`). */
export const registeredStudentsKey = (params: ListStudentsParams = {}) =>
  ["users", "students", params] as const

export function useRegisteredStudentsQuery(
  params: ListStudentsParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: registeredStudentsKey(params),
    queryFn: () => getRegisteredStudentsApi(params),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

/**
 * Thêm một học sinh vào lớp bất kỳ (classId nằm trong biến mutation) — dùng cho
 * thao tác thêm hàng loạt từ danh sách học sinh đã đăng ký.
 *
 * Chỉ đánh dấu dữ liệu lớp là "cũ" (không refetch ngay) để thêm 20 bạn liên tiếp
 * không kéo theo 20 lần tải lại; trang gọi refetch một lần sau khi thêm xong.
 */
export function useAddStudentsToClassMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, email }: { classId: string; email: string }) =>
      addStudentToClassApi(classId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classes.all,
        refetchType: "none",
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.teacher(),
        refetchType: "none",
      })
    },
  })
}
