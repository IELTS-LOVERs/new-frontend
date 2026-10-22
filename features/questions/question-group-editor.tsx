"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  BookmarkAdd01Icon,
  Delete02Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons"
import { cn, createClientId } from "@/lib/utils"
import {
  appendToken,
  buildSampleTable,
  insertTokenAtCursor,
  nextBlankNumber,
  reconcileTemplateQuestions,
  removeTemplatePlaceholder,
} from "./lib/completion-template"
import { toast } from "sonner"
import { QUESTION_GROUP_TYPE_LABEL } from "@/lib/format"
import type {
  CandidateQuestionGroup,
  QuestionItem,
  QuestionGroup,
} from "@/lib/api/types"
import { MediaPicker } from "@/components/shared/media-picker"

export function toRoman(num: number): string {
  const romanMap: [number, string][] = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ]
  let result = ""
  for (const [val, sym] of romanMap) {
    while (num >= val) {
      result += sym
      num -= val
    }
  }
  return result
}

export interface QuestionGroupEditorProps {
  group:
    | QuestionGroup
    | (Omit<CandidateQuestionGroup, "questions"> & {
        questions: QuestionItem[]
      })
  examReadonly: boolean
  numbering: Map<string, number>
  onUpdateGroup: (patch: any) => void
  onRemoveGroup: () => void
  onAddQuestion: () => void
  onRemoveQuestion: (questionId: string) => void
  onUpdateQuestion: (questionId: string, patch: Partial<QuestionItem>) => void
  /** Optional: persist this group into the Question Bank. */
  onSaveToBank?: () => void
  savingToBank?: boolean
}

