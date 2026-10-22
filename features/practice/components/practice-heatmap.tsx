"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FireIcon,
  Award01Icon,
  Calendar01Icon,
  Book02Icon,
  HeadphonesIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { PracticeHeatmapResponse, PracticeHeatmapDay } from "@/lib/api/types"

interface PracticeHeatmapProps {
  data?: PracticeHeatmapResponse
  isLoading?: boolean
}

const MONTH_NAMES = [
  "Th 1",
  "Th 2",
  "Th 3",
  "Th 4",
  "Th 5",
  "Th 6",
  "Th 7",
  "Th 8",
  "Th 9",
  "Th 10",
  "Th 11",
  "Th 12",
]

function getUtcDay(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.getUTCDay() // 0 = Sun, 1 = Mon ... 6 = Sat
}

function formatDateDisplayVi(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

function getDayOfWeekNameVi(dayIndex: number): string {
  switch (dayIndex) {
    case 0:
      return "Chủ nhật"
    case 1:
      return "Thứ hai"
    case 2:
      return "Thứ ba"
    case 3:
      return "Thứ tư"
    case 4:
      return "Thứ năm"
    case 5:
      return "Thứ sáu"
    case 6:
      return "Thứ bảy"
    default:
      return ""
  }
}

export function PracticeHeatmap({ data, isLoading }: PracticeHeatmapProps) {
  const days = data?.days ?? []
  const streak = data?.streak ?? { current: 0, longest: 0 }

  // Organize days into calendar week columns (7 rows: Sun=0 -> Sat=6)
  const { weeks, monthLabels, totalPractices, activeDays, totalListening, totalReading } =
    React.useMemo(() => {
      if (days.length === 0) {
        return {
          weeks: [],
          monthLabels: [],
          totalPractices: 0,
          activeDays: 0,
          totalListening: 0,
          totalReading: 0,
        }
      }

      let practicesCount = 0
      let activeCount = 0
      let listeningCount = 0
      let readingCount = 0

      const weekCols: Array<Array<PracticeHeatmapDay | null>> = []
      let currentWeek: Array<PracticeHeatmapDay | null> = new Array(7).fill(null)

      const firstDayIndex = getUtcDay(days[0].date)
      for (let i = 0; i < firstDayIndex; i++) {
        currentWeek[i] = null
      }

      for (const day of days) {
        const lCount = day.listening || 0
        const rCount = day.reading || 0
        practicesCount += lCount + rCount
        listeningCount += lCount
        readingCount += rCount
        if (day.status !== "none") {
          activeCount += 1
        }

        const dayIndex = getUtcDay(day.date)
        currentWeek[dayIndex] = day

        if (dayIndex === 6) {
          weekCols.push(currentWeek)
          currentWeek = new Array(7).fill(null)
        }
      }

      if (currentWeek.some((d) => d !== null)) {
        weekCols.push(currentWeek)
      }

      // Calculate month label headers without collisions:
      // Minimum gap of 3 columns between labels to avoid overlap
      const headers: Array<{ label: string; weekIndex: number }> = []
      let lastWeekTagged = -999

      for (let w = 0; w < weekCols.length; w++) {
        const week = weekCols[w]
        // Check if any slot is the beginning of a month (dayOfMonth 1..7)
        const startOfMonth = week.find((d) => {
          if (!d) return false
          const dayNum = parseInt(d.date.split("-")[2], 10)
          return dayNum <= 7
        })

        if (startOfMonth) {
          const monthNum = parseInt(startOfMonth.date.split("-")[1], 10) - 1
          if (w - lastWeekTagged >= 3) {
            headers.push({
              label: MONTH_NAMES[monthNum],
              weekIndex: w,
            })
            lastWeekTagged = w
          }
        } else if (w === 0 && weekCols.length > 0) {
          // Label the first week if starting near beginning of month
          const firstSlot = week.find((d) => d !== null)
          if (firstSlot) {
            const dayNum = parseInt(firstSlot.date.split("-")[2], 10)
            if (dayNum <= 15) {
              const monthNum = parseInt(firstSlot.date.split("-")[1], 10) - 1
              headers.push({
                label: MONTH_NAMES[monthNum],
                weekIndex: 0,
              })
              lastWeekTagged = 0
            }
          }
        }
      }

      return {
        weeks: weekCols,
        monthLabels: headers,
        totalPractices: practicesCount,
        activeDays: activeCount,
        totalListening: listeningCount,
        totalReading: readingCount,
      }
    }, [days])

  // Get cell color matching design system: flat, clean tokens
  const getCellClass = (day: PracticeHeatmapDay | null) => {
    if (!day || day.status === "none") {
      return "bg-muted/70 dark:bg-muted/30 border border-border/40 hover:border-foreground/30"
    }

    if (day.status === "both") {
      return "bg-primary border border-primary/80 text-primary-foreground shadow-xs"
    }

    if (day.status === "listening_only") {
      return "bg-sky-500 border border-sky-600 text-white shadow-xs"
    }

    if (day.status === "reading_only") {
      return "bg-emerald-500 border border-emerald-600 text-white shadow-xs"
    }

    return "bg-muted/70 border border-border/40"
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-5 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <HugeiconsIcon icon={Calendar01Icon} size={18} className="text-primary" />
              <span>Biểu đồ luyện tập (Heatmap)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Theo dõi tần suất làm bài luyện tập mỗi ngày theo múi giờ Việt Nam (UTC+7)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span>Múi giờ: <strong>Asia/Ho_Chi_Minh</strong></span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Metric Summary Strip (Eliminates empty space and provides meaningful stats) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Streak Hiện tại */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={FireIcon} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Chuỗi hiện tại
              </p>
              <p className="text-lg font-mono font-bold text-foreground tabular-nums leading-tight mt-0.5">
                {streak.current} <span className="text-xs font-normal text-muted-foreground">ngày</span>
              </p>
            </div>
          </div>

          {/* Kỷ lục Chuỗi */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={Award01Icon} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Kỷ lục chuỗi
              </p>
              <p className="text-lg font-mono font-bold text-foreground tabular-nums leading-tight mt-0.5">
                {streak.longest} <span className="text-xs font-normal text-muted-foreground">ngày</span>
              </p>
            </div>
          </div>

          {/* Ngày có luyện tập */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Ngày tích cực
              </p>
              <p className="text-lg font-mono font-bold text-foreground tabular-nums leading-tight mt-0.5">
                {activeDays}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  / {days.length} ngày
                </span>
              </p>
            </div>
          </div>

          {/* Tổng bài luyện */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={Book02Icon} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tổng bài đã luyện
              </p>
              <p className="text-lg font-mono font-bold text-foreground tabular-nums leading-tight mt-0.5">
                {totalPractices} <span className="text-xs font-normal text-muted-foreground">bài</span>
              </p>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Container */}
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Đang tải dữ liệu biểu đồ luyện tập...
          </div>
        ) : days.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Chưa có dữ liệu luyện tập trong giai đoạn này.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 pt-1">
            <div className="inline-block min-w-full">
              {/* Month Header Row */}
              <div className="flex items-center mb-1.5 select-none pl-9">
                <div className="relative h-4 w-full flex text-[11px] font-mono text-muted-foreground">
                  {monthLabels.map((m, idx) => (
                    <span
                      key={idx}
                      className="absolute font-semibold text-foreground/80 tracking-tight"
                      style={{
                        left: `${m.weekIndex * 17}px`,
                      }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Heatmap Matrix: 7 rows x Week columns */}
              <div className="flex gap-2 items-start">
                {/* Weekday labels: Mon, Wed, Fri (T2, T4, T6) matching row heights */}
                <div className="grid grid-rows-7 gap-[4px] text-[10px] font-mono text-muted-foreground select-none pr-1 text-right w-7 shrink-0">
                  <div className="h-[13px] leading-[13px] opacity-0 select-none">CN</div>
                  <div className="h-[13px] leading-[13px]">T2</div>
                  <div className="h-[13px] leading-[13px] opacity-0 select-none">T3</div>
                  <div className="h-[13px] leading-[13px]">T4</div>
                  <div className="h-[13px] leading-[13px] opacity-0 select-none">T5</div>
                  <div className="h-[13px] leading-[13px]">T6</div>
                  <div className="h-[13px] leading-[13px] opacity-0 select-none">T7</div>
                </div>

                {/* Week Columns */}
                <TooltipProvider delayDuration={100}>
                  <div className="flex gap-[4px]">
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} className="grid grid-rows-7 gap-[4px]">
                        {week.map((day, dIdx) => {
                          if (!day) {
                            return (
                              <div
                                key={dIdx}
                                className="w-[13px] h-[13px] rounded-[2.5px] bg-transparent"
                              />
                            )
                          }

                          const dayName = getDayOfWeekNameVi(dIdx)
                          const formattedDate = formatDateDisplayVi(day.date)
                          const hasActivity = day.status !== "none"

                          return (
                            <Tooltip key={dIdx}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-[13px] h-[13px] rounded-[2.5px] cursor-pointer transition-transform hover:scale-130 hover:z-20",
                                    getCellClass(day)
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="text-xs p-3 space-y-1.5 shadow-md bg-popover text-popover-foreground border-border"
                              >
                                <div className="font-semibold text-foreground border-b border-border/60 pb-1 flex items-center justify-between gap-3">
                                  <span>{dayName}</span>
                                  <span className="font-mono text-muted-foreground font-normal">
                                    {formattedDate}
                                  </span>
                                </div>
                                {hasActivity ? (
                                  <div className="space-y-1 text-muted-foreground pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={cn(
                                          "w-2 h-2 rounded-full shrink-0",
                                          day.status === "both"
                                            ? "bg-primary"
                                            : day.status === "listening_only"
                                              ? "bg-sky-500"
                                              : "bg-emerald-500"
                                        )}
                                      />
                                      <span className="font-medium text-foreground">
                                        {day.status === "both"
                                          ? "Hoàn thành cả Nghe & Đọc"
                                          : day.status === "listening_only"
                                            ? "Chỉ hoàn thành Listening"
                                            : "Chỉ hoàn thành Reading"}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono flex items-center gap-2 pl-3.5">
                                      <span>🎧 Nghe: {day.listening} bài</span>
                                      <span>·</span>
                                      <span>📖 Đọc: {day.reading} bài</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-[11px] pt-0.5">
                                    Chưa có bài luyện tập nào
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}

        {/* Semantic Bottom Legend (Truthful to the data model, not fake gradient) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border text-xs">
          <div className="flex items-center flex-wrap gap-4 select-none">
            <span className="text-[11px] font-medium text-muted-foreground">Chú thích:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-muted/70 border border-border/40 inline-block" />
              <span className="text-[11px] text-muted-foreground">Chưa làm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-emerald-500 inline-block" />
              <span className="text-[11px] text-muted-foreground">Reading</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-sky-500 inline-block" />
              <span className="text-[11px] text-muted-foreground">Listening</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-primary inline-block" />
              <span className="text-[11px] text-muted-foreground font-medium text-foreground">
                Cả 2 kỹ năng
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            <span>6 tháng gần nhất · Cập nhật tự động</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
