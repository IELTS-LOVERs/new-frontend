"use client"

import * as React from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { RichDoc } from "@/lib/api/types"
import { legacyTextToDoc } from "./legacy"
import { richDocToPlainText } from "./plain-text"
import { createRichTextExtensions } from "./schema"
import { RichTextToolbar } from "./toolbar"
import { cleanPastedHtml } from "./word-paste"

export interface RichTextEditorProps {
  /** ProseMirror JSON. Takes precedence over `legacyText`. */
  value?: RichDoc | null
  /** Old marker-based string, converted to a document when `value` is absent. */
  legacyText?: string | null
  onChange?: (doc: RichDoc, plainText: string) => void
  placeholder?: string
  disabled?: boolean
  compact?: boolean
  minHeight?: number | string
  className?: string
  editorClassName?: string
  ariaLabel?: string
}

const UPDATE_DEBOUNCE_MS = 300

function resolveInitialDoc(
  value: RichDoc | null | undefined,
  legacyText: string | null | undefined
): RichDoc {
  return value ?? legacyTextToDoc(legacyText)
}

/**
 * Teacher-facing WYSIWYG editor. Loaded lazily on `/teacher/*` only, so the
 * student bundle never ships TipTap.
 */
export function RichTextEditor({
  value,
  legacyText,
  onChange,
  placeholder,
  disabled = false,
  compact = false,
  minHeight = 120,
  className,
  editorClassName,
  ariaLabel,
}: RichTextEditorProps) {
  const initialDoc = React.useMemo(
    () => resolveInitialDoc(value, legacyText),
    // The editor is re-created by the parent with a `key` when switching docs;
    // this memo only needs the first value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const initialJson = React.useMemo(() => JSON.stringify(initialDoc), [initialDoc])

  const lastAppliedRef = React.useRef(initialJson)
  const lastEmittedRef = React.useRef("")
  const onChangeRef = React.useRef(onChange)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const emit = React.useCallback((instance: Editor) => {
    const doc = instance.getJSON() as RichDoc
    const json = JSON.stringify(doc)
    lastEmittedRef.current = json
    lastAppliedRef.current = json
    onChangeRef.current?.(doc, richDocToPlainText(doc))
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: createRichTextExtensions({ placeholder }),
    content: initialDoc,
    editorProps: {
      attributes: {
        class: cn(
          "exam-prose max-w-none",
          compact ? "text-sm leading-relaxed" : "text-[15px] leading-relaxed",
          editorClassName
        ),
        style: `min-height:${typeof minHeight === "number" ? `${minHeight}px` : minHeight}`,
        "aria-label": ariaLabel ?? "Nội dung soạn thảo",
      },
      transformPastedHTML: (html) => cleanPastedHtml(html),
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          const hasImage = Array.from(items).some((item) =>
            item.type.startsWith("image/")
          )
          if (hasImage) {
            toast.info(
              "Ảnh trong clipboard chưa được dán. Hãy thêm ảnh qua mục “Ảnh minh hoạ”."
            )
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => emit(instance), UPDATE_DEBOUNCE_MS)
    },
    onBlur: ({ editor: instance }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      emit(instance)
    },
  })

  React.useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  // Sync external document changes without resetting the caret on every
  // keystroke. See lastAppliedRef notes above.
  const incomingDoc = React.useMemo(
    () => resolveInitialDoc(value, legacyText),
    [value, legacyText]
  )
  const incomingJson = React.useMemo(
    () => JSON.stringify(incomingDoc),
    [incomingDoc]
  )

  React.useEffect(() => {
    if (!editor) return
    if (incomingJson === lastAppliedRef.current) return
    if (incomingJson === lastEmittedRef.current) {
      lastAppliedRef.current = incomingJson
      return
    }
    if (JSON.stringify(editor.getJSON()) === incomingJson) {
      lastAppliedRef.current = incomingJson
      return
    }
    editor.commands.setContent(incomingDoc, { emitUpdate: false })
    lastAppliedRef.current = incomingJson
  }, [editor, incomingDoc, incomingJson])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-xs focus-within:border-primary/40",
        className
      )}
    >
      <div className="border-b border-border bg-muted/20 px-2 py-1.5">
        <RichTextToolbar editor={editor} disabled={disabled} compact={compact} />
      </div>
      <EditorContent
        editor={editor}
        className="px-3 py-2.5 [&_.ProseMirror]:min-h-full"
      />
    </div>
  )
}