export function QuestionGroupEditor({
  group,
  examReadonly,
  numbering,
  onUpdateGroup,
  onRemoveGroup,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onSaveToBank,
  savingToBank = false,
}: QuestionGroupEditorProps) {
  const config = (group.config || {}) as Record<string, any>
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false)

  const updateConfig = (patch: Record<string, any>) => {
    onUpdateGroup({ config: { ...config, ...patch } })
  }

  // -------------------------------------------------------------------------
  // Completion-template UX (Summary / Note / Sentence / Table / Form / Flow)
  // -------------------------------------------------------------------------
  const isTemplateCompletion = [
    "summary_completion",
    "summary_completion_options",
    "sentence_completion",
    "note_completion",
    "table_completion",
    "form_completion",
    "flow_chart_completion",
  ].includes(group.groupType)
  const isSummaryWithOptions = group.groupType === "summary_completion_options"

  const templateValue: string =
    typeof config.template === "string" ? config.template : ""
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const lastSyncedTemplate = React.useRef<string | null>(null)
  const templateInitialized = React.useRef(false)

  // Realtime (debounced) two-way sync: adding/removing a `[X]` blank in the
  // template reconciles the answer rows below automatically — no manual button.
  // The first run only records the loaded template so opening an existing exam
  // never rewrites authored questions.
  React.useEffect(() => {
    if (!isTemplateCompletion) return
    const value = typeof config.template === "string" ? config.template : ""
    if (!templateInitialized.current) {
      templateInitialized.current = true
      lastSyncedTemplate.current = value
      return
    }
    if (value === lastSyncedTemplate.current) return
    const handle = setTimeout(() => {
      lastSyncedTemplate.current = value
      const currentConfig = (group.config || {}) as Record<string, any>
      const currentTemplate =
        typeof currentConfig.template === "string" ? currentConfig.template : ""
      const { questions, changed } = reconcileTemplateQuestions(
        currentTemplate,
        group.questions,
        (num) => createClientId(`q-${num}`)
      )
      if (changed) onUpdateGroup({ questions })
    }, 500)
    return () => clearTimeout(handle)
  }, [config.template, isTemplateCompletion, group, onUpdateGroup])

  const nextBlank = nextBlankNumber(group.questions)

  /**
   * Insert a snippet at the caret (when the textarea is focused) or append it
   * to the end otherwise. `block` snippets (e.g. a Markdown table) are placed on
   * their own paragraph.
   */
  const insertTemplateText = (snippet: string, block = false) => {
    const el = textareaRef.current
    const isFocused =
      !!el && typeof document !== "undefined" && document.activeElement === el
    if (isFocused && el) {
      const { value, caret } = insertTokenAtCursor(
        templateValue,
        snippet,
        el.selectionStart ?? templateValue.length,
        el.selectionEnd ?? el.selectionStart ?? templateValue.length
      )
      updateConfig({ template: value })
      requestAnimationFrame(() => {
        const node = textareaRef.current
        if (node) {
          node.focus()
          node.setSelectionRange(caret, caret)
        }
      })
      return
    }

    let nextValue: string
    if (block) {
      nextValue =
        templateValue.trim().length === 0
          ? snippet
          : templateValue.replace(/\s+$/, "") + "\n\n" + snippet
    } else {
      nextValue = appendToken(templateValue, snippet).value
    }
    updateConfig({ template: nextValue })
  }

  /** Insert the next `[X]` blank at the caret (or append when unfocused). */
  const handleInsertBlank = () => {
    insertTemplateText(`[${nextBlank}]`)
  }

  /** Insert a starter Markdown table (3×3) with blanks for table_completion. */
  const handleInsertTableTemplate = () => {
    insertTemplateText(buildSampleTable(nextBlank), true)
  }

  /** Remove a blank row and its matching `[X]` blank together. */
  const handleRemoveBlankQuestion = (q: QuestionItem) => {
    const nextTemplate = removeTemplatePlaceholder(
      templateValue,
      q.questionNumber
    )
    onUpdateGroup({
      config: { ...config, template: nextTemplate },
      questions: group.questions.filter((item) => item.id !== q.id),
    })
  }

  // -------------------------------------------------------------------------
  // MC Options Handler
  // -------------------------------------------------------------------------
  const mcOptions: Array<{ id: string; text: string }> = config.options ?? []

  const handleAddMCOption = () => {
    const nextLetter = String.fromCharCode(65 + mcOptions.length)
    const newOptions = [...mcOptions, { id: nextLetter, text: "" }]
    updateConfig({ options: newOptions })
  }

  const handleRemoveMCOption = (optId: string) => {
    if (mcOptions.length <= 2) {
      toast.error("Cần ít nhất 2 lựa chọn.")
      return
    }
    const filtered = mcOptions
      .filter((o) => o.id !== optId)
      .map((o, idx) => ({ ...o, id: String.fromCharCode(65 + idx) }))
    updateConfig({ options: filtered })
  }

  const handleUpdateMCOptionText = (idx: number, text: string) => {
    const next = [...mcOptions]
    next[idx] = { ...next[idx], text }
    updateConfig({ options: next })
  }

  // -------------------------------------------------------------------------
  // Headings Pool Handler
  // -------------------------------------------------------------------------
  const headingsPool: Array<{ id: string; text: string }> =
    config.headingsPool ?? []

  const handleAddHeading = () => {
    const nextRoman = toRoman(headingsPool.length + 1)
    const newPool = [...headingsPool, { id: nextRoman, text: "" }]
    updateConfig({ headingsPool: newPool })
  }

  const handleRemoveHeading = (idx: number) => {
    const nextPool = headingsPool
      .filter((_, i) => i !== idx)
      .map((h, i) => ({ ...h, id: toRoman(i + 1) }))
    updateConfig({ headingsPool: nextPool })
  }

  // -------------------------------------------------------------------------
  // Features Pool Handler
  // -------------------------------------------------------------------------
  const featuresPool: Array<{ id: string; text: string }> =
    config.featuresPool ?? []

  const handleAddFeature = () => {
    const nextLetter = String.fromCharCode(65 + featuresPool.length)
    const newPool = [...featuresPool, { id: nextLetter, text: "" }]
    updateConfig({ featuresPool: newPool })
  }

  const handleRemoveFeature = (idx: number) => {
    const nextPool = featuresPool
      .filter((_, i) => i !== idx)
      .map((f, i) => ({ ...f, id: String.fromCharCode(65 + i) }))
    updateConfig({ featuresPool: nextPool })
  }

  // -------------------------------------------------------------------------
  // Sentence Endings Pool Handler
  // -------------------------------------------------------------------------
  const endingsPool: Array<{ id: string; text: string }> =
    config.endingsPool ?? []

  const handleAddEnding = () => {
    const nextLetter = String.fromCharCode(65 + endingsPool.length)
    const newPool = [...endingsPool, { id: nextLetter, text: "" }]
    updateConfig({ endingsPool: newPool })
  }

  const handleRemoveEnding = (idx: number) => {
    const nextPool = endingsPool
      .filter((_, i) => i !== idx)
      .map((e, i) => ({ ...e, id: String.fromCharCode(65 + i) }))
    updateConfig({ endingsPool: nextPool })
  }

  // -------------------------------------------------------------------------
  // Paragraph Labels Handler (Matching Information)
  // -------------------------------------------------------------------------
  const paragraphLabels: string[] = config.paragraphLabels ?? [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
  ]

  // -------------------------------------------------------------------------
  // Options Pool (Summary with Options)
  // -------------------------------------------------------------------------
  const optionsPool: Array<{ id: string; text: string }> =
    config.optionsPool ?? []

  const handleAddOptionsPoolItem = () => {
    const nextLetter = String.fromCharCode(65 + optionsPool.length)
    const newPool = [...optionsPool, { id: nextLetter, text: "" }]
    updateConfig({ optionsPool: newPool })
  }

  const handleRemoveOptionsPoolItem = (idx: number) => {
    const nextPool = optionsPool
      .filter((_, i) => i !== idx)
      .map((o, i) => ({ ...o, id: String.fromCharCode(65 + i) }))
    updateConfig({ optionsPool: nextPool })
  }

  // -------------------------------------------------------------------------
  // Labels Handler (Map / Diagram)
  // -------------------------------------------------------------------------
  const labels: Array<{ id: string; label: string }> = config.labels ?? []

  const handleAddLabel = () => {
    const nextLetter = String.fromCharCode(65 + labels.length)
    const nextLabels = [...labels, { id: nextLetter, label: "" }]
    updateConfig({ labels: nextLabels })
  }

  const handleRemoveLabel = (idx: number) => {
    const nextLabels = labels
      .filter((_, i) => i !== idx)
      .map((l, i) => ({ ...l, id: String.fromCharCode(65 + i) }))
    updateConfig({ labels: nextLabels })
  }

  // Type checks
  const isMCSingle = group.groupType === "multiple_choice_single"
  const isMCMultiple = group.groupType === "multiple_choice_multiple"
  const isTFNG = group.groupType === "true_false_not_given"
  const isYNNG = group.groupType === "yes_no_not_given"
  const isHeadings = group.groupType === "matching_headings"
  const isInfo = group.groupType === "matching_information"
  const isFeatures = group.groupType === "matching_features"
  const isEndings = group.groupType === "matching_sentence_endings"
  const isSummaryOptions = group.groupType === "summary_completion_options"
  const isLabelling =
    group.groupType === "map_labelling" ||
    group.groupType === "diagram_labelling"
  const isCompletion = [
    "sentence_completion",
    "note_completion",
    "table_completion",
    "summary_completion",
    "form_completion",
    "flow_chart_completion",
  ].includes(group.groupType)
  const isShortAnswer = group.groupType === "short_answer"
  const isWriting = group.groupType.startsWith("writing_task")

  /** Resolved group-level image (config.imageMediaId) with a presigned URL. */
  const groupImage = (group.media ?? []).find((m) => m.type === "image")

  const firstQ = group.questions[0]?.questionNumber
  const lastQ = group.questions[group.questions.length - 1]?.questionNumber
  const qRangeText =
    firstQ && lastQ
      ? firstQ === lastQ
        ? `Câu ${firstQ}`
        : `Câu ${firstQ}–${lastQ}`
      : "Chưa có câu hỏi"

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs transition-all">
      {/* Group Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-xs font-bold text-primary"
          >
            {QUESTION_GROUP_TYPE_LABEL[group.groupType] || group.groupType}
          </Badge>
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {qRangeText}
          </span>
          <span className="text-[11px] text-muted-foreground">
            ({group.questions.length} câu)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onSaveToBank && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={savingToBank || examReadonly}
                  className="text-muted-foreground hover:text-primary"
                  onClick={onSaveToBank}
                >
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {savingToBank ? "Đang lưu…" : "Lưu nhóm này vào ngân hàng câu hỏi"}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={examReadonly}
                className="text-muted-foreground hover:text-destructive"
                onClick={onRemoveGroup}
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xóa nhóm câu hỏi này</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-3.5 p-3.5">
        {/* Instructions */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            Hướng dẫn nhóm (Instructions)
          </Label>
          <Textarea
            value={group.instructions}
            disabled={examReadonly}
            onChange={(e) => onUpdateGroup({ instructions: e.target.value })}
            rows={2}
            className="resize-y text-xs leading-relaxed"
            placeholder="VD: Questions 1–6. Do the following statements agree with the information..."
          />
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* Group image (all types except map/diagram labelling, which keep    */}
        {/* their dedicated block with label positions below)                   */}
        {/* ------------------------------------------------------------------- */}
        {!isLabelling && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Ảnh của nhóm
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Biểu đồ / hình minh hoạ hiển thị kèm nhóm này (PNG, JPG).
                </p>
              </div>
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                  className="h-7 shrink-0 gap-1.5 text-xs"
                >
                  <HugeiconsIcon icon={Image01Icon} size={12} /> Chọn ảnh
                </Button>
              )}
            </div>

            {groupImage ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={groupImage.url}
                  alt={groupImage.originalName || "Ảnh của nhóm"}
                  className="h-14 w-20 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {groupImage.originalName || "Ảnh của nhóm"}
                  </p>
                  {config.imageMediaId && (
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      ID: {config.imageMediaId}
                    </p>
                  )}
                </div>
                {!examReadonly && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      onUpdateGroup({
                        config: { ...config, imageMediaId: undefined },
                        media: [],
                      })
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={13} />
                  </Button>
                )}
              </div>
            ) : config.imageMediaId ? (
              <p className="text-xs text-muted-foreground">
                Đã gắn ảnh (ID:{" "}
                <span className="font-mono">{config.imageMediaId}</span>)
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Chưa gắn ảnh.</p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Multiple Choice Options Configuration */}
        {/* ------------------------------------------------------------------- */}
        {(isMCSingle || isMCMultiple) && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Danh sách lựa chọn (Options)
              </Label>
              {isMCMultiple && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Số đáp án được chọn:</span>
                  <Input
                    type="number"
                    min={2}
                    max={mcOptions.length || 5}
                    value={config.maxSelections ?? 2}
                    disabled={examReadonly}
                    onChange={(e) =>
                      updateConfig({
                        maxSelections: Number(e.target.value) || 2,
                      })
                    }
                    className="h-6 w-14 text-center font-mono text-xs"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {mcOptions.map((opt, oIdx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                    {opt.id}
                  </span>
                  <Input
                    value={opt.text}
                    disabled={examReadonly}
                    onChange={(e) =>
                      handleUpdateMCOptionText(oIdx, e.target.value)
                    }
                    className="h-8 flex-1 text-xs"
                    placeholder={`Nội dung lựa chọn ${opt.id}...`}
                  />
                  {!examReadonly && mcOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveMCOption(opt.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!examReadonly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddMCOption}
                className="h-7 gap-1 text-xs"
              >
                <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm lựa chọn{" "}
                {String.fromCharCode(65 + mcOptions.length)}
              </Button>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Headings Pool */}
        {/* ------------------------------------------------------------------- */}
        {isHeadings && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Danh sách tiêu đề (List of Headings)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Tạo danh sách các tiêu đề (số La Mã i, ii, iii...)
                </p>
              </div>
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddHeading}
                  className="h-7 gap-1 text-xs"
                >
                  <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm Heading
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {headingsPool.map((h, hIdx) => (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-center font-mono text-xs font-bold text-primary">
                    {h.id}
                  </span>
                  <Input
                    value={h.text}
                    disabled={examReadonly}
                    onChange={(e) => {
                      const next = [...headingsPool]
                      next[hIdx] = { ...next[hIdx], text: e.target.value }
                      updateConfig({ headingsPool: next })
                    }}
                    className="h-8 flex-1 text-xs"
                    placeholder={`Tiêu đề ${h.id}...`}
                  />
                  {!examReadonly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveHeading(hIdx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Information Paragraphs */}
        {/* ------------------------------------------------------------------- */}
        {isInfo && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Các đoạn văn (Paragraphs)
              </Label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs select-none">
                <input
                  type="checkbox"
                  checked={config.allowReuse ?? true}
                  disabled={examReadonly}
                  onChange={(e) =>
                    updateConfig({ allowReuse: e.target.checked })
                  }
                  className="rounded border-border accent-primary"
                />
                <span className="text-muted-foreground">
                  Cho phép dùng lại ký tự (NB: allow reuse)
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {paragraphLabels.map((p, pIdx) => (
                <div
                  key={p}
                  className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-bold"
                >
                  <span>{p}</span>
                  {!examReadonly && paragraphLabels.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = paragraphLabels.filter(
                          (_, i) => i !== pIdx
                        )
                        updateConfig({ paragraphLabels: next })
                      }}
                      className="ml-0.5 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextChar = String.fromCharCode(
                      65 + paragraphLabels.length
                    )
                    updateConfig({
                      paragraphLabels: [...paragraphLabels, nextChar],
                    })
                  }}
                  className="h-7 text-xs"
                >
                  + Đoạn {String.fromCharCode(65 + paragraphLabels.length)}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Features Pool */}
        {/* ------------------------------------------------------------------- */}
        {isFeatures && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Danh sách đối tượng / đặc điểm (Features Pool)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Ví dụ: Các nhà khoa học, thuyết, tổ chức...
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={config.allowReuse ?? true}
                    disabled={examReadonly}
                    onChange={(e) =>
                      updateConfig({ allowReuse: e.target.checked })
                    }
                    className="rounded border-border accent-primary"
                  />
                  <span className="text-muted-foreground">
                    Cho phép dùng lại
                  </span>
                </label>
                {!examReadonly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddFeature}
                    className="h-7 gap-1 text-xs"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm đối tượng
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {featuresPool.map((f, fIdx) => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                    {f.id}
                  </span>
                  <Input
                    value={f.text}
                    disabled={examReadonly}
                    onChange={(e) => {
                      const next = [...featuresPool]
                      next[fIdx] = { ...next[fIdx], text: e.target.value }
                      updateConfig({ featuresPool: next })
                    }}
                    className="h-8 flex-1 text-xs"
                    placeholder="Tên người hoặc đặc điểm..."
                  />
                  {!examReadonly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveFeature(fIdx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Sentence Endings Pool */}
        {/* ------------------------------------------------------------------- */}
        {isEndings && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Danh sách phần kết câu (Sentence Endings)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Các phần kết câu A, B, C... để ghép với vế đầu câu.
                </p>
              </div>
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddEnding}
                  className="h-7 gap-1 text-xs"
                >
                  <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm kết câu
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {endingsPool.map((e, eIdx) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                    {e.id}
                  </span>
                  <Input
                    value={e.text}
                    disabled={examReadonly}
                    onChange={(evt) => {
                      const next = [...endingsPool]
                      next[eIdx] = { ...next[eIdx], text: evt.target.value }
                      updateConfig({ endingsPool: next })
                    }}
                    className="h-8 flex-1 text-xs"
                    placeholder="Nội dung kết thúc câu..."
                  />
                  {!examReadonly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveEnding(eIdx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Completion Types & Template Generator */}
        {/* ------------------------------------------------------------------- */}
        {(isCompletion || isSummaryOptions) && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold">
                  Giới hạn số từ (Word limit):
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={config.maxWords ?? 2}
                  disabled={examReadonly}
                  onChange={(e) =>
                    updateConfig({ maxWords: Number(e.target.value) || 2 })
                  }
                  className="h-7 w-16 text-center font-mono text-xs"
                />
              </div>

              {!isSummaryOptions && (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={config.allowNumbers ?? true}
                    disabled={examReadonly}
                    onChange={(e) =>
                      updateConfig({ allowNumbers: e.target.checked })
                    }
                    className="rounded border-border accent-primary"
                  />
                  <span>Cho phép số (AND/OR A NUMBER)</span>
                </label>
              )}
            </div>

            {/* Word Bank Pool for Summary with Options */}
            {isSummaryOptions && (
              <div className="space-y-2 border-t border-border pt-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Ngân hàng từ khóa (Word Bank / Options Pool)
                  </Label>
                  {!examReadonly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddOptionsPoolItem}
                      className="h-6 gap-1 text-xs"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={11} /> Thêm từ
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {optionsPool.map((opt, oIdx) => (
                    <div key={opt.id} className="flex items-center gap-1.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-bold text-primary">
                        {opt.id}
                      </span>
                      <Input
                        value={opt.text}
                        disabled={examReadonly}
                        onChange={(e) => {
                          const next = [...optionsPool]
                          next[oIdx] = { ...next[oIdx], text: e.target.value }
                          updateConfig({ optionsPool: next })
                        }}
                        className="h-7 flex-1 text-xs"
                        placeholder="Từ / cụm từ..."
                      />
                      {!examReadonly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionsPoolItem(oIdx)}
                          className="text-sm text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Editor */}
            <div className="space-y-1.5 border-t border-border pt-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">
                    Đoạn văn tóm tắt / Ghi chú (Template)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Đặt con trỏ vào vị trí cần điền rồi bấm{" "}
                    <span className="font-semibold text-primary">
                      + Chèn ô trống
                    </span>
                    . Hệ thống tự sinh thẻ{" "}
                    <code className="rounded bg-muted px-1 font-mono font-bold text-primary">
                      [X]
                    </code>{" "}
                    và đồng bộ đáp án bên dưới ngay lập tức.
                  </p>
                </div>
                {!examReadonly && (
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {group.groupType === "table_completion" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleInsertTableTemplate}
                        onMouseDown={(e) => e.preventDefault()}
                        className="h-7 gap-1.5 text-xs"
                      >
                        <HugeiconsIcon icon={Add01Icon} size={12} /> Chèn khung
                        Bảng mẫu
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleInsertBlank}
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-7 gap-1.5 border-primary/30 text-xs text-primary hover:bg-primary/5"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={12} /> Chèn ô trống
                      [{nextBlank}]
                    </Button>
                  </div>
                )}
              </div>
              <Textarea
                ref={textareaRef}
                value={config.template ?? ""}
                disabled={examReadonly}
                onChange={(e) => updateConfig({ template: e.target.value })}
                rows={5}
                className="resize-y font-mono text-xs leading-relaxed"
                placeholder={
                  group.groupType === "table_completion"
                    ? "| Country | Capital | Note |\n| --- | --- | --- |\n| France | [1] | [2] |\n| Japan | [3] | [4] |"
                    : "Complete the notes below:\n- Ancient people discovered tea in [1] around 2700 BC.\n- The leaves were initially used for [2] purposes."
                }
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Labelling (Map & Diagram) */}
        {/* ------------------------------------------------------------------- */}
        {isLabelling && (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Hình ảnh bản đồ / sơ đồ
              </Label>
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                  className="h-7 gap-1.5 text-xs"
                >
                  <HugeiconsIcon icon={Image01Icon} size={12} /> Chọn ảnh từ thư
                  viện
                </Button>
              )}
            </div>

            {config.imageMediaId && (
              <p className="text-xs text-muted-foreground">
                Đã gắn ảnh (ID:{" "}
                <span className="font-mono">{config.imageMediaId}</span>)
              </p>
            )}

            <div className="space-y-2 border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Danh sách nhãn (Labels)
                </Label>
                {!examReadonly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddLabel}
                    className="h-6 gap-1 text-xs"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={11} /> Thêm nhãn
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((l, lIdx) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs"
                  >
                    <span className="font-bold text-primary">{l.id}</span>
                    <Input
                      value={l.label}
                      disabled={examReadonly}
                      onChange={(e) => {
                        const next = [...labels]
                        next[lIdx] = { ...next[lIdx], label: e.target.value }
                        updateConfig({ labels: next })
                      }}
                      className="h-6 w-24 text-xs"
                      placeholder="Tên vị trí..."
                    />
                    {!examReadonly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(lIdx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Short Answer */}
        {/* ------------------------------------------------------------------- */}
        {isShortAnswer && (
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/15 p-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-semibold">Số từ tối đa:</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={config.maxWords ?? 3}
                disabled={examReadonly}
                onChange={(e) =>
                  updateConfig({ maxWords: Number(e.target.value) || 3 })
                }
                className="h-7 w-16 text-center font-mono text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={config.allowNumbers ?? true}
                disabled={examReadonly}
                onChange={(e) =>
                  updateConfig({ allowNumbers: e.target.checked })
                }
                className="rounded border-border accent-primary"
              />
              <span>Cho phép số (AND/OR A NUMBER)</span>
            </label>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Writing Tasks */}
        {/* ------------------------------------------------------------------- */}
        {isWriting && (
          <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-primary">
              {group.groupType === "writing_task_1"
                ? "Writing Task 1 — Tối thiểu 150 từ"
                : "Writing Task 2 — Tối thiểu 250 từ"}
            </p>
            <p>
              Nhập đề bài chi tiết vào câu hỏi bên dưới. Hệ thống sẽ tự động
              tính số từ khi học sinh làm bài.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* QUESTIONS IN GROUP */}
        {/* ------------------------------------------------------------------- */}
        {isTemplateCompletion ? (
          <CompletionAnswerTable
            group={group}
            numbering={numbering}
            examReadonly={examReadonly}
            isSummaryWithOptions={isSummaryWithOptions}
            optionsPool={optionsPool}
            onUpdateQuestion={onUpdateQuestion}
            onRemoveBlank={handleRemoveBlankQuestion}
          />
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Danh sách câu hỏi trong nhóm ({group.questions.length})
              </Label>
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddQuestion}
                  className="h-7 gap-1 border-primary/30 text-xs text-primary"
                >
                  <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm câu hỏi
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              {group.questions.map((q) => {
                const qNum = numbering.get(q.id) ?? q.questionNumber
                const accepted = (q as any).acceptedAnswers ?? []

                return (
                  <div
                    key={q.id}
                    className="space-y-2.5 rounded-lg border border-border bg-card p-3 shadow-2xs transition-colors hover:border-border/80"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                        {qNum}
                      </span>

                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Prompt */}
                        <Input
                          value={q.prompt}
                          disabled={examReadonly}
                          onChange={(e) =>
                            onUpdateQuestion(q.id, { prompt: e.target.value })
                          }
                          className="h-8 text-xs font-medium"
                          placeholder="Nội dung câu hỏi / nhận định..."
                        />

                        {/* Answer Selectors based on Type */}
                        {isMCSingle && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn đáp án đúng:
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {mcOptions.map((opt) => {
                                const isCorrect = accepted.includes(opt.id)
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    disabled={examReadonly}
                                    onClick={() =>
                                      onUpdateQuestion(q.id, {
                                        acceptedAnswers: [opt.id],
                                      })
                                    }
                                    className={cn(
                                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                                      isCorrect
                                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    <span>{opt.id}</span>
                                    {opt.text && (
                                      <span className="max-w-[120px] truncate font-normal">
                                        ({opt.text})
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {isMCMultiple && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn các đáp án đúng (tối đa{" "}
                              {config.maxSelections ?? 2}):
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {mcOptions.map((opt) => {
                                const isCorrect = accepted.includes(opt.id)
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    disabled={examReadonly}
                                    onClick={() => {
                                      const nextAnswers = isCorrect
                                        ? accepted.filter(
                                            (a: string) => a !== opt.id
                                          )
                                        : [...accepted, opt.id]
                                      onUpdateQuestion(q.id, {
                                        acceptedAnswers: nextAnswers,
                                      })
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                                      isCorrect
                                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    <span>{opt.id}</span>
                                    {opt.text && (
                                      <span className="max-w-[120px] truncate font-normal">
                                        ({opt.text})
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {isTFNG && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn đáp án đúng:
                            </Label>
                            <div className="flex gap-2">
                              {["TRUE", "FALSE", "NOT GIVEN"].map((val) => {
                                const isCorrect = accepted.includes(val)
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    disabled={examReadonly}
                                    onClick={() =>
                                      onUpdateQuestion(q.id, {
                                        acceptedAnswers: [val],
                                      })
                                    }
                                    className={cn(
                                      "rounded-md border px-3 py-1 text-xs font-bold transition-all",
                                      isCorrect
                                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    {val}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {isYNNG && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn đáp án đúng:
                            </Label>
                            <div className="flex gap-2">
                              {["YES", "NO", "NOT GIVEN"].map((val) => {
                                const isCorrect = accepted.includes(val)
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    disabled={examReadonly}
                                    onClick={() =>
                                      onUpdateQuestion(q.id, {
                                        acceptedAnswers: [val],
                                      })
                                    }
                                    className={cn(
                                      "rounded-md border px-3 py-1 text-xs font-bold transition-all",
                                      isCorrect
                                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    {val}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {isHeadings && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn Heading đúng từ danh sách:
                            </Label>
                            <select
                              value={accepted[0] ?? ""}
                              disabled={examReadonly}
                              onChange={(e) =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: e.target.value
                                    ? [e.target.value]
                                    : [],
                                })
                              }
                              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                            >
                              <option value="">-- Chọn Heading --</option>
                              {headingsPool.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.id.toUpperCase()} — {h.text}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {isInfo && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn đoạn văn chứa thông tin:
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {paragraphLabels.map((p) => {
                                const isCorrect = accepted.includes(p)
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    disabled={examReadonly}
                                    onClick={() =>
                                      onUpdateQuestion(q.id, {
                                        acceptedAnswers: [p],
                                      })
                                    }
                                    className={cn(
                                      "size-7 rounded-md border font-mono text-xs font-bold transition-all",
                                      isCorrect
                                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    {p}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {isFeatures && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn đối tượng / đặc điểm đúng:
                            </Label>
                            <select
                              value={accepted[0] ?? ""}
                              disabled={examReadonly}
                              onChange={(e) =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: e.target.value
                                    ? [e.target.value]
                                    : [],
                                })
                              }
                              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                            >
                              <option value="">-- Chọn đối tượng --</option>
                              {featuresPool.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.id} — {f.text}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {isEndings && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn kết thúc câu đúng:
                            </Label>
                            <select
                              value={accepted[0] ?? ""}
                              disabled={examReadonly}
                              onChange={(e) =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: e.target.value
                                    ? [e.target.value]
                                    : [],
                                })
                              }
                              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                            >
                              <option value="">-- Chọn kết thúc câu --</option>
                              {endingsPool.map((end) => (
                                <option key={end.id} value={end.id}>
                                  {end.id} — {end.text}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {isSummaryOptions && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn từ đúng từ Word Bank:
                            </Label>
                            <select
                              value={accepted[0] ?? ""}
                              disabled={examReadonly}
                              onChange={(e) =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: e.target.value
                                    ? [e.target.value]
                                    : [],
                                })
                              }
                              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                            >
                              <option value="">
                                -- Chọn từ từ Word Bank --
                              </option>
                              {optionsPool.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.id} — {opt.text}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {isLabelling && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Chọn nhãn vị trí đúng:
                            </Label>
                            <select
                              value={accepted[0] ?? ""}
                              disabled={examReadonly}
                              onChange={(e) =>
                                onUpdateQuestion(q.id, {
                                  acceptedAnswers: e.target.value
                                    ? [e.target.value]
                                    : [],
                                })
                              }
                              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                            >
                              <option value="">-- Chọn nhãn --</option>
                              {labels.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.id} {l.label ? `— ${l.label}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {(isCompletion || isShortAnswer) && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Đáp án đúng (ngăn cách bằng dấu phẩy nếu có nhiều
                              cách viết):
                            </Label>
                            <Input
                              value={accepted.join(", ")}
                              disabled={examReadonly}
                              onChange={(e) => {
                                const ans = e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                                onUpdateQuestion(q.id, { acceptedAnswers: ans })
                              }}
                              className="h-8 font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400"
                              placeholder="VD: China, Republic of China"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Phân biệt hoa/thường: “shoe” và “Shoe” là hai đáp án
                              khác nhau. Thêm cả hai nếu muốn chấp nhận cả hai.
                            </p>
                          </div>
                        )}

                        {/* Explanation */}
                        <Input
                          value={q.explanation ?? ""}
                          disabled={examReadonly}
                          onChange={(e) =>
                            onUpdateQuestion(q.id, {
                              explanation: e.target.value,
                            })
                          }
                          className="h-7 text-[11px] text-muted-foreground"
                          placeholder="Giải thích đáp án (tùy chọn)..."
                        />
                      </div>

                      {!examReadonly && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onRemoveQuestion(q.id)}
                          className="mt-1 text-muted-foreground hover:text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={13} />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Media Picker Dialog */}
      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        type="image"
        onSelect={(item) => {
          onUpdateGroup({
            config: { ...config, imageMediaId: item.id },
            media: [
              {
                id: item.id,
                url: item.url,
                type: item.type,
                originalName: item.originalName,
              },
            ],
          })
          setMediaPickerOpen(false)
          toast.success(isLabelling ? "Đã chọn ảnh sơ đồ." : "Đã chọn ảnh cho nhóm.")
        }}
      />
    </div>
  )
}

/**
 * Compact answer-configuration table for template-based completion groups.
 *
 * The whole question text lives in `config.template`, so there is no per-question
 * "prompt" to author — teachers only map each `[X]` blank to its accepted answers
 * (or, for the word-bank variant, to the correct option letter).
 */
function CompletionAnswerTable({
  group,
  numbering,
  examReadonly,
  isSummaryWithOptions,
  optionsPool,
  onUpdateQuestion,
  onRemoveBlank,
}: {
  group:
    | QuestionGroup
    | (Omit<CandidateQuestionGroup, "questions"> & {
        questions: QuestionItem[]
      })
  numbering: Map<string, number>
  examReadonly: boolean
  isSummaryWithOptions: boolean
  optionsPool: Array<{ id: string; text: string }>
  onUpdateQuestion: (questionId: string, patch: Partial<QuestionItem>) => void
  onRemoveBlank: (q: QuestionItem) => void
}) {
  const questions = group.questions

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-bold text-foreground">
            Cấu hình đáp án cho các ô trống ({questions.length})
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Nội dung câu hỏi đã nằm trong bài tóm tắt nên chỉ cần nhập đáp án —
            danh sách tự đồng bộ theo các ô{" "}
            <code className="rounded bg-muted px-1 font-mono font-bold text-primary">
              [X]
            </code>{" "}
            trong template. Đáp án phân biệt chữ hoa/thường.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-[10px] font-semibold text-primary"
        >
          Tự đồng bộ
        </Badge>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">
          Chưa có ô trống nào. Dùng nút{" "}
          <span className="font-semibold text-foreground">“Chèn ô trống”</span>{" "}
          ở khung template phía trên để tạo câu hỏi.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="w-16 border-b border-border px-3 py-2 font-semibold">
                  Vị trí
                </th>
                <th className="border-b border-l border-border px-3 py-2 font-semibold">
                  {isSummaryWithOptions
                    ? "Đáp án (Word Bank)"
                    : "Đáp án đúng (Accepted Answers)"}
                </th>
                <th className="w-20 border-b border-l border-border px-3 py-2 text-center font-semibold">
                  Điểm
                </th>
                <th className="border-b border-l border-border px-3 py-2 font-semibold">
                  Giải thích
                </th>
                <th className="w-10 border-b border-l border-border px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const qNum = numbering.get(q.id) ?? q.questionNumber
                const accepted: string[] = (q as any).acceptedAnswers ?? []
                const points = (q as any).points ?? 1
                return (
                  <tr
                    key={q.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="border-b border-border px-3 py-2 align-middle">
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                        {qNum}
                      </span>
                    </td>
                    <td className="border-b border-l border-border px-3 py-2 align-middle">
                      {isSummaryWithOptions ? (
                        optionsPool.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {optionsPool.map((opt) => {
                              const selected = accepted[0] === opt.id
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={examReadonly}
                                  title={opt.text || opt.id}
                                  onClick={() =>
                                    onUpdateQuestion(q.id, {
                                      acceptedAnswers: [opt.id],
                                    })
                                  }
                                  className={cn(
                                    "flex size-6 items-center justify-center rounded border font-mono text-[10px] font-bold transition-colors",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  {opt.id}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Chưa có Word Bank — thêm từ khóa ở phần phía trên.
                          </span>
                        )
                      ) : (
                        <AcceptedAnswersField
                          answers={accepted}
                          disabled={examReadonly}
                          onCommit={(next) =>
                            onUpdateQuestion(q.id, { acceptedAnswers: next })
                          }
                        />
                      )}
                    </td>
                    <td className="border-b border-l border-border px-3 py-2 text-center align-middle">
                      <Input
                        type="number"
                        min={1}
                        value={points}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            points: Number(e.target.value) || 1,
                          })
                        }
                        className="h-7 w-14 text-center font-mono text-xs"
                      />
                    </td>
                    <td className="border-b border-l border-border px-3 py-2 align-middle">
                      <Input
                        value={q.explanation ?? ""}
                        disabled={examReadonly}
                        onChange={(e) =>
                          onUpdateQuestion(q.id, {
                            explanation: e.target.value,
                          })
                        }
                        className="h-7 text-[11px] text-muted-foreground"
                        placeholder="Giải thích (tuỳ chọn)..."
                      />
                    </td>
                    <td className="border-b border-l border-border px-2 py-2 text-center align-middle">
                      {!examReadonly && (
                        <button
                          type="button"
                          onClick={() => onRemoveBlank(q)}
                          title="Xoá câu hỏi và ô trống tương ứng"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Comma-separated "accepted answers" editor.
 *
 * Keeps its own text buffer while focused so typing `medicinal, medicine`
 * doesn't collapse the trailing comma on every keystroke, then normalises the
 * committed values (trimmed, empties removed) when the field loses focus.
 */
function AcceptedAnswersField({
  answers,
  disabled,
  onCommit,
}: {
  answers: string[]
  disabled?: boolean
  onCommit: (next: string[]) => void
}) {
  const serialized = answers.join("\u0001")
  const [text, setText] = React.useState(() => answers.join(", "))
  const focusedRef = React.useRef(false)

  React.useEffect(() => {
    if (!focusedRef.current) {
      setText(serialized.split("\u0001").join(", "))
    }
  }, [serialized])

  return (
    <Input
      value={text}
      disabled={disabled}
      onFocus={() => {
        focusedRef.current = true
      }}
      onChange={(e) => {
        setText(e.target.value)
        onCommit(
          e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      }}
      onBlur={() => {
        focusedRef.current = false
        setText(serialized.split("\u0001").join(", "))
      }}
      className="h-7 font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400"
      placeholder="VD: medicinal, medicine, medicinal purposes"
    />
  )
}
