"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  HeadphonesIcon,
  Book02Icon,
  PenTool01Icon,
  SparklesIcon,
  ArrowRight01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { useCreateExamMutation } from "@/hooks/use-exams"
import type { CreateExamSectionPayload } from "@/lib/api/exams"
import type { SkillType } from "@/lib/api/types"

interface ExamTemplate {
  id: string
  name: string
  description: string
  duration: number
  sections: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  buildSections: () => CreateExamSectionPayload[]
}

function listeningSection(part: number): CreateExamSectionPayload {
  return {
    skill: "listening" as SkillType,
    part,
    title: `Listening Part ${part}`,
    instructions: `Questions ${(part - 1) * 10 + 1}–${part * 10}`,
    mediaIds: [],
  }
}

function readingSection(part: number): CreateExamSectionPayload {
  return {
    skill: "reading" as SkillType,
    part,
    title: `Reading Passage ${part}`,
    instructions: `Questions ${(part - 1) * 13 + 1}–${part * 13}`,
    passageText: "",
    mediaIds: [],
  }
}

function writingSection(part: number): CreateExamSectionPayload {
  return {
    skill: "writing" as SkillType,
    part,
    title: `Writing Task ${part}`,
    instructions: part === 1 ? "Write at least 150 words." : "Write at least 250 words.",
    mediaIds: [],
  }
}

const MOCK_TEMPLATES: ExamTemplate[] = [
  {
    id: "full",
    name: "Full IELTS (L + R + W)",
    description: "Listening Part 1–4, Reading Passage 1–3, Writing Task 1–2.",
    duration: 165,
    sections: "9 phần · 3 kỹ năng",
    icon: SparklesIcon,
    buildSections: () => [
      ...[1, 2, 3, 4].map(listeningSection),
      ...[1, 2, 3].map(readingSection),
      ...[1, 2].map(writingSection),
    ],
  },
  {
    id: "listening",
    name: "Listening",
    description: "Listening Part 1–4 với 40 câu hỏi.",
    duration: 30,
    sections: "4 phần",
    icon: HeadphonesIcon,
    buildSections: () => [1, 2, 3, 4].map(listeningSection),
  },
  {
    id: "reading",
    name: "Reading",
    description: "Reading Passage 1–3 với 40 câu hỏi.",
    duration: 60,
    sections: "3 phần",
    icon: Book02Icon,
    buildSections: () => [1, 2, 3].map(readingSection),
  },
  {
    id: "writing",
    name: "Writing",
    description: "Writing Task 1 và Task 2.",
    duration: 60,
    sections: "2 phần",
    icon: PenTool01Icon,
    buildSections: () => [1, 2].map(writingSection),
  },
  {
    id: "custom",
    name: "Tuỳ chỉnh",
    description: "Bắt đầu với đề trống, tự thêm phần theo nhu cầu.",
    duration: 60,
    sections: "Trống",
    icon: PenTool01Icon,
    buildSections: () => [],
  },
]

const PRACTICE_TEMPLATES: ExamTemplate[] = [
  {
    id: "practice_reading_full",
    name: "Reading (Full 3 Passages)",
    description: "Bộ đề luyện tập đầy đủ 3 bài đọc (Passage 1–3) với 40 câu hỏi, thời gian 60 phút.",
    duration: 60,
    sections: "3 phần Reading",
    icon: Book02Icon,
    buildSections: () => [1, 2, 3].map(readingSection),
  },
  {
    id: "practice_reading",
    name: "Reading Passage lẻ (1 phần)",
    description: "Luyện 1 bài đọc (Passage) với 13-14 câu hỏi kèm thời gian 20 phút.",
    duration: 20,
    sections: "1 phần Reading",
    icon: Book02Icon,
    buildSections: () => [readingSection(1)],
  },
  {
    id: "practice_listening_full",
    name: "Listening (Full 4 Parts)",
    description: "Bộ đề luyện tập đầy đủ 4 phần nghe (Part 1–4) với 40 câu hỏi, thời gian 30 phút.",
    duration: 30,
    sections: "4 phần Listening",
    icon: HeadphonesIcon,
    buildSections: () => [1, 2, 3, 4].map(listeningSection),
  },
  {
    id: "practice_listening",
    name: "Listening Part lẻ (1 phần)",
    description: "Luyện 1 phần nghe (Part) với 10 câu hỏi kèm audio độc lập.",
    duration: 10,
    sections: "1 phần Listening",
    icon: HeadphonesIcon,
    buildSections: () => [listeningSection(1)],
  },
  {
    id: "practice_custom",
    name: "Tuỳ chỉnh nhiều phần",
    description: "Tạo bài luyện tập trống, cho phép tự do thêm nhiều Part/Passage tuỳ ý.",
    duration: 30,
    sections: "Đa phần tuỳ chọn",
    icon: SparklesIcon,
    buildSections: () => [readingSection(1)],
  },
]

