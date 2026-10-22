"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Download04Icon,
  RefreshIcon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  UserGroupIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { useClassDetailQuery } from "@/hooks/use-classes"
import { useClassWeeklyReportQuery } from "@/hooks/use-practice"
import { getClassWeeklyReportCsvUrl, downloadWeeklyReportCsvApi } from "@/lib/api/practice"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function getMonday(dateStr?: string): string {
  const baseDate =
    dateStr ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  const d = new Date(`${baseDate}T12:00:00Z`)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  d.setUTCDate(diff)
  return d.toISOString().slice(0, 10)
}

function shiftWeek(weekKey: string, deltaDays: number): string {
  const d = new Date(`${weekKey}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split("-")
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  return dateStr
}

const WEEKDAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]

export default function TeacherClassWeeklyReportPage() {
  const params = useParams<{ classId: string }>()
  const classId = params.classId

  const currentMonday = React.useMemo(() => getMonday(), [])
  const [weekStart, setWeekStart] = useQueryState(
    "weekStart",
    parseAsString.withDefault(currentMonday).withOptions({ shallow: true })
  )

  const classQuery = useClassDetailQuery(classId)
  const reportQuery = useClassWeeklyReportQuery(classId, { weekStart })

  const report = reportQuery.data
  const className = classQuery.data?.name ?? report?.class.name ?? "Lớp học"
  const classCode = classQuery.data?.code ?? report?.class.code ?? ""

  const handlePrevWeek = () => {
    setWeekStart(shiftWeek(weekStart, -7))
  }

  const handleNextWeek = () => {
    setWeekStart(shiftWeek(weekStart, 7))
  }

  const handleCurrentWeek = () => {
    setWeekStart(currentMonday)
  }

  const [isExporting, setIsExporting] = React.useState(false)

  const handleDownloadCsv = async () => {
    setIsExporting(true)
    try {
      await downloadWeeklyReportCsvApi(classId, {
        weekStart,
        filename: `bao-cao-tuan-${classCode || classId}-${weekStart}.csv`,
      })
      toast.success("Đã tải xuống file CSV báo cáo tuần")
    } catch {
      toast.error("Không thể tải file CSV báo cáo tuần.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Lớp học", href: "/teacher/classes" },
          { label: className, href: `/teacher/classes/${classId}` },
          { label: "Báo cáo tuần" },
        ]}
        title={`Báo cáo tuần: ${className}`}
        description={`Tổng hợp kết quả làm bài tập và luyện tập trong tuần (Thứ 2 đến Chủ nhật, giờ Việt Nam UTC+7)`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={isExporting}
              className="gap-1.5 text-xs font-semibold"
            >
              <HugeiconsIcon icon={Download04Icon} size={15} />
              <span>{isExporting ? "Đang xuất file..." : "Xuất file CSV"}</span>
            </Button>
          </div>
        }
      />

      {/* Week Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Calendar01Icon} size={18} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Tuần từ {formatDateShort(weekStart)} đến {formatDateShort(shiftWeek(weekStart, 6))}
          </span>
          {report?.week?.timezone && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {report.week.timezone}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="gap-1 text-xs h-8"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span>Tuần trước</span>
          </Button>
          {weekStart !== currentMonday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCurrentWeek}
              className="text-xs h-8"
            >
              Tuần này
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="gap-1 text-xs h-8"
          >
            <span>Tuần sau</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
        <HugeiconsIcon icon={Alert02Icon} size={16} className="shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">Lưu ý bảo mật & quyền riêng tư:</p>
          <p className="text-[11px] opacity-90 leading-relaxed">
            Báo cáo này là dữ liệu nội bộ dành riêng cho giáo viên quản trị lớp, chứa điểm số và hoạt động của tất cả học sinh trong lớp. Vui lòng không gửi trực tiếp nguyên file CSV này cho phụ huynh hoặc bên ngoài.
          </p>
        </div>
      </div>

      {/* Summary Totals */}
      {report?.totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Sĩ số lớp"
            value={String(report.totals.students)}
            icon={UserGroupIcon}
          />
          <StatCard
            label="Bài tập đến hạn"
            value={String(report.totals.assignmentsDue)}
            icon={Task01Icon}
          />
          <StatCard
            label="Bài tập đã nộp"
            value={String(report.totals.assignmentsCompleted)}
            icon={CheckmarkCircle02Icon}
          />
          <StatCard
            label="Tỷ lệ hoàn thành"
            value={
              report.totals.completionRate !== null
                ? `${Math.round(report.totals.completionRate * 100)}%`
                : "—"
            }
            icon={CheckmarkCircle02Icon}
          />
        </div>
      )}

      {/* Weekly Report Table */}
      {reportQuery.isLoading ? (
        <Card className="border-border">
          <CardContent className="p-8 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : reportQuery.isError ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">Không tải được báo cáo tuần</p>
            <p className="text-xs text-muted-foreground">
              Đã có lỗi xảy ra trong quá trình truy xuất dữ liệu.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reportQuery.refetch()}
              className="gap-1.5 text-xs font-medium"
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              <span>Thử lại</span>
            </Button>
          </CardContent>
        </Card>
      ) : !report || report.students.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            Lớp học chưa có học sinh nào.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent text-xs">
                  <TableHead className="w-[180px] font-semibold sticky left-0 bg-card z-10">
                    Học sinh
                  </TableHead>
                  {WEEKDAY_NAMES.map((w, idx) => (
                    <TableHead key={w} className="text-center font-semibold w-[75px]">
                      {w}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {report.students[0]?.days[idx]?.date ? formatDateShort(report.students[0].days[idx].date) : ""}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold w-[90px]">Bài đến hạn</TableHead>
                  <TableHead className="text-center font-semibold w-[90px]">Đã nộp</TableHead>
                  <TableHead className="text-center font-semibold w-[90px]">Tỷ lệ</TableHead>
                  <TableHead className="text-center font-semibold w-[80px]">Luyện tập</TableHead>
                  <TableHead className="text-center font-semibold w-[90px]">Độ CX</TableHead>
                  <TableHead className="text-center font-semibold w-[80px]">ĐTB Đề thi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.students.map((row) => (
                  <TableRow key={row.student.id} className="border-border/50 text-xs">
                    <TableCell className="font-semibold text-foreground sticky left-0 bg-card z-10 truncate max-w-[180px]">
                      {row.student.fullName}
                    </TableCell>

                    {row.days.map((day) => {
                      const hasL = day.listening > 0
                      const hasR = day.reading > 0
                      const status = day.status

                      let cellText = "—"
                      if (hasL && hasR) {
                        cellText = `L${day.listening}/R${day.reading}`
                      } else if (hasL) {
                        cellText = `L${day.listening}`
                      } else if (hasR) {
                        cellText = `R${day.reading}`
                      } else if (day.mockCount > 0) {
                        cellText = `M${day.mockCount}`
                      }

                      return (
                        <TableCell key={day.date} className="text-center py-2.5">
                          {status === "none" && day.mockCount === 0 ? (
                            <span className="text-muted-foreground/40 text-[11px]">—</span>
                          ) : (
                            <span
                              className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                                status === "both"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : status === "listening_only"
                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                    : status === "reading_only"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      : "bg-primary/10 text-primary border border-primary/20"
                              )}
                            >
                              {cellText}
                            </span>
                          )}
                        </TableCell>
                      )
                    })}

                    <TableCell className="text-center font-mono">
                      {row.assignmentsDue}
                    </TableCell>

                    <TableCell className="text-center font-mono">
                      {row.assignmentsCompleted}
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold">
                      {row.completionRate !== null
                        ? `${Math.round(row.completionRate * 100)}%`
                        : "—"}
                    </TableCell>

                    <TableCell className="text-center font-mono">
                      {row.practiceAttempts}
                    </TableCell>

                    <TableCell className="text-center font-mono">
                      {row.practiceAccuracy !== null ? `${row.practiceAccuracy}%` : "—"}
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold text-primary">
                      {row.mockAverageBand !== null ? row.mockAverageBand.toFixed(1) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
