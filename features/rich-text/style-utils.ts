import type { CSSProperties } from "react"

/** Font sizes offered by the toolbar. Free-form px values are not allowed. */
export const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 24, 28] as const

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 28

/** Clamp an authored `fontSize` value into the supported range. */
export function clampFontSize(
  value: string | number | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed)) return null
  const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parsed))
  return `${Math.round(clamped)}px`
}

/** Paragraph/heading alignment choices offered by the toolbar. */
export type TextAlignValue = "left" | "center" | "right"

export const TEXT_ALIGN_VALUES: TextAlignValue[] = ["left", "center", "right"]

const TEXT_ALIGN_SET = new Set<string>(TEXT_ALIGN_VALUES)

/**
 * Normalise a persisted `textAlign` attribute. `null` means "no explicit
 * alignment": left/justify are the default flow so they are not stored, which
 * keeps the JSON small and older documents untouched.
 */
export function clampTextAlign(
  value: unknown
): TextAlignValue | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return TEXT_ALIGN_SET.has(normalized) ? (normalized as TextAlignValue) : null
}

/** Inline style for an aligned block, or `undefined` when nothing to apply. */
export function textAlignStyle(
  value: unknown
): CSSProperties | undefined {
  const align = clampTextAlign(value)
  return align ? { textAlign: align } : undefined
}
