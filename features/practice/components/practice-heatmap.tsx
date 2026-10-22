"use client"

import * as React from "react"
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
  return d.getUTCDay()
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
  const days = React.useMemo(() => data?.days ?? [], [data?.days])
  const streak = data?.streak ?? { current: 0, longest: 0 }

  const { weeks, monthLabels, totalPractices, activeDays } = React.useMemo(() => {
    if (days.length === 0) {
      return {
        weeks: [],
        monthLabels: [],
        totalPractices: 0,
        activeDays: 0,
      }
    }

    let practicesCount = 0
    let activeCount = 0
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

    const headers: Array<{ label: string; weekIndex: number }> = []
    let lastWeekTagged = -999

    for (let w = 0; w < weekCols.length; w++) {
      const week = weekCols[w]
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
    }
  }, [days])

  const getCellClass = (day: PracticeHeatmapDay | null) => {
    if (!day || day.status === "none") {
      return "bg-muted/70 dark:bg-muted/30 border border-border/40 hover:border-foreground/30"
    }

    if (day.status === "both") {
      return "bg-primary border border-primary/80 text-primary-foreground"
    }

    if (day.status === "listening_only") {
      return "bg-sky-500 border border-sky-600 text-white"
    }

    if (day.status === "reading_only") {
      return "bg-emerald-500 border border-emerald-600 text-white"
    }

    return "bg-muted/70 border border-border/40"
  }

  return (
    <section className="border-t border-border pt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Nhịp luyện tập
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            6 tháng gần nhất · Asia/Ho_Chi_Minh (UTC+7)
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr] lg:items-start">
        <div className="order-2 min-w-0 lg:order-1">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              Đang tải dữ liệu luyện tập...
            </div>
          ) : days.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              Chưa có dữ liệu luyện tập trong giai đoạn này.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card p-4 pb-2">
              <div className="inline-block min-w-full">
                <div className="mb-2 flex select-none items-center pl-9">
                  <div className="relative h-4 w-full font-mono text-[10px] text-muted-foreground">
                    {monthLabels.map((month, idx) => (
                      <span
                        key={idx}
                        className="absolute font-medium tracking-tight text-foreground/70"
                        style={{ left: `${month.weekIndex * 17}px` }}
                      >
                        {month.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="grid w-7 shrink-0 grid-rows-7 gap-[4px] pr-1 text-right font-mono text-[10px] text-muted-foreground">
                    <div className="h-[13px] select-none leading-[13px] opacity-0">
                      CN
                    </div>
                    <div className="h-[13px] leading-[13px]">T2</div>
                    <div className="h-[13px] select-none leading-[13px] opacity-0">
                      T3
                    </div>
                    <div className="h-[13px] leading-[13px]">T4</div>
                    <div className="h-[13px] select-none leading-[13px] opacity-0">
                      T5
                    </div>
                    <div className="h-[13px] leading-[13px]">T6</div>
                    <div className="h-[13px] select-none leading-[13px] opacity-0">
                      T7
                    </div>
                  </div>

                  <TooltipProvider delayDuration={100}>
                    <div className="flex gap-[4px]">
                      {weeks.map((week, wIdx) => (
                        <div key={wIdx} className="grid grid-rows-7 gap-[4px]">
                          {week.map((day, dIdx) => {
                            if (!day) {
                              return (
                                <div
                                  key={dIdx}
                                  className="h-[13px] w-[13px] rounded-[2.5px] bg-transparent"
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
                                      "h-[13px] w-[13px] cursor-pointer rounded-[2.5px] transition-transform hover:z-20 hover:scale-125",
                                      getCellClass(day)
                                    )}
                                  />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="space-y-1.5 border-border bg-popover p-3 text-xs text-popover-foreground shadow-md"
                                >
                                  <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1 font-semibold text-foreground">
                                    <span>{dayName}</span>
                                    <span className="font-mono font-normal text-muted-foreground">
                                      {formattedDate}
                                    </span>
                                  </div>
                                  {hasActivity ? (
                                    <div className="space-y-1 pt-0.5 text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={cn(
                                            "h-2 w-2 shrink-0 rounded-full",
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
                                      <div className="flex items-center gap-2 pl-3.5 font-mono text-[11px]">
                                        <span>🎧 Nghe: {day.listening} bài</span>
                                        <span>·</span>
                                        <span>📖 Đọc: {day.reading} bài</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="pt-0.5 text-[11px] text-muted-foreground">
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
        </div>

        <div className="order-1 space-y-5 lg:order-2 lg:border-l lg:border-border lg:pl-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Metric
              label="Chuỗi hiện tại"
              value={streak.current}
              suffix="ngày"
            />
            <Metric
              label="Kỷ lục chuỗi"
              value={streak.longest}
              suffix="ngày"
            />
            <Metric
              label="Ngày tích cực"
              value={`${activeDays}/${days.length}`}
              suffix="ngày"
            />
            <Metric
              label="Tổng bài đã luyện"
              value={totalPractices}
              suffix="bài"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 select-none">
            <LegendSwatch
              className="border border-border/40 bg-muted/70"
              label="Chưa làm"
            />
            <LegendSwatch className="bg-emerald-500" label="Reading" />
            <LegendSwatch className="bg-sky-500" label="Listening" />
            <LegendSwatch className="bg-primary" label="Cả 2 kỹ năng" />
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            Mỗi ô là một ngày có bài luyện tập được nộp. Dữ liệu cập nhật theo
            bài đã nộp.
          </p>
        </div>
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | string
  suffix: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
          {suffix}
        </span>
      </p>
    </div>
  )
}

function LegendSwatch({
  className,
  label,
}: {
  className: string
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded-[2px]", className)} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
