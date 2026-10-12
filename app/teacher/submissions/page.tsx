"use client"

import Link from "next/link"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Award01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  InboxIcon,
  MaximizeScreenIcon,
  RefreshIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import { DEMO_PENDING_GRADING, DEMO_SUSPICIOUS_SUBMISSIONS, DEMO_TEACHER_DASHBOARD } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { usePendingGradingQuery } from "@/hooks/use-grading"
import { useSuspiciousAttemptsQuery } from "@/hooks/use-admin"
import { useTeacherDashboardQuery } from "@/hooks/use-dashboard"
import { formatBand, formatDate } from "@/lib/format"

const TABS = ["pending", "suspicious", "recent"] as const
type TabValue = (typeof TABS)[number]

function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Không tải được dữ liệu."
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
      <p className="text-sm font-medium text-foreground">Không tải được dữ liệu</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium" onClick={onRetry}>
        <HugeiconsIcon icon={RefreshIcon} size={14} />
        <span>Thử lại</span>
      </Button>
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card className="border-border shadow-xs">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

export default function TeacherSubmissionsPage() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("pending")
  )

  const pendingQuery = usePendingGradingQuery(!USE_MOCKS)
  const suspiciousQuery = useSuspiciousAttemptsQuery(50, !USE_MOCKS)
  const dashboardQuery = useTeacherDashboardQuery(!USE_MOCKS)

  type SuspiciousRow = {
    attemptId: string
    studentName: string
    studentEmail?: string | null
    examTitle: string
    submittedAt: string
    totalEvents: number
    eventsByType: Record<string, number>
  }

  const pending = USE_MOCKS ? DEMO_PENDING_GRADING : (pendingQuery.data?.items ?? [])
  const pendingCount = USE_MOCKS
    ? DEMO_PENDING_GRADING.length
    : (pendingQuery.data?.totalPending ?? pending.length)
  const suspicious: SuspiciousRow[] = USE_MOCKS
    ? DEMO_SUSPICIOUS_SUBMISSIONS.map((s) => ({
        attemptId: s.attemptId,
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        examTitle: s.examTitle,
        submittedAt: s.submittedAt,
        totalEvents: s.eventCount,
        eventsByType: {
          ...(s.tabSwitches > 0 ? { TAB_SWITCH: s.tabSwitches } : {}),
          ...(s.pastes > 0 ? { PASTE: s.pastes } : {}),
          ...(s.fullscreenExits > 0 ? { FULLSCREEN_EXIT: s.fullscreenExits } : {}),
        },
      }))
    : (suspiciousQuery.data ?? [])
  const recent = USE_MOCKS
    ? DEMO_TEACHER_DASHBOARD.recentSubmissions
    : (dashboardQuery.data?.recentSubmissions ?? [])

  const firstPending = pending[0]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Bài nộp & Chấm điểm" },
        ]}
        title="Quản lý Bài nộp & Chấm điểm"
        description="Danh sách bài làm của học sinh chờ chấm điểm Writing và theo dõi lịch sử làm bài"
        actions={
          pendingCount > 0 && firstPending ? (
            <Button variant="default" size="sm" asChild className="gap-2 font-semibold">
              <Link href={`/teacher/grading/${firstPending.attemptId}`}>
                <HugeiconsIcon icon={Award01Icon} size={16} />
                <span>Bắt đầu chấm bài ({pendingCount})</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="gap-2 font-semibold"
              disabled
              title="Không còn bài chờ chấm"
            >
              <HugeiconsIcon icon={Award01Icon} size={16} />
              <span>Bắt đầu chấm bài (0)</span>
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="pending" className="gap-2 text-xs">
            <span>Chờ chấm Writing</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="suspicious" className="gap-2 text-xs">
            <span>Cần kiểm tra</span>
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px] h-4">
              {suspicious.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">
            Gần đây
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {!USE_MOCKS && pendingQuery.isLoading ? (
            <TableSkeleton />
          ) : !USE_MOCKS && pendingQuery.isError ? (
            <QueryError error={pendingQuery.error} onRetry={() => pendingQuery.refetch()} />
          ) : pending.length === 0 ? (
            <EmptyState
              icon={CheckmarkCircle02Icon}
              title="Không có bài nào chờ chấm"
              description="Tất cả bài Writing đã nộp đều đã được chấm xong."
            />
          ) : (
            <Card className="border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học sinh</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Đề thi</TableHead>
                      <TableHead>Thời gian nộp</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((item) => (
                      <TableRow key={item.attemptId}>
                        <TableCell className="font-semibold text-foreground">
                          {item.studentName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.studentEmail}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {item.examTitle}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.submittedAt)}
                        </TableCell>
                        <TableCell>
                          {item.hasSuspiciousActivity ? (
                            <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
                              <HugeiconsIcon icon={Alert02Icon} size={12} />
                              <span>Có sự kiện bất thường</span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Bình thường</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                              <Link href={`/teacher/submissions/${item.attemptId}`}>Xem bài</Link>
                            </Button>
                            <Button size="sm" className="h-8 text-xs font-semibold gap-1.5" asChild>
                              <Link href={`/teacher/grading/${item.attemptId}`}>
                                <HugeiconsIcon icon={Award01Icon} size={14} />
                                <span>Chấm bài</span>
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-4">
          {!USE_MOCKS && suspiciousQuery.isLoading ? (
            <TableSkeleton />
          ) : !USE_MOCKS && suspiciousQuery.isError ? (
            <QueryError error={suspiciousQuery.error} onRetry={() => suspiciousQuery.refetch()} />
          ) : suspicious.length === 0 ? (
            <EmptyState
              icon={Shield01Icon}
              title="Không có bài nào cần kiểm tra"
              description="Chưa ghi nhận bài làm nào có hành vi bất thường."
            />
          ) : (
            <Card className="border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học sinh</TableHead>
                      <TableHead>Đề thi</TableHead>
                      <TableHead>Thời gian nộp</TableHead>
                      <TableHead>Sự kiện ghi nhận</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suspicious.map((item) => (
                      <TableRow key={item.attemptId}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{item.studentName}</div>
                          {item.studentEmail ? (
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {item.studentEmail}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{item.examTitle}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="destructive" className="text-[10px] font-normal gap-1">
                              <HugeiconsIcon icon={Alert02Icon} size={10} />
                              {item.totalEvents} sự kiện
                            </Badge>
                            {(item.eventsByType.TAB_SWITCH ?? 0) + (item.eventsByType.WINDOW_BLUR ?? 0) > 0 && (
                              <Badge variant="destructive" className="text-[10px] font-normal">
                                {(item.eventsByType.TAB_SWITCH ?? 0) + (item.eventsByType.WINDOW_BLUR ?? 0)} lần rời tab
                              </Badge>
                            )}
                            {(item.eventsByType.PASTE ?? 0) > 0 && (
                              <Badge variant="destructive" className="text-[10px] font-normal gap-1">
                                <HugeiconsIcon icon={Copy01Icon} size={10} />
                                {item.eventsByType.PASTE} lần dán
                              </Badge>
                            )}
                            {(item.eventsByType.FULLSCREEN_EXIT ?? 0) > 0 && (
                              <Badge variant="outline" className="text-[10px] font-normal gap-1">
                                <HugeiconsIcon icon={MaximizeScreenIcon} size={10} />
                                {item.eventsByType.FULLSCREEN_EXIT} lần thoát fullscreen
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                            <Link href={`/teacher/submissions/${item.attemptId}`}>Xem bài</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {!USE_MOCKS && dashboardQuery.isLoading ? (
            <TableSkeleton />
          ) : !USE_MOCKS && dashboardQuery.isError ? (
            <QueryError error={dashboardQuery.error} onRetry={() => dashboardQuery.refetch()} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="Chưa có bài nộp gần đây"
              description="Các bài học sinh vừa nộp sẽ hiển thị tại đây."
            />
          ) : (
            <Card className="border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học sinh</TableHead>
                      <TableHead>Đề thi</TableHead>
                      <TableHead>Thời gian nộp</TableHead>
                      <TableHead className="text-center font-mono">Overall</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((item) => (
                      <TableRow key={item.attemptId}>
                        <TableCell className="font-semibold text-foreground">
                          {item.studentName}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {item.examTitle}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={Clock01Icon} size={12} />
                            {formatDate(item.submittedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                          {formatBand(item.overallBand)}
                        </TableCell>
                        <TableCell>
                          {item.suspicious ? (
                            <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
                              <HugeiconsIcon icon={Alert02Icon} size={12} />
                              <span>Cần kiểm tra</span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Bình thường</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                            <Link href={`/teacher/submissions/${item.attemptId}`}>Xem bài</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
