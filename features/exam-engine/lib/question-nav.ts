/**
 * DOM helpers for "jump to question" navigation from the bottom palette.
 *
 * Every rendered question carries `data-question-id="<question id>"` plus a
 * matching `id="exam-q-<question id>"`. Question *numbers* are display data and
 * can repeat across skills (Listening Q1 / Reading Q1), so navigation must key
 * on the globally unique question id instead.
 */

/** Data attribute stamped on every question anchor element. */
export const QUESTION_ID_ATTR = "data-question-id"

/** CSS selector used to locate a question anchor by its question id. */
export function questionAnchorSelector(questionId: string): string {
  return `[${QUESTION_ID_ATTR}="${questionId}"]`
}

/** Stable DOM id for a question anchor. */
export function questionAnchorId(questionId: string): string {
  return `exam-q-${questionId}`
}

/** Duration (ms) the focus ring stays visible after a jump. */
export const QUESTION_FLASH_MS = 1500

/**
 * Add a temporary focus ring to a question element. Inline styles are used (and
 * then cleared) so the effect never depends on Tailwind's content scanner.
 */
export function flashQuestionElement(
  el: HTMLElement,
  durationMs: number = QUESTION_FLASH_MS
): void {
  if (typeof window === "undefined") return
  el.style.outline = "2px solid var(--primary)"
  el.style.outlineOffset = "3px"
  el.style.borderRadius = "0.5rem"
  el.style.transition = "outline-color 200ms ease"
  window.setTimeout(() => {
    el.style.outline = ""
    el.style.outlineOffset = ""
    el.style.borderRadius = ""
    el.style.transition = ""
  }, durationMs)
}

/**
 * Scroll the question panel to the question with `questionId` (centred) and
 * flash a focus ring. Returns `false` when no anchor is mounted (e.g. the
 * target section has not rendered yet) so callers can retry later.
 */
export function scrollToQuestion(
  questionId: string,
  opts: { behavior?: ScrollBehavior; focusMs?: number } = {}
): boolean {
  if (typeof document === "undefined") return false
  const el = document.querySelector<HTMLElement>(
    questionAnchorSelector(questionId)
  )
  if (!el) return false
  el.scrollIntoView({
    behavior: opts.behavior ?? "smooth",
    block: "center",
  })
  flashQuestionElement(el, opts.focusMs ?? QUESTION_FLASH_MS)
  return true
}
