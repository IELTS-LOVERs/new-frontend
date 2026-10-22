"use client"

import { useStudentProgressQuery } from "@/hooks/use-analytics"
import { usePracticeHeatmapQuery } from "@/hooks/use-practice"
import { StudentProgressView } from "@/features/analytics/components/student-progress-view"

export default function StudentProgressPage() {
  const analyticsQuery = useStudentProgressQuery()
  const heatmapQuery = usePracticeHeatmapQuery()

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
      viewer="student"
    />
  )
}
