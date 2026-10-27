import type { QuestionItem } from "@/lib/api/types"

/**
 * Helpers for the completion-template authoring UX (summary / note / sentence /
 * table / form / flow-chart completion).
 *
 * The persisted schema is unchanged: `config.template` stays a plain string that
 * carries the `[1]` / `{{q1}}` blanks and `group.questions` stays an array of
 * `QuestionItem`. These helpers only translate between the two so the editor can
 * keep them in sync automatically.
 */

/** Matches a `[12]`, `[q12]`, `{{12}}` or `{{q12}}` blank. */
const PLACEHOLDER_RE = /\{\{\s*(?:q)?(\d+)\s*\}\}|\[\s*(?:q)?(\d+)\s*\]/gi

/** Extract the unique, ascending blank numbers referenced by a template. */
export function extractTemplatePlaceholders(template: string): number[] {
  if (!template) return []
  const matches = Array.from(template.matchAll(PLACEHOLDER_RE))
  const numbers = matches
    .map((m) => Number(m[1] ?? m[2]))
    .filter((n) => Number.isFinite(n) && n > 0)
  return Array.from(new Set(numbers)).sort((a, b) => a - b)
}

/** Next blank number to insert, derived from the questions that already exist. */
export function nextBlankNumber(
  questions: Array<{ questionNumber: number }>
): number {
  if (questions.length === 0) return 1
  return Math.max(...questions.map((q) => q.questionNumber)) + 1
}

/**
 * Reconcile `questions` with the blanks found in `template`.
 *
 * - Blanks without a matching question get a fresh `QuestionItem`.
 * - Questions whose number is not referenced by any blank are dropped.
 * - Surviving questions are reused by reference, so authored answers are kept.
 *
 * When the template has no blanks at all the questions are left untouched (so a
 * temporarily-cleared template never wipes authored work).
 */
export function reconcileTemplateQuestions<T extends QuestionItem>(
  template: string,
  questions: T[],
  createId: (num: number) => string,
  options: { addOnly?: boolean } = {}
): { questions: T[]; changed: boolean } {
  const numbers = extractTemplatePlaceholders(template)
  if (numbers.length === 0) return { questions, changed: false }

  if (options.addOnly) {
    const existingNumbers = new Set(questions.map((q) => q.questionNumber))
    const missing = numbers
      .filter((num) => !existingNumbers.has(num))
      .map(
        (num) =>
          ({
            id: createId(num),
            questionNumber: num,
            prompt: "",
            acceptedAnswers: [],
            points: 1,
          }) as unknown as T
      )
    return {
      questions: missing.length > 0 ? [...questions, ...missing] : questions,
      changed: missing.length > 0,
    }
  }

  const byNumber = new Map<number, T>()
  for (const q of questions) byNumber.set(q.questionNumber, q)

  const next = numbers.map((num) => {
    const existing = byNumber.get(num)
    if (existing) return existing
    return {
      id: createId(num),
      questionNumber: num,
      prompt: "",
      acceptedAnswers: [],
      points: 1,
    } as unknown as T
  })

  const changed =
    next.length !== questions.length ||
    next.some((q, i) => q.id !== questions[i]?.id)

  return { questions: next, changed }
}

/** Remove every `[num]` / `{{qnum}}` blank for a given number from the template. */
export function removeTemplatePlaceholder(
  template: string,
  num: number
): string {
  if (!template) return template
  const re = new RegExp(
    `\\{\\{\\s*(?:q)?${num}\\s*\\}\\}|\\[\\s*(?:q)?${num}\\s*\\]`,
    "gi"
  )
  return template.replace(re, "")
}

/** Rewrite template blanks using an old → new question-number map. */
export function rewriteTemplatePlaceholders(
  template: string,
  remap: ReadonlyMap<number, number>
): string {
  if (!template || remap.size === 0) return template
  return template.replace(PLACEHOLDER_RE, (match, braceNumber, bracketNumber) => {
    const oldNumber = Number(braceNumber ?? bracketNumber)
    const newNumber = remap.get(oldNumber)
    if (newNumber === undefined) return match
    const prefix = /q/i.test(match) ? "q" : ""
    return match.startsWith("{{")
      ? `{{${prefix}${newNumber}}}`
      : `[${prefix}${newNumber}]`
  })
}

/**
 * Align a template with its group's questions. Exact old → new mapping wins;
 * when the template still uses local group numbers (bank-inserted groups), the
 * k-th blank is matched with the k-th question instead.
 */
export function alignTemplatePlaceholders(
  template: string,
  oldNumbers: ReadonlyArray<number | null | undefined>,
  newNumbers: readonly number[]
): string {
  if (!template || newNumbers.length === 0) return template
  const blanks = extractTemplatePlaceholders(template)
  if (blanks.length === 0) return template

  const remap = new Map<number, number>()
  oldNumbers.forEach((oldNumber, index) => {
    const newNumber = newNumbers[index]
    if (
      typeof oldNumber === "number" &&
      newNumber !== undefined &&
      !remap.has(oldNumber)
    ) {
      remap.set(oldNumber, newNumber)
    }
  })

  if (
    blanks.some((number) => !remap.has(number)) &&
    blanks.length === newNumbers.length
  ) {
    return rewriteTemplatePlaceholders(
      template,
      new Map(
        blanks.map((number, index) => [number, newNumbers[index]] as const)
      )
    )
  }

  return rewriteTemplatePlaceholders(template, remap)
}

/** Insert `token` at the given caret range, returning the new value + caret. */
export function insertTokenAtCursor(
  value: string,
  token: string,
  start: number,
  end: number
): { value: string; caret: number } {
  const s = Math.max(0, Math.min(start, value.length))
  const e = Math.max(s, Math.min(end, value.length))
  const nextValue = value.slice(0, s) + token + value.slice(e)
  return { value: nextValue, caret: s + token.length }
}

/** Append `token` to the end of the value, adding a separator space if needed. */
export function appendToken(
  value: string,
  token: string
): { value: string; caret: number } {
  const needsSpace = value.length > 0 && !/\s$/.test(value)
  const nextValue = value + (needsSpace ? " " : "") + token
  return { value: nextValue, caret: nextValue.length }
}

/**
 * Build a starter Markdown table (3 columns × 3 rows) whose body cells already
 * contain `[X]` blanks, starting from `startNumber`.
 */
export function buildSampleTable(startNumber: number): string {
  let n = startNumber
  const blank = () => `[${n++}]`
  const rows = ["Item A", "Item B", "Item C"].map(
    (label) => `| ${label} | ${blank()} | ${blank()} |`
  )
  return ["| Category | Detail | Notes |", "| --- | --- | --- |", ...rows].join(
    "\n"
  )
}
