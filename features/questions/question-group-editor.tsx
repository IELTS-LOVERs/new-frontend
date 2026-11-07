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
import { createClientId } from "@/lib/utils"
import {
  appendToken,
  buildSampleTable,
  compactTemplateQuestions,
  insertTokenAtCursor,
  isPartialTemplate,
  nextBlankNumber,
  reconcileTemplateQuestions,
  removeTemplatePlaceholder,
} from "./lib/completion-template"
import { TemplateLivePreview } from "./group-editor/template-live-preview"
import { CompletionAnswerTable } from "./group-editor/completion-answer-table"
import { RichTextEditor } from "@/features/rich-text/lazy-editor"
import { RICH_EDITOR_ENABLED } from "@/features/rich-text/feature-flag"
import { htmlToTemplateDsl } from "@/features/rich-text/word-paste"
import { toast } from "sonner"
import { QUESTION_GROUP_TYPE_LABEL } from "@/lib/format"
import type {
  CandidateQuestionGroup,
  QuestionItem,
  QuestionGroup,
} from "@/lib/api/types"
import { MediaPicker } from "@/components/shared/media-picker"
import {
  MCOptionsConfig,
  HeadingsPoolConfig,
  ParagraphLabelsConfig,
  FeaturesPoolConfig,
  EndingsPoolConfig,
  OptionsPoolConfig,
  LabellingLabelsConfig,
} from "./group-editor/pool-config-editor"
import { QuestionItemList } from "./group-editor/question-item-list"

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
  onUpdateGroup: (patch: Record<string, unknown>) => void
  onRemoveGroup: () => void
  onAddQuestion: () => void
  onRemoveQuestion: (questionId: string) => void
  onUpdateQuestion: (questionId: string, patch: Partial<QuestionItem>) => void
  /**
   * Optional: create/remove answer boxes so a multi-answer group has exactly
   * one question number per correct letter ("Choose TWO letters" → Q9, Q10).
   */
  onEnsureQuestionCount?: (count: number) => void
  /** Optional: persist this group into the Question Bank. */
  onSaveToBank?: () => void
  savingToBank?: boolean
}

export interface GroupConfig {
  options?: Array<{ id: string; text: string }>
  headingsPool?: Array<{ id: string; text: string }>
  featuresPool?: Array<{ id: string; text: string }>
  endingsPool?: Array<{ id: string; text: string }>
  paragraphLabels?: string[]
  optionsPool?: Array<{ id: string; text: string }>
  labels?: Array<{ id: string; label: string }>
  template?: string
  maxSelections?: number
  allowReuse?: boolean
  allowNumbers?: boolean
  allowChangeAnswer?: boolean
  maxWords?: number
  imageMediaId?: string
  [key: string]: unknown
}

