"use client"

import { useParams } from "next/navigation"
import { useStudentProgressQuery } from "@/hooks/use-analytics"
import { usePracticeHeatmapQuery } from "@/hooks/use-practice"
import { StudentProgressView } from "@/features/analytics/components/student-progress-view"

export default function TeacherStudentProgressPage() {
  const params = useParams<{ studentId: string }>()
  const studentId = params.studentId
  const analyticsQuery = useStudentProgressQuery(studentId, Boolean(studentId))
  const heatmapQuery = usePracticeHeatmapQuery(
    { studentId },
    Boolean(studentId)
  )

  return (
    <StudentProgressView
      analytics={analyticsQuery.data}
      heatmap={heatmapQuery.data}
      isLoading={analyticsQuery.isLoading}
      isHeatmapLoading={heatmapQuery.isLoading}
      error={analyticsQuery.error}
      onRetry={() => {
        void analyticsQuery.refetch()
        void heatmapQuery.refetch()
      }}
      viewer="teacher"
      backHref="/teacher/classes"
      backLabel="Quay lại lớp học"
    />
  )
}
