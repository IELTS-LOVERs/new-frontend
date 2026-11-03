"use client"

import * as React from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Flag01Icon } from "@hugeicons/core-free-icons"
import { parseMarkdownTable } from "@/features/exam-engine/lib/template-layout"
import {
  formatQuestionRange,
  getGroupViewMeta,
} from "@/features/exam-engine/lib/exam-flow"
import { SelectableHighlightedText } from "@/features/exam-engine/components/highlight-layer"
import { RichText } from "@/features/exam-engine/components/rich-text"
import { questionAnchorId } from "@/features/exam-engine/lib/question-nav"
import { MediaImages } from "@/features/exam-engine/components/exam-media"
import {
  FlowChartRenderer,
  InlineTemplateRenderer,
  MatchingFeaturesRenderer,
  TableCompletionRenderer,
} from "@/features/exam-engine/components/renderers/template-renderers"
import type { CandidateQuestionGroup } from "@/lib/api/types"

export interface GroupRendererProps {
  group: CandidateQuestionGroup
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}

/**
 * Renders the group-level illustration (config.imageMediaId, resolved to a
 * presigned URL by the API) above the type-specific group body.
 */
export function GroupRenderer(props: GroupRendererProps) {
  return (
    <div className="space-y-4">
      <MediaImages media={props.group.media} />
      <GroupRendererBody {...props} />
    </div>
  )
}