function QuestionGroupEditorInner({
  group,
  examReadonly,
  numbering,
  onUpdateGroup,
  onRemoveGroup,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onEnsureQuestionCount,
  onSaveToBank,
  savingToBank = false,
}: QuestionGroupEditorProps) {
  const config = (group.config || {}) as GroupConfig
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false)

  const updateConfig = (patch: Record<string, unknown>) => {
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

  /**
   * The template and the answer rows below change together synchronously (insert
   * a blank / delete a row), so this remembers the rows of our latest update.
   * The parent re-renders a moment later with them; in between, the next click
   * (e.g. a fast double-click on "Chèn ô trống") must not read the stale list,
   * which used to produce `[3] [3]`.
   */
  const pendingQuestionsRef = React.useRef<{
    template: string
    questions: QuestionItem[]
  } | null>(null)

  // Runs after every commit: once the parent re-renders, drop the local copy.
  React.useEffect(() => {
    pendingQuestionsRef.current = null
  })

  /** Rows to build on: our in-flight update, otherwise the rendered group. */
  const readQuestions = (): QuestionItem[] => {
    const pending = pendingQuestionsRef.current
    return pending && pending.template === templateValue
      ? pending.questions
      : group.questions
  }

  /** Update the template and its answer rows in the same `onUpdateGroup` call. */
  const applyTemplate = (template: string, questions: QuestionItem[]) => {
    pendingQuestionsRef.current = { template, questions }
    onUpdateGroup({ config: { ...config, template }, questions })
  }

  // Realtime two-way sync: adding/removing a `[X]` blank in the template
  // reconciles the answer rows below automatically — no manual button.
  // The first run only records the loaded template so opening an existing exam
  // never rewrites authored questions.
  React.useEffect(() => {
    if (!isTemplateCompletion) return
    const value = typeof config.template === "string" ? config.template : ""
    if (!templateInitialized.current) {
      templateInitialized.current = true
      lastSyncedTemplate.current = value
      // Heal templates saved without their matching questions (e.g. the
      // teacher pasted blanks and left before the debounce ran). Add missing
      // questions only — never drop authored ones on open.
      const { questions, changed } = reconcileTemplateQuestions(
        value,
        group.questions,
        (num) => createClientId(`q-${num}`),
        { addOnly: true }
      )
      if (!changed) return
      const handle = setTimeout(() => onUpdateGroup({ questions }), 0)
      return () => clearTimeout(handle)
    }
    if (value === lastSyncedTemplate.current) return
    // While the teacher is still typing a blank (`[1`), do nothing — otherwise
    // the half-typed token looks like a removed blank and its row disappears.
    if (isPartialTemplate(value)) return
    const handle = setTimeout(() => {
      lastSyncedTemplate.current = value
      const currentConfig = (group.config || {}) as GroupConfig
      const currentTemplate =
        typeof currentConfig.template === "string" ? currentConfig.template : ""
      const { questions, changed } = reconcileTemplateQuestions(
        currentTemplate,
        readQuestions(),
        (num) => createClientId(`q-${num}`)
      )
      if (!changed) return
      // Keep answer numbering consecutive: deleting `[2]` out of `[1] [2] [3]`
      // leaves `[1] [3]`, which is renumbered to `[1] [2]` along with the row.
      const compacted = compactTemplateQuestions(currentTemplate, questions)
      if (compacted.template !== currentTemplate) {
        applyTemplate(compacted.template, compacted.questions)
        lastSyncedTemplate.current = compacted.template
        return
      }
      applyTemplate(currentTemplate, questions)
    }, 400)
    return () => clearTimeout(handle)
    // `readQuestions`/`applyTemplate` only read the latest render's values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.template, isTemplateCompletion, group, onUpdateGroup])

  const nextBlank = nextBlankNumber(group.questions)

  /**
   * Insert a snippet at the caret (when the textarea is focused) or append it
   * to the end otherwise. `block` snippets (e.g. a Markdown table) are placed on
   * their own paragraph.
   *
   * The matching answer rows are created in the same update, so "Chèn ô trống"
   * shows the new row immediately and the button label moves to the next number
   * without waiting for the debounced sync.
   */
  const insertTemplateText = (snippet: string, block = false) => {
    const el = textareaRef.current
    const isFocused =
      !!el && typeof document !== "undefined" && document.activeElement === el
    const currentQuestions = readQuestions()

    /** Apply template + new rows; the next `[X]` starts after the inserted blanks. */
    const commit = (value: string) => {
      const { questions: withBlanks } = reconcileTemplateQuestions(
        value,
        currentQuestions,
        (num) => createClientId(`q-${num}`),
        { addOnly: true }
      )
      const compacted = compactTemplateQuestions(value, withBlanks)
      applyTemplate(compacted.template, compacted.questions)
      return compacted.template
    }

    if (isFocused && el) {
      const { value, caret } = insertTokenAtCursor(
        templateValue,
        snippet,
        el.selectionStart ?? templateValue.length,
        el.selectionEnd ?? el.selectionStart ?? templateValue.length
      )
      const nextTemplate = commit(value)
      requestAnimationFrame(() => {
        const node = textareaRef.current
        if (node) {
          node.focus()
          const offset = nextTemplate.length - value.length
          node.setSelectionRange(caret + offset, caret + offset)
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
    commit(nextValue)
  }

  /** Insert the next `[X]` blank at the caret (or append when unfocused). */
  const handleInsertBlank = () => {
    insertTemplateText(`[${nextBlank}]`)
  }

  /** Insert a starter Markdown table (3×3) with blanks for table_completion. */
  const handleInsertTableTemplate = () => {
    insertTemplateText(buildSampleTable(nextBlank), true)
  }

  /**
   * Remove a blank row and its matching `[X]` blank together, then renumber the
   * rest to stay consecutive (`[1] [2] [3]` → delete 2 → `[1] [2]`).
   */
  const handleRemoveBlankQuestion = (q: QuestionItem) => {
    const nextTemplate = compactTemplateQuestions(
      removeTemplatePlaceholder(templateValue, q.questionNumber),
      readQuestions().filter((item) => item.id !== q.id)
    )
    applyTemplate(nextTemplate.template, nextTemplate.questions)
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

  const firstQuestion = group.questions[0]
  const lastQuestion = group.questions[group.questions.length - 1]
  const firstQ = firstQuestion
    ? numbering.get(firstQuestion.id) ?? firstQuestion.questionNumber
    : undefined
  const lastQ = lastQuestion
    ? numbering.get(lastQuestion.id) ?? lastQuestion.questionNumber
    : undefined
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
          {RICH_EDITOR_ENABLED ? (
            <RichTextEditor
              key={`group-instructions-${group.id}`}
              value={group.instructionsDoc ?? null}
              legacyText={group.instructions ?? ""}
              disabled={examReadonly}
              compact
              minHeight={72}
              placeholder="VD: Questions 1–6. Do the following statements agree with the information..."
              ariaLabel="Hướng dẫn nhóm"
              onChange={(doc, plainText) =>
                onUpdateGroup({
                  instructionsDoc: doc,
                  instructions: plainText,
                })
              }
            />
          ) : (
            <Textarea
              value={group.instructions}
              disabled={examReadonly}
              onChange={(e) => onUpdateGroup({ instructions: e.target.value })}
              rows={2}
              className="resize-y text-xs leading-relaxed"
              placeholder="VD: Questions 1–6. Do the following statements agree with the information..."
            />
          )}
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
          <MCOptionsConfig
            options={mcOptions}
            isMultiple={isMCMultiple}
            maxSelections={Number(config.maxSelections) || 2}
            questionCount={group.questions.length}
            examReadonly={examReadonly}
            onAddOption={handleAddMCOption}
            onRemoveOption={handleRemoveMCOption}
            onUpdateOptionText={handleUpdateMCOptionText}
            onUpdateMaxSelections={(val) => updateConfig({ maxSelections: val })}
            onEnsureQuestionCount={onEnsureQuestionCount}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Headings Pool */}
        {/* ------------------------------------------------------------------- */}
        {isHeadings && (
          <HeadingsPoolConfig
            headingsPool={headingsPool}
            examReadonly={examReadonly}
            onAddHeading={handleAddHeading}
            onRemoveHeading={handleRemoveHeading}
            onUpdateHeadingText={(idx, text) => {
              const next = [...headingsPool]
              next[idx] = { ...next[idx], text }
              updateConfig({ headingsPool: next })
            }}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Information Paragraphs */}
        {/* ------------------------------------------------------------------- */}
        {isInfo && (
          <ParagraphLabelsConfig
            paragraphLabels={paragraphLabels}
            allowReuse={Boolean(config.allowReuse ?? true)}
            examReadonly={examReadonly}
            onAddParagraph={() => {
              const nextChar = String.fromCharCode(65 + paragraphLabels.length)
              updateConfig({ paragraphLabels: [...paragraphLabels, nextChar] })
            }}
            onRemoveParagraph={(idx) => {
              const next = paragraphLabels.filter((_, i) => i !== idx)
              updateConfig({ paragraphLabels: next })
            }}
            onToggleAllowReuse={(allowed) => updateConfig({ allowReuse: allowed })}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Features Pool */}
        {/* ------------------------------------------------------------------- */}
        {isFeatures && (
          <FeaturesPoolConfig
            featuresPool={featuresPool}
            allowReuse={Boolean(config.allowReuse ?? true)}
            examReadonly={examReadonly}
            onAddFeature={handleAddFeature}
            onRemoveFeature={handleRemoveFeature}
            onUpdateFeatureText={(idx, text) => {
              const next = [...featuresPool]
              next[idx] = { ...next[idx], text }
              updateConfig({ featuresPool: next })
            }}
            onToggleAllowReuse={(allowed) => updateConfig({ allowReuse: allowed })}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Sentence Endings Pool */}
        {/* ------------------------------------------------------------------- */}
        {isEndings && (
          <EndingsPoolConfig
            endingsPool={endingsPool}
            examReadonly={examReadonly}
            onAddEnding={handleAddEnding}
            onRemoveEnding={handleRemoveEnding}
            onUpdateEndingText={(idx, text) => {
              const next = [...endingsPool]
              next[idx] = { ...next[idx], text }
              updateConfig({ endingsPool: next })
            }}
          />
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
              <OptionsPoolConfig
                optionsPool={optionsPool}
                allowChangeAnswer={Boolean(config.allowChangeAnswer ?? true)}
                examReadonly={examReadonly}
                onAddOptionsPoolItem={handleAddOptionsPoolItem}
                onRemoveOptionsPoolItem={handleRemoveOptionsPoolItem}
                onUpdateOptionsPoolItemText={(idx, text) => {
                  const next = [...optionsPool]
                  next[idx] = { ...next[idx], text }
                  updateConfig({ optionsPool: next })
                }}
                onToggleAllowChangeAnswer={(allowed) =>
                  updateConfig({ allowChangeAnswer: allowed })
                }
              />
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
                onPaste={(e) => {
                  const clipboard = e.clipboardData
                  if (!clipboard) return
                  const hasImage = Array.from(clipboard.items ?? []).some((item) =>
                    item.type.startsWith("image/")
                  )
                  if (hasImage) {
                    e.preventDefault()
                    toast.info(
                      "Ảnh trong clipboard chưa được dán vào mẫu. Hãy thêm ảnh qua mục “Ảnh của nhóm”."
                    )
                    return
                  }
                  const html = clipboard.getData("text/html")
                  if (!html) return
                  const dsl = htmlToTemplateDsl(html)
                  if (!dsl) return
                  e.preventDefault()
                  const el = e.currentTarget
                  const start = el.selectionStart ?? templateValue.length
                  const end = el.selectionEnd ?? start
                  const nextValue =
                    templateValue.slice(0, start) + dsl + templateValue.slice(end)
                  updateConfig({ template: nextValue })
                  requestAnimationFrame(() => {
                    const node = textareaRef.current
                    if (node) {
                      node.focus()
                      const caret = start + dsl.length
                      node.setSelectionRange(caret, caret)
                    }
                  })
                  toast.success("Đã chuyển nội dung dán từ Word sang định dạng mẫu.")
                }}
                rows={5}
                className="resize-y font-mono text-xs leading-relaxed"
                placeholder={
                  group.groupType === "table_completion"
                    ? "| Country | Capital | Note |\n| --- | --- | --- |\n| France | [1] | [2] |\n| Japan | [3] | [4] |"
                    : "Complete the notes below:\n- Ancient people discovered tea in [1] around 2700 BC.\n- The leaves were initially used for [2] purposes."
                }
              />
              {templateValue.trim().length > 0 && (
                <TemplateLivePreview
                  template={templateValue}
                  groupType={group.groupType}
                />
              )}
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

            <LabellingLabelsConfig
              labels={labels}
              examReadonly={examReadonly}
              onAddLabel={handleAddLabel}
              onRemoveLabel={handleRemoveLabel}
              onUpdateLabelText={(idx, label) => {
                const next = [...labels]
                next[idx] = { ...next[idx], label }
                updateConfig({ labels: next })
              }}
            />
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
          <QuestionItemList
            questions={group.questions}
            groupType={group.groupType}
            numbering={numbering}
            examReadonly={examReadonly}
            maxSelections={Number(config.maxSelections) || 2}
            mcOptions={mcOptions}
            headingsPool={headingsPool}
            paragraphLabels={paragraphLabels}
            featuresPool={featuresPool}
            endingsPool={endingsPool}
            optionsPool={optionsPool}
            labels={labels}
            onAddQuestion={onAddQuestion}
            onRemoveQuestion={onRemoveQuestion}
            onUpdateQuestion={onUpdateQuestion}
          />
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

export const QuestionGroupEditor = React.memo(
  QuestionGroupEditorInner,
  (prev, next) => {
    if (prev.examReadonly !== next.examReadonly) return false
    if (prev.savingToBank !== next.savingToBank) return false
    if (prev.numbering !== next.numbering) return false
    if (prev.group !== next.group) return false
    return true
  }
)

