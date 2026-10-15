/**
 * DOM helpers for "jump to question N" navigation from the bottom palette.
 *
 * Every rendered question carries `data-question-number="<global number>"` plus
 * a matching `id="exam-q-<n>"` so the footer can scroll the (independently
 * scrollable) question panel to the exact question and flash a focus ring.
 */

/** Data attribute stamped on every question anchor element. */
export const QUESTION_NUMBER_ATTR = "data-question-number"

/** CSS selector used to locate a question anchor by its global number. */
export function questionAnchorSelector(questionNumber: number): string {
  return `[${QUESTION_NUMBER_ATTR}="${questionNumber}"]`
}

/** Stable DOM id for a question anchor. */
export function questionAnchorId(questionNumber: number): string {
  return `exam-q-${questionNumber}`
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
 * Scroll the question panel to question `questionNumber` (centred) and flash a
 * focus ring. Returns `false` when no anchor is mounted (e.g. the target
 * section has not rendered yet) so callers can retry later.
 */
export function scrollToQuestion(
  questionNumber: number,
  opts: { behavior?: ScrollBehavior; focusMs?: number } = {}
): boolean {
  if (typeof document === "undefined") return false
  const el = document.querySelector<HTMLElement>(
    questionAnchorSelector(questionNumber)
  )
  if (!el) return false
  el.scrollIntoView({
    behavior: opts.behavior ?? "smooth",
    block: "center",
  })
  flashQuestionElement(el, opts.focusMs ?? QUESTION_FLASH_MS)
  return true
}
