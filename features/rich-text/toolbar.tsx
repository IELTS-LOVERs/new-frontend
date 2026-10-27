"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FONT_SIZE_OPTIONS, clampFontSize, type TextAlignValue } from "./schema"

function ToolbarButton({
  active,
  disabled,
  title,
  onClick,
  className,
  children,
}: {
  active?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size="sm"
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "h-8 min-w-8 px-2 text-xs",
        active && "border-primary/40 bg-primary/10 text-primary",
        className
      )}
    >
      {children}
    </Button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
}

const ALIGN_OPTIONS: Array<{
  value: TextAlignValue
  title: string
  label: string
  className: string
}> = [
  {
    value: "left",
    title: "Canh trái",
    label: "Trái",
    className: "text-left",
  },
  {
    value: "center",
    title: "Canh giữa",
    label: "Giữa",
    className: "text-center",
  },
  {
    value: "right",
    title: "Canh phải",
    label: "Phải",
    className: "text-right",
  },
]

export function RichTextToolbar({
  editor,
  disabled,
  compact = false,
  className,
}: {
  editor: Editor | null
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  const [, forceRender] = React.useReducer((value) => value + 1, 0)

  React.useEffect(() => {
    if (!editor) return
    const update = () => forceRender()
    editor.on("transaction", update)
    editor.on("selectionUpdate", update)
    editor.on("focus", update)
    editor.on("blur", update)
    return () => {
      editor.off("transaction", update)
      editor.off("selectionUpdate", update)
      editor.off("focus", update)
      editor.off("blur", update)
    }
  }, [editor])

  if (!editor) return null

  const chain = () => editor.chain().focus()
  const currentFontSize = clampFontSize(
    editor.getAttributes("textStyle").fontSize
  )
  const headingLevel = ([1, 2, 3] as const).find((level) =>
    editor.isActive("heading", { level })
  )
  const currentBlock = headingLevel ? `h${headingLevel}` : "p"
  const fontSizeIsCustom =
    !!currentFontSize &&
    !FONT_SIZE_OPTIONS.some((size) => `${size}px` === currentFontSize)

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      role="toolbar"
      aria-label="Định dạng văn bản"
    >
      <ToolbarButton
        title="In đậm (Ctrl+B)"
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={() => chain().toggleBold().run()}
        className="font-bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="In nghiêng (Ctrl+I)"
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={() => chain().toggleItalic().run()}
        className="italic"
      >
        I
      </ToolbarButton>
      <ToolbarButton
        title="Gạch chân (Ctrl+U)"
        active={editor.isActive("underline")}
        disabled={disabled}
        onClick={() => chain().toggleUnderline().run()}
        className="underline"
      >
        U
      </ToolbarButton>
      <ToolbarButton
        title="Gạch ngang"
        active={editor.isActive("strike")}
        disabled={disabled}
        onClick={() => chain().toggleStrike().run()}
        className="line-through"
      >
        S
      </ToolbarButton>
      <ToolbarButton
        title="Bôi nền chữ"
        active={editor.isActive("highlight")}
        disabled={disabled}
        onClick={() => chain().toggleHighlight().run()}
        className="bg-amber-50 text-stone-800 hover:bg-amber-100 dark:bg-amber-400/20 dark:text-amber-100"
      >
        <span className="rounded bg-amber-300/70 px-1 dark:bg-amber-400/50">H</span>
      </ToolbarButton>

      <Divider />

      <select
        aria-label="Cỡ chữ"
        title="Cỡ chữ"
        disabled={disabled}
        value={currentFontSize ?? ""}
        onChange={(event) => {
          const value = event.target.value
          if (!value) {
            chain().unsetFontSize().run()
            return
          }
          chain().setFontSize(value).run()
        }}
        className="h-8 rounded-md border border-border bg-background px-1.5 text-xs text-foreground"
      >
        <option value="">Cỡ mặc định</option>
        {fontSizeIsCustom && (
          <option value={currentFontSize ?? ""}>{currentFontSize}</option>
        )}
        {FONT_SIZE_OPTIONS.map((size) => (
          <option key={size} value={`${size}px`}>
            {size}
          </option>
        ))}
      </select>

      {!compact && (
        <>
          <Divider />
          <ToolbarButton
            title="Tiêu đề lớn"
            active={currentBlock === "h1"}
            disabled={disabled}
            onClick={() => chain().setHeading({ level: 1 }).run()}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            title="Tiêu đề vừa"
            active={currentBlock === "h2"}
            disabled={disabled}
            onClick={() => chain().setHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="Tiêu đề nhỏ"
            active={currentBlock === "h3"}
            disabled={disabled}
            onClick={() => chain().setHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            title="Đoạn văn thường"
            active={currentBlock === "p"}
            disabled={disabled}
            onClick={() => chain().setParagraph().run()}
          >
            P
          </ToolbarButton>
        </>
      )}

      <Divider />

      {ALIGN_OPTIONS.map((option) => (
        <ToolbarButton
          key={option.value}
          title={option.title}
          active={editor.isActive({ textAlign: option.value })}
          disabled={disabled}
          onClick={() => {
            // Left is the default flow, so store no attribute for it — that
            // keeps the saved JSON identical to an un-aligned paragraph.
            if (option.value === "left") {
              chain().unsetTextAlign().run()
              return
            }
            chain().setTextAlign(option.value).run()
          }}
          className="px-1.5"
        >
          <span className="flex w-4 flex-col gap-[3px]" aria-hidden>
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                className={cn(
                  "block h-[2px] w-full rounded-full bg-current opacity-70",
                  option.value === "center" && row !== 2 && "mx-auto w-3/4",
                  option.value === "right" && "ml-auto w-3/4",
                  option.value === "left" && "w-3/4"
                )}
              />
            ))}
          </span>
          <span className="sr-only">{option.title}</span>
        </ToolbarButton>
      ))}

      <Divider />

      <ToolbarButton
        title="Danh sách gạch đầu dòng"
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() => chain().toggleBulletList().run()}
        className="px-1.5"
      >
        <HugeiconsIcon icon={LeftToRightListBulletIcon} size={15} strokeWidth={1.8} />
      </ToolbarButton>
      <ToolbarButton
        title="Danh sách đánh số"
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() => chain().toggleOrderedList().run()}
        className="px-1.5"
      >
        <HugeiconsIcon icon={LeftToRightListNumberIcon} size={15} strokeWidth={1.8} />
      </ToolbarButton>

      {!compact && (
        <>
          <Divider />
          <ToolbarButton
            title="Trích dẫn"
            active={editor.isActive("blockquote")}
            disabled={disabled}
            onClick={() => chain().toggleBlockquote().run()}
          >
            “ ”
          </ToolbarButton>
          <ToolbarButton
            title="Hoàn tác (Ctrl+Z)"
            disabled={disabled || !editor.can().undo()}
            onClick={() => chain().undo().run()}
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            title="Làm lại (Ctrl+Shift+Z)"
            disabled={disabled || !editor.can().redo()}
            onClick={() => chain().redo().run()}
          >
            ↷
          </ToolbarButton>
          <ToolbarButton
            title="Xoá định dạng"
            disabled={disabled}
            onClick={() => chain().unsetAllMarks().clearNodes().run()}
          >
            Xoá ĐD
          </ToolbarButton>
        </>
      )}
    </div>
  )
}
