import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import { FontSize, TextStyle } from "@tiptap/extension-text-style"
import StarterKit from "@tiptap/starter-kit"
import { TEXT_ALIGN_VALUES } from "./style-utils"

export {
  FONT_SIZE_OPTIONS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  clampFontSize,
  type TextAlignValue,
  TEXT_ALIGN_VALUES,
  clampTextAlign,
  textAlignStyle,
} from "./style-utils"


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
    TextAlign.configure({
      types: ["paragraph", "heading"],
      alignments: TEXT_ALIGN_VALUES,
      defaultAlignment: "left",
    }),
    Highlight.configure({ multicolor: false }),
    ...(options?.placeholder
      ? [Placeholder.configure({ placeholder: options.placeholder })]
      : []),
  ]
}
