"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  Flag01Icon,
} from "@hugeicons/core-free-icons"
import {
  parseMarkdownTable,
  splitFlowSteps,
} from "@/features/exam-engine/lib/template-layout"
import {
  INLINE_TOKEN_SPLIT,
  formatQuestionRange,
  parseInlineToken,
  resolveInlineBlankQuestion,
} from "@/features/exam-engine/lib/exam-flow"
import {
  RichText,
  renderRichTextNodes,
} from "@/features/exam-engine/components/rich-text"
import { RichDocView } from "@/features/rich-text/render"
import { SelectableHighlightedText } from "@/features/exam-engine/components/highlight-layer"
import { parseRichText } from "@/features/exam-engine/lib/rich-text"
import { questionAnchorId } from "@/features/exam-engine/lib/question-nav"
import type {
  CandidateQuestionGroup,
  CandidateQuestionItem,
} from "@/lib/api/types"

export type BlankAnswers = Record<
  string,
  { value: string; updatedAt: number; dirty: boolean }
>

export interface BlankRenderContext {
  questions: CandidateQuestionItem[]
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  optionsPool?: Array<{ id: string; text: string }>
  maxWords?: number
  /** #14: false → once a summary answer is selected it cannot be changed. */
  allowChangeAnswer?: boolean
  matched: Set<number>
}

/**
 * Inline `[X]` / `{{qX}}` blanks are split by `INLINE_TOKEN_SPLIT` (imported
 * from the exam-flow lib) and each token's question number is read by
 * `parseInlineToken`.
 */
