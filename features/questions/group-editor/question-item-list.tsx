"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/features/rich-text/lazy-editor"
import { RICH_EDITOR_ENABLED } from "@/features/rich-text/feature-flag"
import { AcceptedAnswersField } from "../accepted-answers-field"
import type { QuestionGroupType, QuestionItem } from "@/lib/api/types"
import type { MCOption, PoolItem, LabelItem } from "./pool-config-editor"

export interface QuestionItemListProps {
  questions: QuestionItem[]
  groupType: QuestionGroupType
  numbering: Map<string, number>
  examReadonly: boolean
  maxSelections?: number
  mcOptions: MCOption[]
  headingsPool: PoolItem[]
  paragraphLabels: string[]
  featuresPool: PoolItem[]
  endingsPool: PoolItem[]
  optionsPool: PoolItem[]
  labels: LabelItem[]
  onAddQuestion: () => void
  onRemoveQuestion: (questionId: string) => void
  onUpdateQuestion: (questionId: string, patch: Partial<QuestionItem>) => void
}

export function QuestionItemList({
  questions,
  groupType,
  numbering,
  examReadonly,
  maxSelections = 2,
  mcOptions,
  headingsPool,
  paragraphLabels,
  featuresPool,
  endingsPool,
  optionsPool,
  labels,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}: QuestionItemListProps) {
  const isMCSingle = groupType === "multiple_choice_single"
  const isMCMultiple = groupType === "multiple_choice_multiple"
  const isTFNG = groupType === "true_false_not_given"
  const isYNNG = groupType === "yes_no_not_given"
  const isHeadings = groupType === "matching_headings"
  const isInfo = groupType === "matching_information"
  const isFeatures = groupType === "matching_features"
  const isEndings = groupType === "matching_sentence_endings"
  const isSummaryOptions = groupType === "summary_completion_options"
  const isLabelling =
    groupType === "map_labelling" || groupType === "diagram_labelling"
  const isWriting =
    groupType === "writing_task_1" || groupType === "writing_task_2"
  const isShortAnswer = groupType === "short_answer"
  const isCompletion =
    groupType === "sentence_completion" ||
    groupType === "summary_completion" ||
    groupType === "note_completion" ||
    groupType === "table_completion" ||
    groupType === "flow_chart_completion" ||
    groupType === "form_completion"

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground">
          Danh sách câu hỏi trong nhóm ({questions.length})
        </Label>
        {!examReadonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddQuestion}
            className="h-7 gap-1 border-primary/30 text-xs text-primary"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm câu hỏi
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        {questions.map((q) => {
          const qNum = numbering.get(q.id) ?? q.questionNumber
          const accepted = q.acceptedAnswers ?? []
          const multiSelectUsedElsewhere =
            isMCMultiple && questions.length > 1
              ? new Set<string>(
                  questions
                    .filter((other) => other.id !== q.id)
                    .flatMap((other) => other.acceptedAnswers ?? [])
                )
              : null

          return (
            <div
              key={q.id}
              className="space-y-2.5 rounded-lg border border-border bg-card p-3 shadow-2xs transition-colors hover:border-border/80"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                  {qNum}
                </span>

                <div className="min-w-0 flex-1 space-y-2">
                  {/* Prompt */}
                  {isWriting && RICH_EDITOR_ENABLED ? (
                    <RichTextEditor
                      key={`writing-prompt-${q.id}`}
                      value={q.promptDoc ?? null}
                      legacyText={q.prompt ?? ""}
                      disabled={examReadonly}
                      minHeight={140}
                      placeholder="Nhập đề bài Writing chi tiết..."
                      ariaLabel="Đề bài Writing"
                      onChange={(doc, plainText) =>
                        onUpdateQuestion(q.id, {
                          promptDoc: doc,
                          prompt: plainText,
                        })
                      }
                    />
                  ) : (
                    <Input
                      value={q.prompt}
                      disabled={examReadonly}
                      onChange={(e) =>
                        onUpdateQuestion(q.id, { prompt: e.target.value })
                      }
                      className="h-8 text-xs font-medium"
                      placeholder="Nội dung câu hỏi / nhận định..."
                    />
                  )}

                  {/* Answer Selectors based on Type */}
                  {isMCSingle && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn đáp án đúng:
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {mcOptions.map((opt) => {
                          const isCorrect = accepted.includes(opt.id)
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={examReadonly}
                              onClick={() =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: [opt.id],
                                })
                              }
                              className={cn(
                                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                                isCorrect
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <span>{opt.id}</span>
                              {opt.text && (
                                <span className="max-w-[120px] truncate font-normal">
                                  ({opt.text})
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isMCMultiple && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        {multiSelectUsedElsewhere
                          ? "Đáp án đúng của câu này (mỗi câu 1 chữ cái):"
                          : `Chọn các đáp án đúng (tối đa ${maxSelections}):`}
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {mcOptions.map((opt) => {
                          const isCorrect = accepted.includes(opt.id)
                          const usedElsewhere = Boolean(
                            multiSelectUsedElsewhere?.has(opt.id) && !isCorrect
                          )
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={examReadonly || usedElsewhere}
                              title={
                                usedElsewhere
                                  ? `${opt.id} đã là đáp án của câu khác`
                                  : undefined
                              }
                              onClick={() => {
                                if (multiSelectUsedElsewhere) {
                                  onUpdateQuestion(q.id, {
                                    acceptedAnswers: isCorrect ? [] : [opt.id],
                                  })
                                  return
                                }
                                const nextAnswers = isCorrect
                                  ? accepted.filter((a: string) => a !== opt.id)
                                  : [...accepted, opt.id]
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: nextAnswers,
                                })
                              }}
                              className={cn(
                                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                                isCorrect
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                                usedElsewhere &&
                                  "cursor-not-allowed opacity-40 hover:bg-muted/40"
                              )}
                            >
                              <span>{opt.id}</span>
                              {opt.text && (
                                <span className="max-w-[120px] truncate font-normal">
                                  ({opt.text})
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isTFNG && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn đáp án đúng:
                      </Label>
                      <div className="flex gap-2">
                        {["TRUE", "FALSE", "NOT GIVEN"].map((val) => {
                          const isCorrect = accepted.includes(val)
                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={examReadonly}
                              onClick={() =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: [val],
                                })
                              }
                              className={cn(
                                "rounded-md border px-3 py-1 text-xs font-bold transition-all",
                                isCorrect
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {val}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isYNNG && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn đáp án đúng:
                      </Label>
                      <div className="flex gap-2">
                        {["YES", "NO", "NOT GIVEN"].map((val) => {
                          const isCorrect = accepted.includes(val)
                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={examReadonly}
                              onClick={() =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: [val],
                                })
                              }
                              className={cn(
                                "rounded-md border px-3 py-1 text-xs font-bold transition-all",
                                isCorrect
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {val}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isHeadings && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn Heading đúng từ danh sách:
                      </Label>
                      <select
                        value={accepted[0] ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            acceptedAnswers: e.target.value ? [e.target.value] : [],
                          })
                        }
                        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="">-- Chọn Heading --</option>
                        {headingsPool.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.id.toUpperCase()} — {h.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isInfo && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn đoạn văn chứa thông tin:
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {paragraphLabels.map((p) => {
                          const isCorrect = accepted.includes(p)
                          return (
                            <button
                              key={p}
                              type="button"
                              disabled={examReadonly}
                              onClick={() =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: [p],
                                })
                              }
                              className={cn(
                                "size-7 rounded-md border font-mono text-xs font-bold transition-all",
                                isCorrect
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {p}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isFeatures && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn đối tượng / đặc điểm đúng:
                      </Label>
                      <select
                        value={accepted[0] ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            acceptedAnswers: e.target.value ? [e.target.value] : [],
                          })
                        }
                        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="">-- Chọn đối tượng --</option>
                        {featuresPool.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.id} — {f.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isEndings && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn kết thúc câu đúng:
                      </Label>
                      <select
                        value={accepted[0] ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            acceptedAnswers: e.target.value ? [e.target.value] : [],
                          })
                        }
                        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="">-- Chọn kết thúc câu --</option>
                        {endingsPool.map((end) => (
                          <option key={end.id} value={end.id}>
                            {end.id} — {end.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isSummaryOptions && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn từ đúng từ Word Bank:
                      </Label>
                      <select
                        value={accepted[0] ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            acceptedAnswers: e.target.value ? [e.target.value] : [],
                          })
                        }
                        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="">-- Chọn từ từ Word Bank --</option>
                        {optionsPool.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.id} — {opt.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isLabelling && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Chọn nhãn vị trí đúng:
                      </Label>
                      <select
                        value={accepted[0] ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            acceptedAnswers: e.target.value ? [e.target.value] : [],
                          })
                        }
                        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                      >
                        <option value="">-- Chọn nhãn --</option>
                        {labels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.id} {l.label ? `— ${l.label}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(isCompletion || isShortAnswer) && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Đáp án đúng (mỗi dòng là một cách viết được chấp nhận):
                      </Label>
                      <AcceptedAnswersField
                        answers={accepted}
                        disabled={examReadonly}
                        placeholder="VD: two decades"
                        onCommit={(next) =>
                          onUpdateQuestion(q.id, {
                            acceptedAnswers: next,
                          })
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Phân biệt hoa/thường: “shoe” và “Shoe” là hai đáp án khác
                        nhau. Thêm cả hai nếu muốn chấp nhận cả hai.
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  <Input
                    value={q.explanation ?? ""}
                    disabled={examReadonly}
                    onChange={(e) =>
                      onUpdateQuestion(q.id, {
                        explanation: e.target.value,
                      })
                    }
                    className="h-7 text-[11px] text-muted-foreground"
                    placeholder="Giải thích đáp án (tùy chọn)..."
                  />
                </div>

                {!examReadonly && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveQuestion(q.id)}
                    className="mt-1 text-muted-foreground hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={13} />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
