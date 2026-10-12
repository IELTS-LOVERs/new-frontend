"use client"

import * as React from "react"
import Link from "next/link"
import { parseAsInteger, useQueryState } from "nuqs"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
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
  Award01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Book02Icon,
} from "@hugeicons/core-free-icons"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { formatBand, formatDate } from "@/lib/format"
import { useMyAttemptsQuery } from "@/hooks/use-attempts"
import type { MyAttemptItem } from "@/lib/api/attempts"
import { DEMO_STUDENT_DASHBOARD } from "@/mocks/demo-data"

const PAGE_LIMIT = 10

export default function StudentResultsListPage() {
  if (USE_MOCKS) {
    return <MockResultsList />
  }
  return <RealResultsList />
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
function MockResultsList() {
  const mockItems: MyAttemptItem[] = DEMO_STUDENT_DASHBOARD.recentAttempts.map((att) => ({
    id: att.id,
    exam: { id: "exam-mock-01", title: att.examTitle, durationMinutes: 165 },
    assignmentId: null,
    startedAt: att.submittedAt,
    expiresAt: att.submittedAt,
    submittedAt: att.submittedAt,
    status: att.status === "expired" ? "expired" : "submitted",
    scores: att.scores,
  }))
  return (
    <ResultsListView
      items={mockItems}
      isLoading={false}
      error={null}
      refetch={() => {}}
      pagination={{ total: mockItems.length, page: 1, limit: PAGE_LIMIT, totalPages: 1 }}
    />
  )
}

// ─── REAL ────────────────────────────────────────────────────────────────────
function RealResultsList() {
  const [page] = useQueryState("page", parseAsInteger.withDefault(1))

  // Gọi cả 2 trạng thái đã hoàn thành để merge — submitted & expired (auto-submit hết giờ)
  const submittedQuery = useMyAttemptsQuery({ status: "submitted", page, limit: PAGE_LIMIT })
  const expiredQuery = useMyAttemptsQuery({ status: "expired", page, limit: PAGE_LIMIT })

  const isLoading = submittedQuery.isLoading || expiredQuery.isLoading
  const error = submittedQuery.error ?? expiredQuery.error

  const items = React.useMemo<MyAttemptItem[]>(() => {
    const submitted = submittedQuery.data?.items ?? []
    const expired = expiredQuery.data?.items ?? []
    // Merge & sort theo submittedAt desc (server là source of truth cho ngày nộp)
    const merged = [...submitted, ...expired]
    merged.sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
      return tb - ta
    })
    return merged
  }, [submittedQuery.data, expiredQuery.data])

  // Pagination: tổng hợp từ cả 2 list (ước lượng — backend chưa hỗ trợ status multi)
  const pagination = React.useMemo(() => {
    const sub = submittedQuery.data?.pagination
    const exp = expiredQuery.data?.pagination
    const total = (sub?.total ?? 0) + (exp?.total ?? 0)
    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
    return { total, page, limit: PAGE_LIMIT, totalPages }
  }, [submittedQuery.data, expiredQuery.data, page])

  const refetch = () => {
    submittedQuery.refetch()
    expiredQuery.refetch()
  }

  return (
    <ResultsListView
      items={items}
      isLoading={isLoading}
      error={error}
      refetch={refetch}
      pagination={pagination}
    />
  )
}

// ─── Shared View ─────────────────────────────────────────────────────────────
function ResultsListView({
  items,
  isLoading,
  error,
  refetch,
  pagination,
}: {
  items: MyAttemptItem[]
  isLoading: boolean
  error: unknown
  refetch: () => void
  pagination: { total: number; page: number; limit: number; totalPages: number }
}) {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Lịch sử kết quả thi & bảng điểm"
          description="Xem lại chi tiết từng bài thi và nhận xét đánh giá của giáo viên"
        />
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Không tải được danh sách kết quả."
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Lịch sử kết quả thi & bảng điểm"
          description="Xem lại chi tiết từng bài thi và nhận xét đánh giá của giáo viên"
        />
        <EmptyState
          icon={Award01Icon}
          title="Không tải được kết quả"
          description={message}
          action={
            <Button variant="default" size="sm" onClick={refetch} className="font-semibold">
              Thử lại
            </Button>
          }
        />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Lịch sử kết quả thi & bảng điểm"
          description="Xem lại chi tiết từng bài thi và nhận xét đánh giá của giáo viên"
        />
        <EmptyState
          icon={Book02Icon}
          title="Chưa có bài thi nào đã nộp"
          description="Hoàn thành bài thi đầu tiên để xem điểm số và nhận xét chi tiết tại đây."
          action={
            <Button variant="default" size="sm" asChild className="font-semibold">
              <Link href="/student/assignments">Xem danh sách bài tập</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Lịch sử kết quả thi & bảng điểm"
        description="Xem lại chi tiết từng bài thi và nhận xét đánh giá của giáo viên"
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Tên đề thi</TableHead>
              <TableHead className="text-center font-mono text-xs w-24">Listening</TableHead>
              <TableHead className="text-center font-mono text-xs w-24">Reading</TableHead>
              <TableHead className="text-center font-mono text-xs w-24">Writing</TableHead>
              <TableHead className="text-center font-mono text-xs w-24">Overall</TableHead>
              <TableHead className="text-xs hidden sm:table-cell w-36">Thời gian nộp</TableHead>
              <TableHead className="text-xs hidden md:table-cell w-32">Trạng thái</TableHead>
              <TableHead className="text-right text-xs w-28">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((att) => {
              // G11 fallback: không biết đề có Writing hay không nếu chưa fetch exam detail.
              // Nếu exam.skills có "writing" nhưng writingBand chưa về → "Chờ chấm".
              // Nếu không có skills info → dùng heuristics: writingBand == null && overallBand == null.
              const hasWritingSkill = att.exam.skills?.includes("writing") ?? (
                att.scores.writingBand == null && att.scores.overallBand == null
              )
              const isWritingPending =
                hasWritingSkill &&
                att.scores.writingBand == null &&
                att.scores.writingTask1Band == null &&
                att.scores.writingTask2Band == null

              return (
                <TableRow key={att.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-xs sm:text-sm text-foreground">
                    <Link
                      href={`/student/results/${att.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {att.exam.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-medium">
                    {formatBand(att.scores.listeningBand)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-medium">
                    {formatBand(att.scores.readingBand)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-medium">
                    {formatBand(att.scores.writingBand)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-semibold text-primary">
                    {formatBand(att.scores.overallBand)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                    {formatDate(att.submittedAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {isWritingPending ? (
                      <StatusBadge status="warning" label="Chờ chấm Writing" />
                    ) : att.status === "expired" ? (
                      <StatusBadge status="danger" label="Hết giờ" />
                    ) : (
                      <StatusBadge status="completed" label="Đã chấm xong" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="h-7 text-xs font-medium px-2.5" asChild>
                      <Link href={`/student/results/${att.id}`}>Xem bài</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — server-side qua nuqs ?page= */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Trang <span className="font-semibold text-foreground">{pagination.page}</span> /{" "}
            {pagination.totalPages} · Tổng{" "}
            <span className="font-semibold text-foreground">{pagination.total}</span> bài
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
