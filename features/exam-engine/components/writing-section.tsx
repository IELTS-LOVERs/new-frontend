"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { countWords, findWritingQuestion } from "@/features/exam-engine/lib/exam-flow"
import { RichDocView } from "@/features/rich-text/render"
import { RichText } from "@/features/exam-engine/components/rich-text"
import { ExamImage, MediaImages } from "@/features/exam-engine/components/exam-media"
import type { CandidateSection } from "@/lib/api/types"

export interface WritingSectionProps {
  section: CandidateSection
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  writingTask: "task1" | "task2"
  onSwitchTask: (t: "task1" | "task2") => void
  onAnswer: (questionId: string, value: string) => void
}

export function WritingSection({
  section,
  answers,
  writingTask,
  onSwitchTask,
  onAnswer,
}: WritingSectionProps) {
  const task1Q = findWritingQuestion(section, "writing_task_1")
  const task2Q = findWritingQuestion(section, "writing_task_2")
  // Đề luyện tập Writing có thể chỉ có Task 1 hoặc chỉ Task 2; mặc định
  // "task1" không được để trống editor khi section thiếu task đó.
  const effectiveTask: "task1" | "task2" =
    writingTask === "task1" && !task1Q && task2Q ? "task2" : writingTask
  const currentQ = effectiveTask === "task1" ? task1Q : task2Q
  const text = currentQ ? (answers[currentQ.id]?.value ?? "") : ""
  const wordCount = countWords(text)
  const minWords = effectiveTask === "task1" ? 150 : 250

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-full flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Left / Top: prompt */}
        <div className="h-1/2 md:h-full w-full md:w-1/2 space-y-4 md:space-y-6 overflow-y-auto bg-card p-4 sm:p-6 md:p-8">
          <div className="flex gap-2 border-b border-border pb-3">
            {task1Q && (
              <button
                onClick={() => onSwitchTask("task1")}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-colors",
                  writingTask === "task1"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                Writing Task 1 (Report)
              </button>
            )}
            {task2Q && (
              <button
                onClick={() => onSwitchTask("task2")}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-colors",
                  writingTask === "task2"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                Writing Task 2 (Essay)
              </button>
            )}
          </div>

          {currentQ && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="mb-1 font-heading text-sm font-bold text-foreground">
                  {effectiveTask === "task1"
                    ? "Task 1 Instructions"
                    : "Task 2 Instructions"}
                </h3>
                {currentQ.promptDoc ? (
                  <RichDocView
                    doc={currentQ.promptDoc}
                    className="text-xs leading-relaxed font-medium text-muted-foreground"
                  />
                ) : (
                  <p className="text-xs leading-relaxed font-medium whitespace-pre-line text-muted-foreground">
                    <RichText text={currentQ.prompt} />
                  </p>
                )}
                {currentQ.content ? (
                  <p className="text-xs leading-relaxed font-medium whitespace-pre-line text-muted-foreground">
                    <RichText text={currentQ.content} />
                  </p>
                ) : null}
              </div>
              {currentQ.media?.map((m) =>
                m.type === "image" ? (
                  <ExamImage
                    key={m.id}
                    src={m.url}
                    alt={m.originalName ?? "Task image"}
                    className="rounded-xl border border-border"
                  />
                ) : null
              )}
            </div>
          )}

          <MediaImages media={section.media} />
        </div>

        {/* Right / Bottom: editor */}
        <div className="flex h-1/2 md:h-full w-full md:w-1/2 flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-foreground">
                {wordCount} words
              </span>
              <Badge variant="outline" className="font-mono text-[11px]">
                Tối thiểu {minWords} từ
              </Badge>
              {wordCount > 0 && wordCount < minWords && (
                <span className="text-[11px] font-medium text-amber-600">
                  còn thiếu {minWords - wordCount} từ
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-6">
            {currentQ ? (
              <Textarea
                value={text}
                onChange={(e) => onAnswer(currentQ.id, e.target.value)}
                placeholder={`Bắt đầu gõ bài viết ${effectiveTask === "task1" ? "Task 1" : "Task 2"} của bạn tại đây...`}
                spellCheck={false}
                className="h-full w-full resize-none border-0 font-serif text-sm leading-[1.8] select-text focus-visible:ring-0"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Không có câu hỏi {writingTask}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
