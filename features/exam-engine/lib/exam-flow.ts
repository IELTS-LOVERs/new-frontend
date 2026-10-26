/**
 * Pure helpers used by the exam screen (`app/exam/[attemptId]/page.tsx`) for
 * both the "display đề" rendering and the exam user-flow (progress, question
 * numbering, submit review). Extracted here so the logic can be unit-tested
 * without mounting the (very large) page component.
 */

import type {
  CandidateExam,
  CandidateQuestionGroup,
  CandidateQuestionItem,
  CandidateSection,
  MediaItem,
  RichDoc,
} from "@/lib/api/types"

export type BlankAnswers = Record<
  string,
  { value: string; updatedAt: number; dirty: boolean }
>

// ─── Word counting (Writing tasks) ────────────────────────────────────────────

/** Count whitespace-separated words, ignoring leading/trailing whitespace. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

// ─── Section → linear question list (display numbering) ────────────────────────

export interface FlatQuestion {
  id: string
  prompt: string
  /** `groupType` of the owning group. */
  type?: string
  /** The owning group's `config` (display-only). */
  data?: Record<string, unknown>
  questionNumber?: number
}

/** Flatten a section's question groups into a linear list of questions. */
export function flattenSectionQuestions(section: CandidateSection): FlatQuestion[] {
  return (section.questionGroups ?? []).flatMap((group) =>
    group.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: group.groupType,
      data: group.config as Record<string, unknown>,
      questionNumber: q.questionNumber,
    }))
  )
}

export interface IndexedExamQuestion extends FlatQuestion {
  /** Index of the owning section inside `exam.sections`. */
  sectionIndex: number
}

/** Flatten the whole exam into a linear list, tagging each question's section. */
export function buildExamQuestionIndex(exam: CandidateExam): IndexedExamQuestion[] {
  return exam.sections.flatMap((section, sectionIndex) =>
    flattenSectionQuestions(section).map((q) => ({ ...q, sectionIndex }))
  )
}

// ─── Writing task lookup ──────────────────────────────────────────────────────

export interface WritingQuestionView {
  id: string
  prompt: string
  promptDoc?: RichDoc | null
  content?: string
  media?: MediaItem[]
}

/** Locate the (optional) writing task question inside a writing section. */
export function findWritingQuestion(
  section: CandidateSection,
  task: "writing_task_1" | "writing_task_2"
): WritingQuestionView | undefined {
  const group = (section.questionGroups ?? []).find((g) => g.groupType === task)
  const q = group?.questions[0]
  if (!q) return undefined
  return {
    id: q.id,
    prompt: q.prompt,
    promptDoc: q.promptDoc ?? null,
    content: group?.instructions || undefined,
    // Group-level image (e.g. Task 1 chart) first, then per-question media.
    media: [...(group?.media ?? []), ...(q.media ?? [])],
  }
}

// ─── Inline `[X]` / `{{qX}}` template blanks ───────────────────────────────────

/**
 * Splits text on `[X]` / `{{qX}}` blanks. The regex uses NO inner capture
 * groups, so `String.split` returns whole tokens (no stray digits leaking out).
 */
export const INLINE_TOKEN_SPLIT =
  /(\{\{\s*(?:q)?\d+\s*\}\}|\[\s*(?:q)?\d+\s*\])/gi

const INLINE_TOKEN_EXACT = /^\{\{\s*(?:q)?\d+\s*\}\}$|^\[\s*(?:q)?\d+\s*\]$/i

/** Return the question number of an inline blank token, or `null` if not one. */
export function parseInlineToken(part: string): number | null {
  if (!INLINE_TOKEN_EXACT.test(part)) return null
  const digits = part.match(/\d+/)?.[0]
  if (!digits) return null
  return parseInt(digits, 10)
}

/**
 * Resolve the question that an inline blank number points at. Prefers an exact
 * `questionNumber` match, then falls back to positional indexing.
 */
