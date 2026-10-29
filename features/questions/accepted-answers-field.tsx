"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface AcceptedAnswersFieldProps {
  /** One entry per accepted way of writing the answer. */
  answers: string[]
  disabled?: boolean
  /** Called with the trimmed, non-empty list after every edit. */
  onCommit: (next: string[]) => void
  placeholder?: string
  addLabel?: string
  /** Dense variant for table cells. */
  compact?: boolean
  className?: string
}

/** Separator used to mirror the stored array into local state. */
const SEPARATOR = "\u0001"

/**
 * Editor for the accepted answers of one answer box.
 *
 * Each accepted variant gets its own input, so spaces and commas are ordinary
 * characters. (The previous single input split on "," and trimmed on every
 * keystroke, which made "two decade" and "1,500" impossible to type.)
 */
export function AcceptedAnswersField({
  answers,
  disabled,
  onCommit,
  placeholder = "VD: two decades",
  addLabel = "Thêm cách viết",
  compact = false,
  className,
}: AcceptedAnswersFieldProps) {
  const serialized = answers.join(SEPARATOR)
  const [rows, setRows] = React.useState<string[]>(() =>
    answers.length > 0 ? [...answers] : [""]
  )
  const focusedRef = React.useRef(false)
  const pendingFocusRef = React.useRef(false)
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([])

  // Re-sync when the stored answers change from the outside (switching
  // questions, undo, template sync…). Never while the teacher is typing.
  React.useEffect(() => {
    if (focusedRef.current) return
    setRows(serialized ? serialized.split(SEPARATOR) : [""])
  }, [serialized])

  React.useEffect(() => {
    if (!pendingFocusRef.current) return
    pendingFocusRef.current = false
    inputRefs.current[rows.length - 1]?.focus()
  }, [rows.length])

  const commit = (next: string[]) => {
    onCommit(next.map((value) => value.trim()).filter(Boolean))
  }

  const handleChange = (index: number, value: string) => {
    const next = rows.map((row, i) => (i === index ? value : row))
    setRows(next)
    commit(next)
  }

  const handleAdd = () => {
    setRows([...rows, ""])
    pendingFocusRef.current = true
  }

  const handleRemove = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    const normalized = next.length > 0 ? next : [""]
    setRows(normalized)
    commit(normalized)
  }

  return (
    <div
      className={cn("space-y-1.5", className)}
      onFocusCapture={() => {
        focusedRef.current = true
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null
        if (event.currentTarget.contains(nextTarget)) return
        focusedRef.current = false
        // Drop the empty draft rows left behind by "Thêm cách viết".
        setRows(serialized ? serialized.split(SEPARATOR) : [""])
      }}
    >
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <Input
            ref={(node) => {
              inputRefs.current[index] = node
            }}
            value={row}
            disabled={disabled}
            onChange={(event) => handleChange(index, event.target.value)}
            placeholder={placeholder}
            aria-label={`Đáp án ${index + 1}`}
            className={cn(
              "font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400",
              compact ? "h-7" : "h-8"
            )}
          />
          {!disabled && compact && index === rows.length - 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAdd}
              className="size-7 shrink-0 text-muted-foreground hover:text-primary"
              aria-label="Thêm cách viết khác"
              title="Thêm cách viết khác"
            >
              <HugeiconsIcon icon={Add01Icon} size={13} />
            </Button>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Xoá đáp án ${index + 1}`}
              title="Xoá cách viết này"
            >
              <HugeiconsIcon icon={Delete02Icon} size={13} />
            </Button>
          )}
        </div>
      ))}

      {!disabled && !compact && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7 gap-1 border-dashed text-[11px] text-muted-foreground"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} /> {addLabel}
        </Button>
      )}
    </div>
  )
}
