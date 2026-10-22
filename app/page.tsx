"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BrandLogo } from "@/components/layout/brand-logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  VolumeHighIcon,
  Book02Icon,
  PencilEdit02Icon,
  Timer01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { useAuthStore } from "@/stores/auth.store"

export default function LandingPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  React.useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.replace("/admin/users")
      } else if (user.role === "teacher") {
        router.replace("/teacher")
      } else {
        router.replace("/student")
      }
    }
  }, [user, router])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo href="/" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Trải nghiệm thi
            </Link>
            <Link href="#teachers" className="hover:text-foreground transition-colors">
              Dành cho Giáo viên
            </Link>
            <Link href="#students" className="hover:text-foreground transition-colors">
              Dành cho Học sinh
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Button size="sm" className="h-8 text-xs font-medium" asChild>
                <Link href={user.role === "admin" ? "/admin/users" : user.role === "teacher" ? "/teacher" : "/student"}>
                  Vào Dashboard ({user.role === "admin" ? "Quản trị viên" : user.role === "teacher" ? "Giáo viên" : "Học sinh"})
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
                <Button size="sm" className="h-8 text-xs font-medium" asChild>
                  <Link href="/student">Vào học ngay</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-14 md:pt-24 md:pb-20 border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1 text-xs font-medium text-foreground mb-6">
            <span className="flex size-1.5 rounded-full bg-primary" />
            Nền tảng luyện thi IELTS Computer-delivered thế hệ mới
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.15] mb-5">
            Luyện IELTS <span className="text-primary">thực chất hơn</span>.
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed mb-8">
            Nền tảng giúp giáo viên giao bài, tổ chức thi thử và theo dõi tiến độ học sinh dễ dàng hơn với giao diện làm bài chuẩn quốc tế.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Button size="default" className="font-medium gap-2 px-5" asChild>
              <Link href="/student">
                <span>Bắt đầu học</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
              </Link>
            </Button>
            <Button size="default" variant="outline" className="font-medium px-5" asChild>
              <Link href="/teacher">Dành cho giáo viên</Link>
            </Button>
          </div>

          {/* Exam Simulator Mockup Preview */}
          <div className="relative mx-auto max-w-4xl rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between border-b border-border pb-3 px-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-destructive/60" />
                <span className="size-2.5 rounded-full bg-amber-500/60" />
                <span className="size-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-2 font-mono text-[11px] font-medium">ieltslovers.com/exam/mock-test-01</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <Badge variant="outline" className="text-primary font-medium text-[11px]">
                  ⏱ 48:32 còn lại
                </Badge>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                  ✓ Tự động lưu
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border bg-muted/10 p-5 text-left rounded-b-xl gap-5">
              {/* Left: Reading Passage preview */}
              <div className="space-y-2.5 font-serif text-xs sm:text-sm leading-relaxed text-foreground/90">
                <div className="text-[11px] font-mono font-medium text-primary uppercase tracking-wider">
                  Reading Passage 1 · Split-screen
                </div>
                <h4 className="font-heading font-semibold text-sm sm:text-base text-foreground">
                  The Evolutionary Miracle of Oceanic Mammals
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-4">
                  Cetaceans have long fascinated marine biologists with their acoustic adaptations. Over millions of years, land-dwelling ancestors transitioned into fully aquatic apex species with specialized echolocation pathways...
                </p>
                <div className="inline-block text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-0.5">
                  Cuộn độc lập hai vùng ↕
                </div>
              </div>

              {/* Right: Question preview */}
              <div className="space-y-3 text-xs">
                <div className="text-[11px] font-mono font-medium text-primary uppercase tracking-wider">
                  Questions 1–3 · True / False / Not Given
                </div>
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="font-medium text-foreground leading-normal">
                    1. Humpback whales communicate using structured melodic sequences.
                  </p>
                  <div className="flex gap-2 font-mono">
                    <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">
                      TRUE
                    </span>
                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      FALSE
                    </span>
                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      NOT GIVEN
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-muted-foreground pt-1 text-[11px]">
                  <span>Câu hỏi 1 / 40</span>
                  <Link href="/student/exams" className="text-primary font-medium hover:underline flex items-center gap-1">
                    Trải nghiệm trực tiếp →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Exam Experiences */}
      <section id="features" className="py-16 bg-muted/20 border-b border-border">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground mb-2">
              Trải nghiệm thi máy tính toàn diện
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Được thiết kế dựa trên tiêu chuẩn Computer-delivered IELTS quốc tế, đảm bảo sự tập trung cao độ và phản hồi tức thì.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card hover:bg-muted/20 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={VolumeHighIcon} size={20} />
                </div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  Listening Experience
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Trình phát âm thanh cố định luôn hiển thị, điều khiển âm lượng mượt mà và trực quan.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:bg-muted/20 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Book02Icon} size={20} />
                </div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  Reading Split-Screen
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hai vùng cuộn độc lập giữa bài đọc và câu hỏi, đối chiếu thông tin dễ dàng mà không mất dấu.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:bg-muted/20 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={PencilEdit02Icon} size={20} />
                </div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  Writing Workspace
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Khu vực làm bài Task 1 và Task 2 tách biệt, đếm từ thời gian thực và tự động lưu an toàn.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:bg-muted/20 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Timer01Icon} size={20} />
                </div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  Đồng bộ & Tự động lưu
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tự động lưu bài sau mỗi thao tác, sẵn sàng khôi phục phiên thi khi gặp sự cố mạng.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* For Teachers Highlights */}
      <section id="teachers" className="py-16 border-b border-border">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <Badge variant="secondary" className="font-medium text-xs">
                Dành cho Giáo viên & Trung tâm
              </Badge>
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-snug">
                Quản lý lớp học, giao đề và chấm Writing tập trung
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Tối ưu hoá quy trình giảng dạy. Giáo viên có thể tạo đề thi theo cấu trúc IELTS, giao bài cho cả lớp với mã lớp nhanh và chấm Writing với tiêu chí rõ ràng.
              </p>

              <div className="space-y-2.5">
                {[
                  "Quản lý học sinh qua Mã lớp (Class Code 6 ký tự)",
                  "Soạn đề thi linh hoạt: Chọn từ ngân hàng hoặc tạo câu hỏi mới",
                  "Writing Grading Studio: Chấm theo thang điểm chuẩn 0.5",
                  "Ghi nhận tiến độ làm bài và lịch sử nộp bài chi tiết",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-primary shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button size="default" className="font-medium" asChild>
                  <Link href="/teacher">Trải nghiệm Dashboard Giáo viên</Link>
                </Button>
              </div>
            </div>

            {/* Teacher Dashboard Mockup */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="font-heading font-semibold text-sm">Thầy Nguyễn Mạnh Hùng</h4>
                  <p className="text-xs text-muted-foreground">5 Lớp học · 128 Học sinh</p>
                </div>
                <Badge variant="secondary" className="text-xs font-normal">18 bài Writing chờ chấm</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-center">
                  <span className="text-[11px] text-muted-foreground">Học sinh</span>
                  <p className="font-mono font-semibold text-base text-foreground mt-0.5">128</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-center">
                  <span className="text-[11px] text-muted-foreground">Lớp học</span>
                  <p className="font-mono font-semibold text-base text-foreground mt-0.5">5</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-center">
                  <span className="text-[11px] text-muted-foreground">Band TB</span>
                  <p className="font-mono font-semibold text-base text-primary mt-0.5">6.4</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-foreground">IELTS Academic Mock Test 01</span>
                  <span className="text-muted-foreground">18/09/2026</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nguyễn Văn An · Đã nộp · L: 7.0, R: 6.5, Writing chờ chấm
                </p>
                <div className="pt-1 flex justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-xs font-medium" asChild>
                    <Link href="/teacher/submissions">Chấm bài ngay →</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-background py-6">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <BrandLogo href="/" compact />
          <p className="font-medium">
            IELTS LOVERs
          </p>
          <div className="flex items-center gap-5">
            <Link href="/student" className="hover:text-foreground transition-colors">Học sinh</Link>
            <Link href="/teacher" className="hover:text-foreground transition-colors">Giáo viên</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Đăng nhập</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
