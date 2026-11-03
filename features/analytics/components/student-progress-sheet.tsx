"use client"

import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AreaChart, RadarChart, RadialProgressChart } from "@/components/shared/charts"
import { QueryError } from "@/components/shared/query-states"
import { formatBand } from "@/lib/format"
import { useStudentProgressQuery } from "@/hooks/use-analytics"
import type { ClassRosterStudent } from "@/lib/api/types"

/**
 * Sheet tiến độ cá nhân học sinh — dùng chung cho trang analytics và trang lớp.
 * Radial (mục tiêu) + Radar (3 kỹ năng) + Area (xu hướng band theo thời gian).
 */
export function StudentProgressSheet({
  student,
  onClose,
}: {
  student: ClassRosterStudent | null
  onClose: () => void
}) {
  const progressQuery = useStudentProgressQuery(student?.id, !!student)
  const points = progressQuery.data?.points ?? []

  return (
    <Sheet open={!!student} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold">
            {student?.fullName}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Tiến độ luyện tập, phân tích kỹ năng và độ hoàn thành mục tiêu
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-6 pb-8 pt-3">
          <div className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Mức độ đạt mục tiêu
              </span>
              <p className="font-heading font-semibold text-base text-foreground">
                Target Band: {formatBand(student?.targetBand ?? 6.5)}
              </p>
              <p className="text-xs text-muted-foreground">
                Hiện tại: Band {formatBand(student?.overall ?? 0)}
              </p>
            </div>
            <div className="shrink-0">
              <RadialProgressChart
                current={student?.overall ?? 0}
                target={student?.targetBand ?? 6.5}
                size={120}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-card space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Tương quan kỹ năng cá nhân (L, R, W)
            </span>
            <p className="text-xs text-muted-foreground">
              Nhận diện kỹ năng thế mạnh và kỹ năng cần cải thiện
            </p>
            <div className="py-2 flex justify-center">
              <RadarChart
                data={[
                  { label: "Listening", value: student?.listening ?? 0, max: 9 },
                  { label: "Reading", value: student?.reading ?? 0, max: 9 },
                  { label: "Writing", value: student?.writing ?? 0, max: 9 },
                ]}
                size={200}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-card space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Xu hướng điểm số theo thời gian
            </span>
            <div className="pt-2">
              {progressQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : progressQuery.isError ? (
                <QueryError
                  error={progressQuery.error}
                  onRetry={() => progressQuery.refetch()}
                />
              ) : points.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Chưa có dữ liệu làm bài.
                </p>
              ) : (
                <AreaChart
                  data={points.map((p) => ({
                    label: new Date(p.submittedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                    value: p.overall ?? 0,
                  }))}
                  height={160}
                />
              )}
            </div>
          </div>

          <Button asChild className="w-full gap-1.5 font-semibold">
            <Link href={`/teacher/students/${student?.id}/progress`}>
              Mở trang tiến độ đầy đủ
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