export function resolveInlineBlankQuestion(
  questions: CandidateQuestionItem[],
  questionNumber: number
): CandidateQuestionItem | undefined {
  return (
    questions.find((q) => q.questionNumber === questionNumber) ??
    questions[questionNumber - 1]
  )
}

// ─── Question-group display metadata ─────────────────────────────────────────

export interface MatchPoolItem {
  id: string
  text: string
}

export interface GroupViewMeta {
  options: Array<{ id: string; text: string }>
  optionsPool: Array<{ id: string; text: string }>
  labelsPool: Array<{ id: string; label: string }>
  isTFNG: boolean
  isYNNG: boolean
  isMatching: boolean
  isCompletion: boolean
  maxWords?: number
  wordLimitText?: string
  matchPool: MatchPoolItem[]
}

/** Group types that enforce a "NO MORE THAN N WORDS" limit in the UI. */
export const COMPLETION_GROUP_TYPES = [
  "sentence_completion",
  "note_completion",
  "table_completion",
  "summary_completion",
  "form_completion",
  "flow_chart_completion",
  "short_answer",
] as const

/** Derive all display-only metadata a question group needs to render. */
export function getGroupViewMeta(group: CandidateQuestionGroup): GroupViewMeta {
  const config = group.config ?? {}
  const options = (config.options as GroupViewMeta["options"]) ?? []
  const optionsPool = (config.optionsPool as GroupViewMeta["optionsPool"]) ?? []
  const labelsPool = (config.labels as GroupViewMeta["labelsPool"]) ?? []

  const isTFNG = group.groupType === "true_false_not_given"
  const isYNNG = group.groupType === "yes_no_not_given"
  const isMatching = group.groupType.startsWith("matching_")
  const isCompletion = (COMPLETION_GROUP_TYPES as readonly string[]).includes(
    group.groupType
  )

  const maxWords = (config.maxWords as number) ?? undefined
  const wordLimitText = maxWords
    ? `NO MORE THAN ${maxWords} WORD${maxWords > 1 ? "S" : ""}`
    : undefined

  const matchPool: MatchPoolItem[] = (() => {
    if (group.groupType === "matching_headings")
      return (config.headingsPool as MatchPoolItem[]) ?? []
    if (group.groupType === "matching_information")
      return ((config.paragraphLabels as string[]) ?? []).map((label) => ({
        id: label,
        text: label,
      }))
    if (group.groupType === "matching_features")
      return (config.featuresPool as MatchPoolItem[]) ?? []
    if (group.groupType === "matching_sentence_endings")
      return (config.endingsPool as MatchPoolItem[]) ?? []
    return []
  })()

  return {
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
  }
}

// ─── Progress / submit review ─────────────────────────────────────────────────

/** A blank answer counts as answered only when it has non-whitespace content. */
export function isAnswered(value: string | undefined | null): boolean {
  return !!value?.trim()
}

/** Number of answered questions across every recorded answer. */
export function computeAnsweredCount(answers: BlankAnswers): number {
  return Object.values(answers).filter((a) => isAnswered(a.value)).length
}

export interface SectionReview {
  section: CandidateSection
  questions: FlatQuestion[]
  total: number
  answered: number
  flaggedCount: number
  isWriting: boolean
  /** Writing only: word count for each question, aligned with `questions`. */
  wordCounts: number[]
}

/** Per-section progress summary shown in the "Xác nhận nộp bài" dialog. */
export function computeSectionReviews(
  exam: CandidateExam,
  answers: BlankAnswers,
  flagged: Record<string, true>
): SectionReview[] {
  return exam.sections.map((section) => {
    const questions = flattenSectionQuestions(section)
    const isWriting = section.skill === "writing"
    return {
      section,
      questions,
      total: questions.length,
      answered: questions.filter((q) => isAnswered(answers[q.id]?.value)).length,
      flaggedCount: questions.filter((q) => flagged[q.id]).length,
      isWriting,
      wordCounts: questions.map((q) => countWords(answers[q.id]?.value ?? "")),
    }
  })
}
