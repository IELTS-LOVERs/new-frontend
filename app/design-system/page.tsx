"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  CardFooter,
} from "@/components/ui/card"
import { ListRow } from "@/components/shared/list-row"
import { EmptyState } from "@/components/shared/empty-state"
import {
  SubmissionStatusBadge,
  ExamStatusBadge,
  AssignmentStatusBadge,
  WritingPendingBadge,
  SuspiciousBadge,
} from "@/components/shared/status-badge"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Book02Icon,
  Delete02Icon,
  Edit02Icon,
  File01Icon,
  Moon02Icon,
  PlusSignIcon,
  Sun01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"

export default function DesignSystemPage() {
  const { setTheme, resolvedTheme } = useTheme()
  // useSyncExternalStore tránh setState trong effect và vẫn chống hydration mismatch
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const currentTheme = mounted ? resolvedTheme : "light"

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Top Header / Theme Switcher (M31) */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
              IL
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold leading-tight text-foreground">
                IELTS LOVERs · Design System
              </h1>
              <p className="text-xs text-muted-foreground text-pretty">
                Gu Flat · Giữ nguyên màu nhấn Violet · Next.js 16 + Tailwind v4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              Giao diện:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
              className="gap-1.5"
              aria-label="Chuyển đổi giao diện sáng và tối"
            >
              {mounted && currentTheme === "dark" ? (
                <>
                  <HugeiconsIcon icon={Sun01Icon} size={14} />
                  <span>Sáng</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Moon02Icon} size={14} />
                  <span>Tối</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-8">
        {/* =========================================================================
            1. KHỐI MÀU & ĐỘ TƯƠNG PHẢN (D9)
           ========================================================================= */}
        <section aria-labelledby="section-colors" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-colors" className="font-heading text-xl font-semibold text-foreground">
              1. Màu sắc &amp; Độ tương phản
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Màu nhấn violet hiện có giữ nguyên; 95% trung tính, 5% điểm nhấn (M2). Bảng màu khai hai theme sáng và tối.
            </p>
          </div>

          {/* Color Palettes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {/* Primary Accent */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="h-12 w-full rounded-lg bg-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">--primary</p>
                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">oklch(0.49)</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Nhấn (Violet)</p>
              </div>
            </div>

            {/* Background */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="h-12 w-full rounded-lg bg-background border border-border" />
              <div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">--background</p>
                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">#f4f4f6 / #05060f</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Nền trang</p>
              </div>
            </div>

            {/* Surface */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="h-12 w-full rounded-lg bg-surface border border-border-strong" />
              <div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">--surface</p>
                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">#ffffff / #0f111a</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Nền card</p>
              </div>
            </div>

            {/* Secondary */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="h-12 w-full rounded-lg bg-secondary" />
              <div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">--secondary</p>
                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">#e7e8ec</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Nút phụ</p>
              </div>
            </div>

            {/* Border Strong */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="h-12 w-full rounded-lg bg-surface border-2 border-border-strong" />
              <div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">--border-strong</p>
                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">#eaeaea</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Viền input</p>
              </div>
            </div>

            {/* Border Hairline */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="h-12 w-full rounded-lg bg-surface border border-border" />
              <div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">--border</p>
                <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">#f0f0f3</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Đường tóc</p>
              </div>
            </div>
          </div>

          {/* Semantic Tones Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3">
              <div className="size-8 rounded-full bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-semibold text-xs shrink-0">
                ✓
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">Thành công</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">#007a55</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3">
              <div className="size-8 rounded-full bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-orange-400 font-semibold text-xs shrink-0">
                !
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">Cảnh báo</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">#bb4d00</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3">
              <div className="size-8 rounded-full bg-red-50 dark:bg-red-500/15 flex items-center justify-center text-red-700 dark:text-red-400 font-semibold text-xs shrink-0">
                ✕
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">Lỗi</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">#fb2c36</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3">
              <div className="size-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-700 dark:text-rose-400 font-semibold text-xs shrink-0">
                🗑
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">Nguy hiểm</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">#c70036</p>
              </div>
            </div>
          </div>

          {/* Contrast Verification (D9): Table on md+, Clean card list on mobile */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-surface">
              <h3 className="font-heading text-sm font-semibold text-foreground text-pretty">
                Đo tỉ lệ tương phản chữ trên nền (tiêu chuẩn WCAG AA ≥ 4.5:1)
              </h3>
            </div>

            {/* Mobile / Tablet list view under md */}
            <div className="md:hidden divide-y divide-border text-xs p-2">
              <div className="p-3 space-y-1">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Chữ chính trên Card</span>
                  <span className="font-mono">13.5 : 1 / 14.8 : 1</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-mono text-xs">
                  <span>#2c2c2c trên #ffffff</span>
                  <span>#e9edf5 trên #0f111a</span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Chữ chính trên Nền trang</span>
                  <span className="font-mono">11.8 : 1 / 16.2 : 1</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-mono text-xs">
                  <span>#2c2c2c trên #f4f4f6</span>
                  <span>#e9edf5 trên #05060f</span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Chữ phụ trên Card</span>
                  <span className="font-mono">4.95 : 1 / 5.8 : 1</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-mono text-xs">
                  <span>#707070 trên #ffffff</span>
                  <span>#8b93a7 trên #0f111a</span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Chữ phụ trên Nền trang</span>
                  <span className="font-mono">4.51 : 1 / 6.4 : 1</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-mono text-xs">
                  <span>#707070 trên #f4f4f6</span>
                  <span>#8b93a7 trên #05060f</span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Chữ trên Nền nhấn</span>
                  <span className="font-mono">7.2 : 1 / 8.4 : 1</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-mono text-xs">
                  <span>oklch(0.97) trên (0.49)</span>
                  <span>oklch(0.10) trên (0.68)</span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex justify-between font-medium text-foreground">
                  <span>Chữ nút xoá (Danger)</span>
                  <span className="font-mono">5.2 : 1 / 6.2 : 1</span>
                </div>
                <div className="flex justify-between text-muted-foreground font-mono text-xs">
                  <span>#c70036 trên rose-500/10</span>
                  <span>#ff637e trên rose-500/10</span>
                </div>
              </div>
            </div>

            {/* Desktop table (md+) */}
            <div className="hidden md:block overflow-x-auto outline-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/30">
                    <th className="px-5 py-2.5 font-medium whitespace-nowrap">Cặp màu (Chữ / Nền)</th>
                    <th className="px-5 py-2.5 font-medium whitespace-nowrap">Bản sáng (Light)</th>
                    <th className="px-5 py-2.5 font-medium whitespace-nowrap">Bản tối (Dark)</th>
                    <th className="px-5 py-2.5 font-medium whitespace-nowrap">Tỉ lệ đo được</th>
                    <th className="px-5 py-2.5 font-medium whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">Chữ chính trên Card</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#2c2c2c trên #ffffff</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#e9edf5 trên #0f111a</td>
                    <td className="px-5 py-3 font-mono font-medium whitespace-nowrap">13.5 : 1 / 14.8 : 1</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">Chữ chính trên Nền trang</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#2c2c2c trên #f4f4f6</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#e9edf5 trên #05060f</td>
                    <td className="px-5 py-3 font-mono font-medium whitespace-nowrap">11.8 : 1 / 16.2 : 1</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">Chữ phụ trên Card</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#707070 trên #ffffff</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#8b93a7 trên #0f111a</td>
                    <td className="px-5 py-3 font-mono font-medium whitespace-nowrap">4.95 : 1 / 5.8 : 1</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">Chữ phụ trên Nền trang</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#707070 trên #f4f4f6</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#8b93a7 trên #05060f</td>
                    <td className="px-5 py-3 font-mono font-medium whitespace-nowrap">4.51 : 1 / 6.4 : 1</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">Chữ trên Nền nhấn (Primary)</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">oklch(0.97) trên oklch(0.49)</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">oklch(0.10) trên oklch(0.68)</td>
                    <td className="px-5 py-3 font-mono font-medium whitespace-nowrap">7.2 : 1 / 8.4 : 1</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">Chữ nút xoá trên Nền đỏ mờ</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#c70036 trên rose-500/10</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">#ff637e trên rose-500/10</td>
                    <td className="px-5 py-3 font-mono font-medium whitespace-nowrap">5.2 : 1 / 6.2 : 1</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. KHỐI CHỮ & TYPOGRAPHY SCALE (D9, T5, T8)
           ========================================================================= */}
        <section aria-labelledby="section-typography" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-typography" className="font-heading text-xl font-semibold text-foreground">
              2. Thang cỡ chữ (Typography Scale)
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Phân vai bằng weight, không dùng font thứ hai tùy tiện. Chữ tiếng Việt chuẩn dấu (T5), thứ bậc: Tên trang (xl) &gt; Tiêu đề khối (lg) &gt; Tiêu đề card (base) &gt; Nội dung app (sm).
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border pb-3">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">text-xl · font-semibold</span>
              <p className="text-xl font-semibold text-foreground text-pretty">
                Tên trang: Bảng điều khiển học tập và kết quả thi IELTS
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border pb-3">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">text-lg · font-semibold</span>
              <p className="text-lg font-semibold text-foreground text-pretty">
                Tiêu đề khối: Danh sách bài kiểm tra gần đây của học viên
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border pb-3">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">text-base · font-semibold</span>
              <p className="text-base font-semibold text-foreground text-pretty">
                Tiêu đề thẻ: IELTS Academic Reading Test 04 — Passage 2
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border pb-3">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">text-sm · font-medium</span>
              <p className="text-sm font-medium text-foreground text-pretty">
                Nút &amp; Điều khiển: Nộp bài kiểm tra · Tiếp tục làm bài
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border pb-3">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">text-sm · font-normal</span>
              <p className="text-sm text-foreground text-pretty">
                Mặc định app: Bài thi gồm 40 câu hỏi, thời gian làm bài 60 phút không tính thời gian đọc hướng dẫn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">text-xs · font-medium</span>
              <p className="text-xs font-medium text-muted-foreground text-pretty">
                Nhãn phụ &amp; Dấu thời gian: Cập nhật 10 phút trước · Mã bài tập: IL-WR-2026
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. KHOẢNG CÁCH, BO GÓC, HAI VAI VIỀN & BÓNG (D9, F1, M14, M15)
           ========================================================================= */}
        <section aria-labelledby="section-geometry" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-geometry" className="font-heading text-xl font-semibold text-foreground">
              3. Hình khối: Bo góc, Hai vai viền &amp; Bóng lớp nổi
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Bốn bậc bo góc theo chiều cao (F1). Đúng hai token viền chia theo vai trò (M14). Bóng chỉ cho lớp nổi (M15).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bo góc (F1) */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground">Bậc bo góc (F1)</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-2xl bg-muted/40 border border-border">
                  <span>rounded-2xl (16px)</span>
                  <span className="text-muted-foreground">Card, Modal</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border">
                  <span>rounded-xl (12px)</span>
                  <span className="text-muted-foreground">Nút, Input (≥ 40px)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                  <span>rounded-lg (8px)</span>
                  <span className="text-muted-foreground">Control nhỏ (&lt; 40px)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-full bg-muted/40 border border-border">
                  <span>rounded-full</span>
                  <span className="text-muted-foreground whitespace-nowrap">Badge, Avatar</span>
                </div>
              </div>
            </div>

            {/* Hai vai viền (M14) */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground">Hai vai viền (M14)</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl border border-border bg-surface">
                  <p className="font-semibold text-foreground">--border (Trang trí)</p>
                  <p className="text-muted-foreground text-xs mt-0.5 text-pretty">
                    Đường tóc rất nhạt: viền card, đường kẻ danh sách, vạch dưới header.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-border-strong bg-surface">
                  <p className="font-semibold text-foreground text-pretty">--border-strong (Chức năng tương tác)</p>
                  <p className="text-muted-foreground text-xs mt-0.5 text-pretty">
                    Đậm hơn một bậc: viền ô nhập, viền nút outline để báo vùng tương tác.
                  </p>
                </div>
              </div>
            </div>

            {/* Bóng lớp nổi (M15) */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground">Bóng lớp nổi (M15)</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl border border-border bg-surface shadow-popover">
                  <p className="font-semibold text-foreground">shadow-popover</p>
                  <p className="text-muted-foreground text-xs mt-0.5 text-pretty">
                    Cho dropdown, popover, tooltip, toast.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface shadow-modal">
                  <p className="font-semibold text-foreground">shadow-modal</p>
                  <p className="text-muted-foreground text-xs mt-0.5 text-pretty">
                    Cho modal, hộp thoại xác nhận, panel trượt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. BẢY NGUYÊN TỐ CỦA D1 (MỖI TRẠNG THÁI MỘT VÍ DỤ TĨNH CẠNH NHAU)
           ========================================================================= */}

        {/* 4.1. NGUYÊN TỐ 1: NÚT (BUTTON) */}
        <section aria-labelledby="section-button" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-button" className="font-heading text-xl font-semibold text-foreground">
              4.1. Nút (Button) · 4 dạng, hết
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Nút mặc định là <code>outline</code>. Nền nhấn <code>primary</code> dành cho hành động duy nhất cần nổi. Nút nguy hiểm nền mờ chữ đỏ (I4, locked-rules #2).
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-6">
            {/* Outline (Mặc định) */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Outline (Mặc định)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <span className="block text-xs text-muted-foreground mb-1.5">Thường</span>
                  <Button variant="outline" className="w-full">
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                    Chỉnh sửa
                  </Button>
                </div>

                <div inert data-demo-state="hover">
                  <span className="block text-xs text-muted-foreground mb-1.5">Rê</span>
                  <Button variant="outline" className="w-full bg-button-hover">
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                    Chỉnh sửa
                  </Button>
                </div>

                <div inert data-demo-state="focus">
                  <span className="block text-xs text-muted-foreground mb-1.5">Focus</span>
                  <Button variant="outline" className="w-full ring-2 ring-ring">
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                    Chỉnh sửa
                  </Button>
                </div>

                <div>
                  <span className="block text-xs text-muted-foreground mb-1.5">Khoá</span>
                  <Button variant="outline" disabled className="w-full">
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                    Chỉnh sửa
                  </Button>
                </div>

                <div>
                  <span className="block text-xs text-muted-foreground mb-1.5">Đang tải</span>
                  <Button variant="outline" isLoading className="w-full">
                    Chỉnh sửa
                  </Button>
                </div>
              </div>
            </div>

            {/* Primary (Hành động chính) */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Primary (Hành động chính duy nhất)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <span className="block text-xs text-muted-foreground mb-1.5">Thường</span>
                  <Button variant="default" className="w-full">
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    Giao bài mới
                  </Button>
                </div>

                <div inert data-demo-state="hover">
                  <span className="block text-xs text-muted-foreground mb-1.5">Rê</span>
                  <Button variant="default" className="w-full bg-primary-hover">
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    Giao bài mới
                  </Button>
                </div>

                <div inert data-demo-state="focus">
                  <span className="block text-xs text-muted-foreground mb-1.5">Focus</span>
                  <Button variant="default" className="w-full ring-2 ring-ring">
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    Giao bài mới
                  </Button>
                </div>

                <div>
                  <span className="block text-xs text-muted-foreground mb-1.5">Khoá</span>
                  <Button variant="default" disabled className="w-full">
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    Giao bài mới
                  </Button>
                </div>

                <div>
                  <span className="block text-xs text-muted-foreground mb-1.5">Đang tải</span>
                  <Button variant="default" isLoading className="w-full">
                    Giao bài mới
                  </Button>
                </div>
              </div>
            </div>

            {/* Secondary & Ghost & Destructive */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Secondary (Nền xám)</span>
                <Button variant="secondary" className="w-full">
                  Huỷ bỏ
                </Button>
              </div>

              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Ghost (Hành động phụ)</span>
                <Button variant="ghost" className="w-full">
                  <HugeiconsIcon icon={ViewIcon} size={16} />
                  Xem chi tiết
                </Button>
              </div>

              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Destructive (Nguy hiểm · Rose mờ)</span>
                <Button variant="destructive" className="w-full">
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                  Xoá bài tập
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 4.2. NGUYÊN TỐ 2: BADGE TRẠNG THÁI */}
        <section aria-labelledby="section-badge" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-badge" className="font-heading text-xl font-semibold text-foreground">
              4.2. Badge trạng thái (Status Badge) · Một bảng ánh xạ (D2, M7)
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Hình dáng pill bo tròn, chấm tròn cùng tông, ring viền trong mờ (M7) để không tan vào nền trắng hay xám.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Chưa làm (Neutral)</span>
                <SubmissionStatusBadge status="not_started" />
              </div>

              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Đang làm (Warning)</span>
                <SubmissionStatusBadge status="in_progress" />
              </div>

              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Đã nộp (Success)</span>
                <SubmissionStatusBadge status="submitted" />
              </div>

              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Hết giờ (Error)</span>
                <SubmissionStatusBadge status="expired" />
              </div>

              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Chờ chấm (Warning)</span>
                <WritingPendingBadge />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Đã xuất bản</span>
                <ExamStatusBadge status="published" />
              </div>
              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Đã đóng đề</span>
                <ExamStatusBadge status="closed" />
              </div>
              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Đang mở bài</span>
                <AssignmentStatusBadge status="active" />
              </div>
              <div>
                <span className="block text-xs text-muted-foreground mb-1.5">Cảnh báo</span>
                <SuspiciousBadge label="Vi phạm tab" />
              </div>
            </div>
          </div>
        </section>

        {/* 4.3. NGUYÊN TỐ 3: Ô NHẬP (INPUT) */}
        <section aria-labelledby="section-input" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-input" className="font-heading text-xl font-semibold text-foreground">
              4.3. Ô nhập (Input) · h-11 md:h-10, viền chức năng
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Ô nhập luôn mang nền <code>bg-surface</code> (không bao giờ trong suốt). Focus có quầng mờ <code>ring-focus</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              {/* Thường */}
              <div className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">Thường</span>
                <label htmlFor="demo-input-normal" className="block text-sm font-medium text-foreground">
                  Họ và tên học viên
                </label>
                <Input
                  id="demo-input-normal"
                  defaultValue="Nguyễn Văn An"
                  placeholder="Nhập họ và tên..."
                />
                <p className="min-h-4 text-xs text-muted-foreground text-pretty">
                  Nhập tên đầy đủ như trên giấy tờ.
                </p>
              </div>

              {/* Đang gõ / Focus */}
              <div inert data-demo-state="focus" className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">Đang gõ (Focus)</span>
                <label htmlFor="demo-input-focus" className="block text-sm font-medium text-foreground">
                  Địa chỉ email
                </label>
                <Input
                  id="demo-input-focus"
                  defaultValue="nguyen.an@ielts"
                  className="border-focus ring-2 ring-focus"
                />
                <p className="min-h-4 text-xs text-muted-foreground text-pretty">
                  Địa chỉ email dùng để nhận kết quả bài thi.
                </p>
              </div>

              {/* Lỗi */}
              <div inert data-demo-state="error" className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">Lỗi (Error)</span>
                <label htmlFor="demo-input-error" className="block text-sm font-medium text-foreground">
                  Điểm mục tiêu
                </label>
                <Input
                  id="demo-input-error"
                  defaultValue="10.5"
                  aria-invalid="true"
                />
                <p className="min-h-4 text-xs text-red-600 dark:text-red-400 text-pretty">
                  Điểm IELTS band chỉ từ 1.0 đến 9.0.
                </p>
              </div>

              {/* Khoá */}
              <div className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">Khoá (Disabled)</span>
                <label htmlFor="demo-input-disabled" className="block text-sm font-medium text-muted-foreground">
                  Mã lớp học (Cố định)
                </label>
                <Input
                  id="demo-input-disabled"
                  disabled
                  defaultValue="IELTS-INT-2026"
                />
                <p className="min-h-4 text-xs text-muted-foreground text-pretty">
                  Không thể thay đổi mã lớp đã gán.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4.4. NGUYÊN TỐ 4: CARD */}
        <section aria-labelledby="section-card" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-card" className="font-heading text-xl font-semibold text-foreground">
              4.4. Thẻ (Card) · Phẳng, viền tóc 1px, không bóng
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Card tách khối bằng viền 1px <code>border-border</code> (M13). Tiêu đề <code>text-base font-semibold</code>, nút thao tác nằm ở góc phải header.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Chuẩn */}
            <Card>
              <CardHeader hasAction>
                <div>
                  <CardTitle>Tiến độ luyện thi IELTS Academic</CardTitle>
                  <CardDescription>Cập nhật sau mỗi bài thi thử hoàn thành</CardDescription>
                </div>
                <CardAction>
                  <Button variant="outline" size="sm">
                    Xem báo cáo
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-background border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Listening</p>
                    <p className="font-mono text-base font-semibold text-foreground mt-0.5">7.5</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reading</p>
                    <p className="font-mono text-base font-semibold text-foreground mt-0.5">8.0</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Overall</p>
                    <p className="font-mono text-base font-semibold text-primary mt-0.5">7.5</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-muted-foreground">Lần thi gần nhất: Hôm qua 15:30</span>
              </CardFooter>
            </Card>

            {/* Card Danh sách lồng (Flush List) */}
            <Card isFlushList>
              <CardHeader hasAction className="px-5">
                <div>
                  <CardTitle>Nhiệm vụ cần làm tuần này</CardTitle>
                  <CardDescription>2 bài tập đang mở cần hoàn thành</CardDescription>
                </div>
                <CardAction>
                  <Button variant="ghost" size="sm">
                    Tất cả (2)
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent isFlushList>
                <ul className="space-y-1">
                  <ListRow
                    leading={<HugeiconsIcon icon={Book02Icon} size={16} className="text-muted-foreground" />}
                    title="Reading Test 14 · Cam 19"
                    subtitle="Hạn chót: 23:59 hôm nay"
                    badge={<Badge variant="warning">Hôm nay</Badge>}
                  />
                  <ListRow
                    leading={<HugeiconsIcon icon={File01Icon} size={16} className="text-muted-foreground" />}
                    title="Writing Task 2 · Bar Chart"
                    subtitle="Hạn chót: Ngày mai"
                    badge={<Badge variant="neutral">Cần làm</Badge>}
                  />
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4.5. NGUYÊN TỐ 5: DÒNG DANH SÁCH (LIST ROW) */}
        <section aria-labelledby="section-listrow" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-listrow" className="font-heading text-xl font-semibold text-foreground">
              4.5. Dòng danh sách (List Row) · 3 tầng ưu tiên
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Hành động chính bên trái, nội dung ở giữa, hành động phụ ẩn bên phải hiện khi rê chuột (I9, list-row.md).
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <ul className="divide-y divide-border">
              {/* Thường */}
              <ListRow
                leading={
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground font-semibold text-xs">
                    R3
                  </div>
                }
                title="IELTS Reading Test 03"
                subtitle="Passage 1: Silk · 13 câu hỏi"
                badge={<Badge variant="success">Hoàn thành</Badge>}
                trailing={<span className="font-mono font-medium text-foreground">Band 8.0</span>}
                actions={
                  <Button variant="ghost" size="icon-sm" aria-label="Xem chi tiết">
                    <HugeiconsIcon icon={ViewIcon} size={14} />
                  </Button>
                }
              />

              {/* Đang rê chuột (Inert Demo Hover) */}
              <div inert data-demo-state="hover">
                <ListRow
                  className="bg-item-hover"
                  leading={
                    <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground font-semibold text-xs">
                      W1
                    </div>
                  }
                  title="Writing Task 1 — Line Graph"
                  subtitle="Nộp lúc 10:25 · Đang chờ chấm bài"
                  badge={<Badge variant="warning">Chờ chấm</Badge>}
                  trailing={<span className="text-muted-foreground">Chờ điểm</span>}
                  actions={
                    <>
                      <Button variant="ghost" size="icon-sm" aria-label="Chỉnh sửa bài">
                        <HugeiconsIcon icon={Edit02Icon} size={14} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Xem lại bài nộp">
                        <HugeiconsIcon icon={ViewIcon} size={14} />
                      </Button>
                    </>
                  }
                />
              </div>

              {/* Dòng khoá (Inert Demo Disabled) */}
              <div inert data-demo-state="disabled">
                <ListRow
                  isInteractive={false}
                  leading={
                    <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-foreground text-xs font-semibold">
                      L4
                    </div>
                  }
                  title="Listening Section 4"
                  subtitle="Chưa mở khoá section này"
                  badge={<Badge variant="neutral">Khoá</Badge>}
                  trailing={<span className="text-muted-foreground">--</span>}
                />
              </div>
            </ul>
          </div>
        </section>

        {/* 4.6. NGUYÊN TỐ 6: MODAL / HỘP THOẠI XÁC NHẬN */}
        <section aria-labelledby="section-modal" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-modal" className="font-heading text-xl font-semibold text-foreground">
              4.6. Hộp thoại (Modal / Dialog) · Shadow lớp nổi, tiêu đề rõ nghĩa
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Khung <code>shadow-modal</code>, nút xác nhận chỉ có chữ lặp lại động từ, tên đối tượng in đậm (overlay.md).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Khung tĩnh xem trước trạng thái mở (D9 inert demo) */}
            <div inert data-demo-state="open" className="rounded-2xl border border-border bg-surface p-6 shadow-modal">
              <span className="block text-xs font-semibold text-muted-foreground mb-3">
                [Khung tĩnh duyệt thiết kế · overlay.md]
              </span>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400">
                  <HugeiconsIcon icon={Delete02Icon} size={20} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Xoá bài thi này?
                </h3>
                <div className="col-span-2 mt-2 sm:col-span-1 sm:col-start-2 sm:mt-0.5">
                  <p className="text-sm/6 text-muted-foreground text-pretty">
                    Bài thi <span className="font-semibold text-foreground">IELTS Reading Test 04</span> cùng toàn bộ kết quả của 32 học sinh sẽ bị xoá vĩnh viễn và không thể khôi phục.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary">Huỷ</Button>
                <Button variant="destructive">Xoá bài thi</Button>
              </div>
            </div>

            {/* Bấm mở Modal thật */}
            <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col justify-between h-full">
              <div className="space-y-2">
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Trải nghiệm Dialog tương tác thực tế
                </h3>
                <p className="text-sm text-muted-foreground text-pretty">
                  Bấm nút bên dưới để mở component Radix UI Dialog thật với backdrop phủ mờ, phím Escape và bẫy tiêu điểm.
                </p>
              </div>

              <div className="pt-6">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      Mở Modal tương tác
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tạo bài tập mới cho lớp học</DialogTitle>
                      <DialogDescription>
                        Điền thông tin và thời hạn nộp bài cho học viên trong lớp IELTS Intensive.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <label htmlFor="modal-name" className="text-sm font-medium">Tên bài tập</label>
                        <Input id="modal-name" placeholder="Ví dụ: Reading Cambridge 19 Test 1" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="modal-due" className="text-sm font-medium">Hạn nộp bài</label>
                        <Input id="modal-due" placeholder="Ngày hết hạn (DD/MM/YYYY)" defaultValue="15/10/2026" />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                        Huỷ bỏ
                      </Button>
                      <Button variant="default" onClick={() => setIsDialogOpen(false)}>
                        Tạo bài tập
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </section>

        {/* 4.7. NGUYÊN TỐ 7: TRẠNG THÁI RỖNG (EMPTY STATE) */}
        <section aria-labelledby="section-empty" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="section-empty" className="font-heading text-xl font-semibold text-foreground">
              4.7. Trạng thái rỗng (Empty State) · Rõ ràng, có hướng dẫn tiếp theo
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-pretty">
              Viền nét đứt nhẹ, icon đóng khung 48px, tiêu đề giải thích tình trạng và có nút hành động tiếp theo.
            </p>
          </div>

          <EmptyState
            icon={Book02Icon}
            title="Chưa có bài tập nào được giao"
            description="Bạn hiện đã hoàn thành toàn bộ bài tập trong khóa học này. Hãy luyện tập thêm hoặc liên hệ giáo viên để nhận thêm đề thi."
            action={
              <Button variant="default" className="gap-1.5">
                <HugeiconsIcon icon={PlusSignIcon} size={16} />
                Luyện tập tự do
              </Button>
            }
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 px-4 sm:px-8 mt-16 text-center text-xs text-muted-foreground">
        IELTS LOVERs Design System · Radix UI + Tailwind v4 + Hugeicons
      </footer>
    </div>
  )
}
