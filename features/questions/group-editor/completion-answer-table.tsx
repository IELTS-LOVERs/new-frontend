"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { extractTemplatePlaceholders } from "../lib/completion-template"
import { AcceptedAnswersField } from "../accepted-answers-field"
import type {
  CandidateQuestionGroup,
  QuestionItem,
  QuestionGroup,
} from "@/lib/api/types"

export interface CompletionAnswerTableProps {
  group:
    | QuestionGroup
    | (Omit<CandidateQuestionGroup, "questions"> & {
        questions: QuestionItem[]
      })
  numbering: Map<string, number>
  examReadonly: boolean
  isSummaryWithOptions: boolean
  optionsPool: Array<{ id: string; text: string }>
  onUpdateQuestion: (questionId: string, patch: Partial<QuestionItem>) => void
  onRemoveBlank: (q: QuestionItem) => void
}

/**
 * Compact answer-configuration table for template-based completion groups.
 *
 * The whole question text lives in `config.template`, so there is no per-question
 * "prompt" to author — teachers only map each `[X]` blank to its accepted answers
 * (or, for the word-bank variant, to the correct option letter).
 */
export function CompletionAnswerTable({
  group,
  numbering,
  examReadonly,
  isSummaryWithOptions,
  optionsPool,
  onUpdateQuestion,
  onRemoveBlank,
}: CompletionAnswerTableProps) {
  const questions = group.questions
  /**
   * Vị trí hiển thị của từng ô trống.
   *
   * Ưu tiên số ô trống trong template (`[1] [2]` → 1, 2) vì template mới là thứ
   * học sinh đọc. Lấy `questionNumber` thô thì sau khi xoá một ô, bảng đáp án
   * vẫn hiện số cũ cho tới lần đồng bộ kế tiếp. Khi số ô trống không khớp số
   * câu hỏi (đang gõ dở) thì rơi về `numbering` như trước.
   */
  const positionByQuestionId = React.useMemo(() => {
    const template =
      typeof (group.config as Record<string, unknown> | undefined)?.template === "string"
        ? ((group.config as Record<string, unknown>).template as string)
        : ""
    const blanks = extractTemplatePlaceholders(template)
    const map = new Map<string, number>()
    if (blanks.length === questions.length) {
      questions.forEach((q, index) => map.set(q.id, blanks[index]))
    }
    return map
  }, [group.config, questions])

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-bold text-foreground">
            Cấu hình đáp án cho các ô trống ({questions.length})
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Nội dung câu hỏi đã nằm trong bài tóm tắt nên chỉ cần nhập đáp án —
            danh sách tự đồng bộ theo các ô{" "}
            <code className="rounded bg-muted px-1 font-mono font-bold text-primary">
              [X]
            </code>{" "}
            trong template. Đáp án phân biệt chữ hoa/thường.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-[10px] font-semibold text-primary"
        >
          Tự đồng bộ
        </Badge>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">
          Chưa có ô trống nào. Dùng nút{" "}
          <span className="font-semibold text-foreground">“Chèn ô trống”</span>{" "}
          ở khung template phía trên để tạo câu hỏi.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="w-16 border-b border-border px-3 py-2 font-semibold">
                  Vị trí
                </th>
                <th className="border-b border-l border-border px-3 py-2 font-semibold">
                  {isSummaryWithOptions
                    ? "Đáp án (Word Bank)"
                    : "Đáp án đúng (Accepted Answers)"}
                </th>
                <th className="w-20 border-b border-l border-border px-3 py-2 text-center font-semibold">
                  Điểm
                </th>
                <th className="border-b border-l border-border px-3 py-2 font-semibold">
                  Giải thích
                </th>
                <th className="w-10 border-b border-l border-border px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const qNum =
                  positionByQuestionId.get(q.id) ??
                  numbering.get(q.id) ??
                  q.questionNumber
                const accepted: string[] = q.acceptedAnswers ?? []
                const points = q.points ?? 1
                return (
                  <tr
                    key={q.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="border-b border-border px-3 py-2 align-middle">
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                        {qNum}
                      </span>
                    </td>
                    <td className="border-b border-l border-border px-3 py-2 align-middle">
                      {isSummaryWithOptions ? (
                        optionsPool.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {optionsPool.map((opt) => {
                              const selected = accepted[0] === opt.id
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={examReadonly}
                                  title={opt.text || opt.id}
                                  onClick={() =>
                                    onUpdateQuestion(q.id, {
                                      acceptedAnswers: [opt.id],
                                    })
                                  }
                                  className={cn(
                                    "flex size-6 items-center justify-center rounded border font-mono text-[10px] font-bold transition-colors",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  {opt.id}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Chưa có Word Bank — thêm từ khóa ở phần phía trên.
                          </span>
                        )
                      ) : (
                        <AcceptedAnswersField
                          answers={accepted}
                          disabled={examReadonly}
                          compact
                          placeholder="VD: medicinal"
                          onCommit={(next) =>
                            onUpdateQuestion(q.id, { acceptedAnswers: next })
                          }
                        />
                      )}
                    </td>
                    <td className="border-b border-l border-border px-3 py-2 text-center align-middle">
                      <Input
                        type="number"
                        min={1}
                        value={points}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            points: Number(e.target.value) || 1,
                          })
                        }
                        className="h-7 w-14 text-center font-mono text-xs"
                      />
                    </td>
                    <td className="border-b border-l border-border px-3 py-2 align-middle">
                      <Input
                        value={q.explanation ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            explanation: e.target.value,
                          })
                        }
                        className="h-7 text-[11px] text-muted-foreground"
                        placeholder="Giải thích (tuỳ chọn)..."
                      />
                    </td>
                    <td className="border-b border-l border-border px-2 py-2 text-center align-middle">
                      {!examReadonly && (
                        <button
                          type="button"
                          onClick={() => onRemoveBlank(q)}
                          title="Xoá câu hỏi và ô trống tương ứng"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
