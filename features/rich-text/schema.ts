import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import { FontSize, TextStyle } from "@tiptap/extension-text-style"
import StarterKit from "@tiptap/starter-kit"

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

export function createRichTextExtensions(options?: { placeholder?: string }) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),
    TextStyle,
    FontSize,
    Highlight.configure({ multicolor: false }),
    ...(options?.placeholder
      ? [Placeholder.configure({ placeholder: options.placeholder })]
      : []),
  ]
}
