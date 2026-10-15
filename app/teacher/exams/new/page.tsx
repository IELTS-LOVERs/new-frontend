"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { USE_MOCKS } from "@/lib/api/config"
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

const TEMPLATES: ExamTemplate[] = [
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

export default function NewExamPage() {
  const router = useRouter()
  const [selected, setSelected] = React.useState("full")
  const createMutation = useCreateExamMutation()

  const handleCreate = async () => {
    const tpl = TEMPLATES.find((t) => t.id === selected) ?? TEMPLATES[0]

    if (USE_MOCKS) {
      toast.success("Đã tạo bản nháp đề thi", {
        description: `Mẫu: ${tpl.name}`,
      })
      router.push("/teacher/exams/exam-writing-02/edit")
      return
    }

    try {
      const created = await createMutation.mutateAsync({
        title: tpl.id === "custom" ? "Đề thi mới" : `Đề thi ${tpl.name}`,
        description: tpl.description,
        durationMinutes: tpl.duration,
        sections: tpl.buildSections(),
      })
      toast.success("Đã tạo bản nháp đề thi", {
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Đề thi", href: "/teacher/exams" },
          { label: "Tạo đề mới" },
        ]}
        title="Tạo đề thi mới"
        description="Chọn mẫu để khởi tạo bản nháp. Bạn có thể thêm/xoá phần và câu hỏi sau trong trình soạn đề."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {TEMPLATES.map((tpl) => {
          const active = selected === tpl.id
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
            <CardTitle className="font-heading text-base font-bold">Sẵn sàng soạn đề?</CardTitle>
            <CardDescription className="text-xs">
              Đề sẽ được tạo ở trạng thái Nháp và tự động lưu trong quá trình soạn.
            </CardDescription>
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={handleCreate}
            disabled={!USE_MOCKS && createMutation.isPending}
          >
            {createMutation.isPending && !USE_MOCKS ? "Đang tạo…" : "Tạo đề thi"}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}