export default function NewExamPage() {
  const router = useRouter()
  const [kindParam] = useQueryState("kind", parseAsString.withDefault("mock"))
  const isPractice = kindParam === "practice"

  const templates = isPractice ? PRACTICE_TEMPLATES : MOCK_TEMPLATES
  const [selected, setSelected] = React.useState(isPractice ? "practice_reading" : "full")
  const effectiveSelected = templates.some((t) => t.id === selected)
    ? selected
    : templates[0].id

  const createMutation = useCreateExamMutation()

  const handleCreate = async () => {
    const tpl = templates.find((t) => t.id === effectiveSelected) ?? templates[0]

    try {
      const created = await createMutation.mutateAsync({
        title: isPractice
          ? `Bài luyện tập ${tpl.name}`
          : tpl.id === "custom"
            ? "Đề thi mới"
            : `Đề thi ${tpl.name}`,
        description: tpl.description,
        durationMinutes: tpl.duration,
        kind: isPractice ? "practice" : "mock",
        scoringMode: isPractice ? "raw" : "band",
        curriculum: isPractice
          ? {
              part: 1,
            }
          : undefined,
        sections: tpl.buildSections(),
      })
      toast.success(isPractice ? "Đã tạo bản nháp bài luyện tập" : "Đã tạo bản nháp đề thi", {
        description: `Mẫu: ${tpl.name}`,
      })
      router.replace(`/teacher/exams/${created.id}/edit`)
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        toast.error(err.message || "Dữ liệu đề thi chưa hợp lệ.")
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể tạo đề thi. Vui lòng thử lại.")
      }
    }
  }

  const breadcrumbs = isPractice
    ? [
        { label: "Tổng quan", href: "/teacher" },
        { label: "Bài luyện tập", href: "/teacher/practices" },
        { label: "Tạo bài mới" },
      ]
    : [
        { label: "Tổng quan", href: "/teacher" },
        { label: "Đề thi", href: "/teacher/exams" },
        { label: "Tạo đề mới" },
      ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={isPractice ? "Tạo bài luyện tập mới (Practice)" : "Tạo đề thi mới (Mock Exam)"}
        description={
          isPractice
            ? "Bài luyện tập gồm đúng 1 section (Passage hoặc Part) để học sinh tự do ôn luyện từng kỹ năng."
            : "Chọn mẫu để khởi tạo bản nháp đề thi chính thức. Bạn có thể thêm/xoá phần và câu hỏi trong trình soạn đề."
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {templates.map((tpl) => {
          const active = effectiveSelected === tpl.id
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelected(tpl.id)}
              className={cn(
                "rounded-2xl border p-5 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <HugeiconsIcon icon={tpl.icon} size={22} />
                </span>
                {active && <Badge variant="default">Đã chọn</Badge>}
              </div>
              <h3 className="mt-3 font-heading text-base font-bold text-foreground">{tpl.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{tpl.description}</p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <HugeiconsIcon icon={Clock01Icon} size={12} /> {tpl.duration} phút
                </span>
                <span>·</span>
                <span>{tpl.sections}</span>
              </div>
            </button>
          )
        })}
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base font-bold">
              {isPractice ? "Sẵn sàng soạn bài luyện tập?" : "Sẵn sàng soạn đề thi?"}
            </CardTitle>
            <CardDescription className="text-xs">
              Bản nháp sẽ được tạo và tự động lưu. Bạn có thể cập nhật học liệu (video, từ vựng) bất cứ lúc nào.
            </CardDescription>
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? "Đang tạo…"
              : isPractice
                ? "Tạo bài luyện tập"
                : "Tạo đề thi"}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}