export function GroupRendererBody({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: GroupRendererProps) {
  const config = group.config || {}
  const {
    options,
    optionsPool,
    labelsPool,
    isTFNG,
    isYNNG,
    isMatching,
    isCompletion,
    maxWords,
    wordLimitText,
    matchPool,
  } = getGroupViewMeta(group)
  // #14: summary answers can be locked after the first selection.
  const allowChangeAnswer = config.allowChangeAnswer !== false

  // ─── Multiple Choice Multiple ──────────────────────────────────────────────
  if (group.groupType === "multiple_choice_multiple") {
    const maxSelections =
      (config.maxSelections as number) || group.questions.length || 2
    const isMultiQuestion = group.questions.length > 1

    const selectedOptionIds: string[] = isMultiQuestion
      ? group.questions.map((q) => answers[q.id]?.value?.trim()).filter(Boolean)
      : (answers[group.questions[0]?.id]?.value ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

    const handleToggleOption = (optId: string) => {
      const isSelected = selectedOptionIds.includes(optId)
      if (isSelected) {
        if (isMultiQuestion) {
          const targetQ = group.questions.find(
            (q) => answers[q.id]?.value?.trim() === optId
          )
          if (targetQ) onAnswer(targetQ.id, "")
        } else if (group.questions[0]) {
          const remaining = selectedOptionIds.filter((id) => id !== optId)
          onAnswer(group.questions[0].id, remaining.join(", "))
        }
      } else {
        if (selectedOptionIds.length >= maxSelections) {
          toast.warning(`Bạn chỉ được chọn tối đa ${maxSelections} đáp án`)
          return
        }
        if (isMultiQuestion) {
          const emptyQ = group.questions.find(
            (q) => !answers[q.id]?.value?.trim()
          )
          if (emptyQ) {
            onAnswer(emptyQ.id, optId)
          }
        } else if (group.questions[0]) {
          const next = [...selectedOptionIds, optId]
          onAnswer(group.questions[0].id, next.join(", "))
        }
      }
    }

    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Chọn đúng {maxSelections} đáp án</span>
            <span className="font-mono font-semibold text-foreground">
              {selectedOptionIds.length} / {maxSelections} đã chọn
            </span>
          </div>

          {group.questions[0]?.prompt && (
            <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
              <RichText text={group.questions[0].prompt} />
            </p>
          )}

          <div className="space-y-2">
            {options.map((opt) => {
              const isSelected = selectedOptionIds.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleToggleOption(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs sm:text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 font-semibold text-primary shadow-2xs"
                      : "border-border text-foreground hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-5.5 sm:size-6 shrink-0 items-center justify-center rounded border font-mono text-[11px] sm:text-xs font-bold transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-card"
                    )}
                  >
                    {opt.id}
                  </div>
                  <span className="flex-1"><RichText text={opt.text || opt.id} /></span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
            {group.questions.map((q) => {
              const qAns = answers[q.id]?.value?.trim()
              const isFlag = !!flagged[q.id]
              return (
                <div
                  key={q.id}
                  id={questionAnchorId(q.id)}
                  data-question-id={q.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1 text-xs"
                >
                  <span className="font-mono font-bold text-primary">
                    Câu {q.questionNumber}:
                  </span>
                  <span className="font-mono font-semibold">
                    {qAns || "(Chưa chọn)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleFlag(q.id)}
                    className={cn(
                      "ml-1",
                      isFlag
                        ? "text-amber-500"
                        : "text-muted-foreground/30 hover:text-muted-foreground"
                    )}
                    title="Đánh dấu câu này"
                  >
                    <HugeiconsIcon icon={Flag01Icon} size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── Matching Information — IELTS on Computer radio matrix ─────────────────
  if (group.groupType === "matching_information") {
    const paragraphLabels: string[] =
      Array.isArray(config.paragraphLabels) && config.paragraphLabels.length > 0
        ? (config.paragraphLabels as string[])
        : ["A", "B", "C", "D", "E", "F", "G"]
    const allowReuse = (config.allowReuse as boolean | undefined) ?? true
    const lastLabel = paragraphLabels[paragraphLabels.length - 1]

    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {allowReuse && (
            <p className="text-xs font-semibold text-primary">
              NB: You may use any letter more than once.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Chọn chữ cái của đoạn văn (A–{lastLabel}) có chứa thông tin tương
            ứng với mỗi nhận định.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur-xs border-b border-r border-border px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  Phát biểu / Nhận định
                </th>
                {paragraphLabels.map((label) => (
                  <th
                    key={label}
                    className="w-8 min-w-8 max-w-8 sm:w-10 sm:min-w-10 sm:max-w-10 border-b border-l border-border/60 px-0.5 py-2.5 text-center font-mono text-sm font-bold text-foreground sm:text-base"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.questions.map((q) => {
                const answer = answers[q.id]?.value ?? ""
                const isFlagged = !!flagged[q.id]
                return (
                  <tr
                    key={q.id}
                    id={questionAnchorId(q.id)}
                    data-question-id={q.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="sticky left-0 z-10 bg-card border-r border-border px-3.5 py-2.5 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                          {q.questionNumber}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm leading-snug text-foreground select-text break-words">
                          <SelectableHighlightedText
                            targetId={`q-${q.id}`}
                            text={q.prompt}
                          />
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFlag(q.id)}
                          className={cn(
                            "mt-0.5 shrink-0 transition-colors",
                            isFlagged
                              ? "text-amber-500"
                              : "text-muted-foreground/30 hover:text-muted-foreground"
                          )}
                          title="Đánh dấu câu này"
                        >
                          <HugeiconsIcon icon={Flag01Icon} size={14} />
                        </button>
                      </div>
                    </td>
                    {paragraphLabels.map((label) => {
                      const isSelected = answer === label
                      return (
                        <td
                          key={label}
                          onClick={() => onAnswer(q.id, label)}
                          className="w-8 min-w-8 max-w-8 sm:w-10 sm:min-w-10 sm:max-w-10 border-l border-border/60 px-0.5 py-2 text-center align-middle cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAnswer(q.id, label)
                            }}
                            className={cn(
                              "mx-auto flex size-5 sm:size-5.5 items-center justify-center rounded-full border transition-all cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border-strong bg-background hover:border-primary/60"
                            )}
                            aria-label={`Câu ${q.questionNumber}: Chọn đoạn ${label}`}
                          >
                            {isSelected && (
                              <span className="size-2 rounded-full bg-primary-foreground" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── Matching Features — matrix (≤5) or pill list (>5) ─────────────────────
  if (
    group.groupType === "matching_features" &&
    Array.isArray(config.featuresPool) &&
    (config.featuresPool as unknown[]).length > 0
  ) {
    return (
      <MatchingFeaturesRenderer
        group={group}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    )
  }

  // ─── Table Completion — real HTML table from a Markdown template ────────────
  if (
    group.groupType === "table_completion" &&
    typeof config.template === "string" &&
    parseMarkdownTable(config.template)
  ) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {wordLimitText && (
            <p className="text-xs font-semibold text-primary">
              {wordLimitText}
            </p>
          )}
        </div>
        <TableCompletionRenderer
          group={group}
          answers={answers}
          flagged={flagged}
          onAnswer={onAnswer}
          onToggleFlag={onToggleFlag}
          maxWords={maxWords}
        />
      </div>
    )
  }

  // ─── Flow Chart Completion — step cards joined by arrows ────────────────────
  if (
    group.groupType === "flow_chart_completion" &&
    typeof config.template === "string" &&
    config.template.trim().length > 0
  ) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {wordLimitText && (
            <p className="text-xs font-semibold text-primary">
              {wordLimitText}
            </p>
          )}
        </div>
        <FlowChartRenderer
          group={group}
          answers={answers}
          flagged={flagged}
          onAnswer={onAnswer}
          onToggleFlag={onToggleFlag}
          maxWords={maxWords}
        />
      </div>
    )
  }

  // ─── Inline Template Renderer for Completion Types ─────────────────────────
  if (
    config.template &&
    typeof config.template === "string" &&
    config.template.trim().length > 0
  ) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {formatQuestionRange(group.questions)}
          </p>
          <p className="text-sm font-medium whitespace-pre-line text-foreground">
            <RichText text={group.instructions} />
          </p>
          {wordLimitText && (
            <p className="text-xs font-semibold text-primary">
              {wordLimitText}
            </p>
          )}
        </div>

        {optionsPool.length > 0 && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <span className="text-xs font-bold text-primary uppercase">
              Word Bank / Danh sách từ khóa:
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {optionsPool.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-sm sm:text-base"
                >
                  <span className="text-xs font-bold text-primary sm:text-sm">{item.id}</span>
                  <span className="text-foreground"><RichText text={item.text} /></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <InlineTemplateRenderer
          template={config.template}
          questions={group.questions}
          answers={answers}
          flagged={flagged}
          onAnswer={onAnswer}
          onToggleFlag={onToggleFlag}
          optionsPool={optionsPool}
          maxWords={maxWords}
          allowChangeAnswer={
            typeof config.allowChangeAnswer === "boolean"
              ? config.allowChangeAnswer
              : undefined
          }
        />
      </div>
    )
  }

  // ─── Standard Group Renderer ───────────────────────────────────────────────
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="space-y-1.5">
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {formatQuestionRange(group.questions)}
        </p>
        <p className="text-sm sm:text-base font-semibold whitespace-pre-line text-foreground leading-relaxed">
          <RichText text={group.instructions} />
        </p>
        {wordLimitText && (
          <p className="text-xs sm:text-sm font-bold text-primary">{wordLimitText}</p>
        )}
      </div>

      {isMatching && matchPool.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
          {matchPool.map((item) => (
            <div key={item.id} className="flex gap-2 text-xs sm:text-sm">
              <span className="w-6 font-bold text-primary">{item.id}</span>
              <span className="text-foreground"><RichText text={item.text} /></span>
            </div>
          ))}
        </div>
      )}

      {optionsPool.length > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
          <span className="text-xs sm:text-sm font-bold text-primary uppercase">
            Word Bank:
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {optionsPool.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm sm:text-base"
              >
                <span className="text-xs font-bold text-primary sm:text-sm">{item.id}</span>
                <span className="text-foreground"><RichText text={item.text} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {labelsPool.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase">
            Danh sách nhãn:
          </span>
          <div className="flex flex-wrap gap-2">
            {labelsPool.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs sm:text-sm"
              >
                <span className="font-bold text-primary">{l.id}</span>
                <span className="text-foreground">{l.label || l.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {group.questions.map((q) => {
          const answer = answers[q.id]?.value ?? ""
          const isFlagged = !!flagged[q.id]
          const answerLocked = !allowChangeAnswer && answer !== ""
          return (
            <div
              key={q.id}
              id={questionAnchorId(q.id)}
              data-question-id={q.id}
              className="flex items-start gap-3 sm:gap-3.5"
            >
              <span className="mt-0.5 flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs sm:text-sm font-bold text-primary">
                {q.questionNumber}
              </span>
              <div className="flex-1 space-y-2">
                {q.prompt && (
                  <p className="text-sm sm:text-base font-medium leading-relaxed text-foreground">
                    <SelectableHighlightedText
                      targetId={`q-${q.id}`}
                      text={q.prompt}
                    />
                  </p>
                )}
                {isTFNG || isYNNG ? (
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAnswer(q.id, opt.id)}
                        className={cn(
                          "rounded-lg border px-4 py-2 text-xs sm:text-sm font-semibold transition-colors",
                          answer === opt.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                ) : group.groupType === "multiple_choice_single" ? (
                  <div className="space-y-1.5">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onAnswer(q.id, opt.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-xs sm:text-sm transition-colors",
                          answer === opt.id
                            ? "border-primary bg-primary/5 font-semibold text-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] sm:text-xs font-bold transition-colors",
                            answer === opt.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-card"
                          )}
                        >
                          {opt.id}
                        </div>
                        <span className="flex-1"><RichText text={opt.text} /></span>
                      </button>
                    ))}
                  </div>
                ) : matchPool.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      disabled={answerLocked}
                      title={
                        answerLocked
                          ? "Đã chọn đáp án, không thể đổi"
                          : undefined
                      }
                      className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 sm:text-base md:h-9"
                    >
                      <option value="">— Chọn đáp án —</option>
                      {matchPool.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}: {m.text}
                        </option>
                      ))}
                    </select>
                    {answerLocked && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Đã chọn đáp án, không thể đổi
                      </p>
                    )}
                  </div>
                ) : optionsPool.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      disabled={answerLocked}
                      title={
                        answerLocked
                          ? "Đã chọn đáp án, không thể đổi"
                          : undefined
                      }
                      className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 sm:text-base md:h-9"
                    >
                      <option value="">— Chọn từ khóa —</option>
                      {optionsPool.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.id}: {opt.text}
                        </option>
                      ))}
                    </select>
                    {answerLocked && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Đã chọn đáp án, không thể đổi
                      </p>
                    )}
                  </div>
                ) : labelsPool.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      disabled={answerLocked}
                      title={
                        answerLocked
                          ? "Đã chọn đáp án, không thể đổi"
                          : undefined
                      }
                      className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 sm:text-base md:h-9"
                    >
                      <option value="">— Chọn nhãn —</option>
                      {labelsPool.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.id}: {l.label || l.id}
                        </option>
                      ))}
                    </select>
                    {answerLocked && (
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Đã chọn đáp án, không thể đổi
                      </p>
                    )}
                  </div>
                ) : (
                  <Input
                    value={answer}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="h-11 text-xs sm:text-sm rounded-lg md:h-9"
                    placeholder={
                      isCompletion && maxWords
                        ? `Tối đa ${maxWords} từ`
                        : "Nhập câu trả lời..."
                    }
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => onToggleFlag(q.id)}
                className={cn(
                  "mt-1 shrink-0 p-1 rounded-md transition-colors",
                  isFlagged
                    ? "text-amber-500"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                )}
                title="Đánh dấu câu hỏi"
              >
                <HugeiconsIcon icon={Flag01Icon} size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