export function InlineBlank({
  q,
  ctx,
  compact,
}: {
  q: CandidateQuestionItem
  ctx: BlankRenderContext
  compact?: boolean
}) {
  const answer = ctx.answers[q.id]?.value ?? ""
  const isFlag = !!ctx.flagged[q.id]
  const answerLocked = ctx.allowChangeAnswer === false && answer !== ""
  return (
    <span
      id={questionAnchorId(q.id)}
      data-question-id={q.id}
      className={cn(
        "inline-flex items-center gap-1.5 align-baseline",
        compact ? "mx-0.5" : "mx-1.5 my-1"
      )}
    >
      {!compact && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
          {q.questionNumber}
        </span>
      )}
      {ctx.optionsPool && ctx.optionsPool.length > 0 ? (
        <select
          value={answer}
          onChange={(e) => ctx.onAnswer(q.id, e.target.value)}
          disabled={answerLocked}
          title={
            answerLocked ? "Đã chọn đáp án, không thể đổi" : undefined
          }
          className={cn(
            "h-11 rounded-md border border-border bg-background font-mono text-base font-medium focus:border-primary focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 md:h-8",
            compact ? "px-2" : "px-2.5"
          )}
        >
          <option value="">[{q.questionNumber}]</option>
          {ctx.optionsPool.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.id} {opt.text && opt.text !== opt.id ? `- ${opt.text}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => ctx.onAnswer(q.id, e.target.value)}
          placeholder={
            ctx.maxWords ? `≤ ${ctx.maxWords} từ` : `[${q.questionNumber}]`
          }
          className={cn(
            "h-11 rounded-md border border-border bg-background text-sm font-medium focus:border-primary focus:outline-hidden md:h-8",
            compact ? "w-28 px-2" : "w-32 px-2.5 sm:w-44"
          )}
        />
      )}
      {answerLocked && ctx.optionsPool && ctx.optionsPool.length > 0 && !compact && (
        <span className="whitespace-nowrap text-[10px] font-medium text-muted-foreground">
          Đã chọn đáp án, không thể đổi
        </span>
      )}
      <button
        type="button"
        onClick={() => ctx.onToggleFlag(q.id)}
        className={cn(
          "p-0.5",
          isFlag
            ? "text-amber-500"
            : "text-muted-foreground/30 hover:text-muted-foreground"
        )}
        title="Đánh dấu câu"
      >
        <HugeiconsIcon icon={Flag01Icon} size={13} />
      </button>
    </span>
  )
}

export function renderPlainTextBlanks(
  text: string,
  ctx: BlankRenderContext,
  keyPrefix: string,
  compact = false
): React.ReactNode[] {
  const parts = text.split(INLINE_TOKEN_SPLIT)
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    const num = parseInlineToken(part)
    if (num !== null) {
      const q = resolveInlineBlankQuestion(ctx.questions, num)
      if (q) {
        ctx.matched.add(q.questionNumber)
        nodes.push(
          <InlineBlank
            key={`${keyPrefix}-q-${q.id}-${i}`}
            q={q}
            ctx={ctx}
            compact={compact}
          />
        )
      } else {
        nodes.push(
          <span
            key={`${keyPrefix}-miss-${i}`}
            className="font-mono text-muted-foreground"
          >
            [{num}]
          </span>
        )
      }
    } else {
      nodes.push(
        <span
          key={`${keyPrefix}-txt-${i}`}
          className="leading-relaxed whitespace-pre-wrap"
        >
          {part}
        </span>
      )
    }
  }
  return nodes
}

export function renderInlineBlanks(
  text: string,
  ctx: BlankRenderContext,
  keyPrefix: string,
  compact = false
): React.ReactNode[] {
  return renderRichTextNodes(
    parseRichText(text),
    keyPrefix,
    (value, key) => renderPlainTextBlanks(value, ctx, key, compact)
  )
}

export function UnplacedQuestionsList({
  questions,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  questions: CandidateQuestionItem[]
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="space-y-2.5 pt-2">
      {questions.map((q) => {
        const answer = answers[q.id]?.value ?? ""
        const isFlag = !!flagged[q.id]
        return (
          <div
            key={q.id}
            id={questionAnchorId(q.id)}
            data-question-id={q.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
              {q.questionNumber}
            </span>
            <span className="flex-1 text-xs text-foreground"><RichText text={q.prompt} /></span>
            <Input
              value={answer}
              onChange={(e) => onAnswer(q.id, e.target.value)}
              placeholder="Nhập câu trả lời..."
              className="h-11 w-44 text-xs font-medium md:h-8"
            />
            <button
              type="button"
              onClick={() => onToggleFlag(q.id)}
              className={cn(
                "p-1",
                isFlag
                  ? "text-amber-500"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              <HugeiconsIcon icon={Flag01Icon} size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function InlineTemplateRenderer({
  template,
  questions,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  optionsPool,
  maxWords,
  allowChangeAnswer,
}: {
  template: string
  questions: CandidateQuestionItem[]
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  optionsPool?: Array<{ id: string; text: string }>
  maxWords?: number
  allowChangeAnswer?: boolean
}) {
  const matched = new Set<number>()
  const ctx: BlankRenderContext = {
    questions,
    answers,
    flagged,
    onAnswer,
    onToggleFlag,
    optionsPool,
    maxWords,
    allowChangeAnswer,
    matched,
  }
  const renderedTokens = renderInlineBlanks(template, ctx, "inline")
  const unplacedQuestions = questions.filter(
    (q) => !matched.has(q.questionNumber)
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/80 bg-muted/10 p-5 sm:p-6 font-serif text-[15px] sm:text-base md:text-[17px] leading-[2.4] text-foreground select-text">
        {renderedTokens}
      </div>

      <UnplacedQuestionsList
        questions={unplacedQuestions}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    </div>
  )
}

// ─── Table Completion — real HTML table ──────────────────────────────────────
export function TableCompletionRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  maxWords,
}: {
  group: CandidateQuestionGroup
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  maxWords?: number
}) {
  const template = (group.config?.template as string) ?? ""
  const parsed = React.useMemo(() => parseMarkdownTable(template), [template])
  if (!parsed) return null

  const matched = new Set<number>()
  const ctx: BlankRenderContext = {
    questions: group.questions,
    answers,
    flagged,
    onAnswer,
    onToggleFlag,
    maxWords,
    matched,
  }

  const headerCells = parsed.header.map((cell, i) => (
    <th
      key={i}
      className="border border-border bg-muted/40 px-3 py-2.5 text-left text-xs font-bold text-foreground"
    >
      {renderInlineBlanks(cell, ctx, `th-${i}`, true)}
    </th>
  ))

  const bodyRows = parsed.rows.map((row, r) => (
    <tr key={r} className="align-top transition-colors hover:bg-muted/20">
      {row.map((cell, c) => (
        <td
          key={c}
          className="border border-border p-2.5 align-top text-[15px] leading-relaxed text-foreground sm:p-3 sm:text-base md:text-[17px]"
        >
          {renderInlineBlanks(cell, ctx, `td-${r}-${c}`, true)}
        </td>
      ))}
    </tr>
  ))

  const unplacedQuestions = group.questions.filter(
    (q) => !matched.has(q.questionNumber)
  )

  return (
    <div className="space-y-3">
      {parsed.preamble && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {parsed.preamble}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>{headerCells}</tr>
          </thead>
          <tbody>{bodyRows}</tbody>
        </table>
      </div>

      {parsed.trailing && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {parsed.trailing}
        </p>
      )}

      <UnplacedQuestionsList
        questions={unplacedQuestions}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    </div>
  )
}

// ─── Flow Chart Completion — step cards joined by arrows ──────────────────────
export function FlowChartRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  maxWords,
}: {
  group: CandidateQuestionGroup
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  maxWords?: number
}) {
  const template = (group.config?.template as string) ?? ""
  const steps = React.useMemo(() => splitFlowSteps(template), [template])

  const matched = new Set<number>()
  const ctx: BlankRenderContext = {
    questions: group.questions,
    answers,
    flagged,
    onAnswer,
    onToggleFlag,
    maxWords,
    matched,
  }

  const stepNodes = steps.map((step, i) => (
    <React.Fragment key={i}>
      {i > 0 && (
        <div className="flex justify-center py-0.5 text-muted-foreground/70">
          <HugeiconsIcon icon={ArrowDown01Icon} size={22} />
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex-1 text-[15px] leading-relaxed text-foreground sm:text-base md:text-[17px]">
            {renderInlineBlanks(step, ctx, `step-${i}`)}
          </div>
        </div>
      </div>
    </React.Fragment>
  ))

  const unplacedQuestions = group.questions.filter(
    (q) => !matched.has(q.questionNumber)
  )

  return (
    <div className="space-y-0.5">
      {stepNodes}
      <UnplacedQuestionsList
        questions={unplacedQuestions}
        answers={answers}
        flagged={flagged}
        onAnswer={onAnswer}
        onToggleFlag={onToggleFlag}
      />
    </div>
  )
}

// ─── Matching Features — matrix (≤5) or pill list (>5) ────────────────────────
export function MatchingFeaturesRenderer({
  group,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  group: CandidateQuestionGroup
  answers: BlankAnswers
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
}) {
  const config = group.config || {}
  const features =
    (config.featuresPool as Array<{ id: string; text: string }>) ?? []
  const allowReuse = (config.allowReuse as boolean | undefined) ?? true

  const header = (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {formatQuestionRange(group.questions)}
      </p>
      {group.instructionsDoc ? (
        <RichDocView
          doc={group.instructionsDoc}
          className="text-sm font-medium text-foreground"
        />
      ) : (
        <p className="text-sm font-medium whitespace-pre-line text-foreground">
          <RichText text={group.instructions} />
        </p>
      )}
      {allowReuse && (
        <p className="text-xs font-semibold text-primary">
          NB: You may use any letter more than once.
        </p>
      )}
    </div>
  )

  // Small pool → radio matrix (like matching_information)
  if (features.length <= 5) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        {header}
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur-xs border-b border-r border-border px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  Phát biểu / Nhận định
                </th>
                {features.map((f) => (
                  <th
                    key={f.id}
                    title={f.text}
                    className="w-10 min-w-10 max-w-10 sm:w-12 sm:min-w-12 sm:max-w-12 border-b border-l border-border/60 px-0.5 py-2 text-center align-bottom"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-sm font-bold text-foreground sm:text-base">
                        {f.id}
                      </span>
                      {f.text && (
                        <span
                          className="max-w-16 truncate text-[9px] font-normal text-muted-foreground"
                          title={f.text}
                        >
                          <RichText text={f.text} />
                        </span>
                      )}
                    </div>
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
                    {features.map((f) => {
                      const isSelected = answer === f.id
                      return (
                        <td
                          key={f.id}
                          onClick={() => onAnswer(q.id, f.id)}
                          className="w-10 min-w-10 max-w-10 sm:w-12 sm:min-w-12 sm:max-w-12 border-l border-border/60 px-0.5 py-2 text-center align-middle cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAnswer(q.id, f.id)
                            }}
                            className={cn(
                              "mx-auto flex size-5 sm:size-5.5 items-center justify-center rounded-full border transition-all cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border-strong bg-background hover:border-primary/60"
                            )}
                            aria-label={`Câu ${q.questionNumber}: Chọn ${f.id}`}
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

  // Large pool → fixed list + pill buttons with name preview
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      {header}

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          List of Features
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.id} className="flex gap-2 text-sm">
              <span className="w-5 shrink-0 font-mono font-bold text-primary">
                {f.id}
              </span>
              <span className="text-foreground"><RichText text={f.text} /></span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {group.questions.map((q) => {
          const answer = answers[q.id]?.value ?? ""
          const isFlagged = !!flagged[q.id]
          const selected = features.find((f) => f.id === answer)
          return (
            <div
              key={q.id}
              id={questionAnchorId(q.id)}
              data-question-id={q.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                  {q.questionNumber}
                </span>
                <span className="flex-1 text-sm leading-snug text-foreground">
                  <SelectableHighlightedText
                    targetId={`q-${q.id}`}
                    text={q.prompt}
                  />
                </span>
                <button
                  type="button"
                  onClick={() => onToggleFlag(q.id)}
                  className={cn(
                    "mt-0.5 shrink-0",
                    isFlagged
                      ? "text-amber-500"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  )}
                >
                  <HugeiconsIcon icon={Flag01Icon} size={14} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-9">
                {features.map((f) => {
                  const isSelected = answer === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      title={f.text}
                      onClick={() => onAnswer(q.id, f.id)}
                      className={cn(
                        "min-w-9 rounded-full border px-2.5 py-1 font-mono text-sm font-bold transition-colors sm:text-base",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {f.id}
                    </button>
                  )
                })}
                {selected && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <RichText text={selected.text} />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
