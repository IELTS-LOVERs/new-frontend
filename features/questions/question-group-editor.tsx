"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  SparklesIcon,
  Image01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { QUESTION_GROUP_TYPE_LABEL } from "@/lib/format"
import type {
  CandidateQuestionGroup,
  QuestionItem,
  QuestionGroup,
  QuestionGroupType,
  SkillType,
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
  group: QuestionGroup | (Omit<CandidateQuestionGroup, "questions"> & { questions: QuestionItem[] })
  gIndex: number
  sectionSkill: SkillType
  sectionTitle: string
  examReadonly: boolean
  numbering: Map<string, number>
  onUpdateGroup: (patch: any) => void
  onRemoveGroup: () => void
  onAddQuestion: () => void
  onRemoveQuestion: (questionId: string) => void
  onUpdateQuestion: (questionId: string, patch: Partial<QuestionItem>) => void
}

export function QuestionGroupEditor({
  group,
  gIndex,
  sectionSkill,
  sectionTitle,
  examReadonly,
  numbering,
  onUpdateGroup,
  onRemoveGroup,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}: QuestionGroupEditorProps) {
  const config = (group.config || {}) as Record<string, any>
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false)

  const updateConfig = (patch: Record<string, any>) => {
    onUpdateGroup({ config: { ...config, ...patch } })
  }

  // Helper: auto-generate questions from template placeholders {{q1}} or [1]
  const syncQuestionsFromTemplate = (template: string) => {
    const matches = Array.from(template.matchAll(/\{\{q(\d+)\}\}|\[(\d+)\]/gi))
    if (matches.length === 0) {
      toast.info("Không tìm thấy placeholder {{q1}} hoặc [1] trong template.")
      return
    }

    const detectedNumbers = matches.map((m) => Number(m[1] || m[2])).filter(Boolean)
    const uniqueNumbers = Array.from(new Set(detectedNumbers)).sort((a, b) => a - b)

    const existingByNum = new Map<number, QuestionItem>()
    for (const q of group.questions) {
      existingByNum.set(q.questionNumber, q as QuestionItem)
    }

    const newQuestions: QuestionItem[] = uniqueNumbers.map((num) => {
      const existing = existingByNum.get(num)
      if (existing) return existing
      return {
        id: `q-${Date.now()}-${num}-${Math.random().toString(36).slice(2, 6)}`,
        questionNumber: num,
        prompt: `Question ${num}`,
        acceptedAnswers: [],
        points: 1,
      }
    })

    onUpdateGroup({ questions: newQuestions })
    toast.success(`Đã đồng bộ ${newQuestions.length} câu hỏi từ template.`)
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
  const headingsPool: Array<{ id: string; text: string }> = config.headingsPool ?? []

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
  const featuresPool: Array<{ id: string; text: string }> = config.featuresPool ?? []

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
  const endingsPool: Array<{ id: string; text: string }> = config.endingsPool ?? []

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
  const paragraphLabels: string[] = config.paragraphLabels ?? ["A", "B", "C", "D", "E", "F", "G"]

  // -------------------------------------------------------------------------
  // Options Pool (Summary with Options)
  // -------------------------------------------------------------------------
  const optionsPool: Array<{ id: string; text: string }> = config.optionsPool ?? []

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
  const isLabelling = group.groupType === "map_labelling" || group.groupType === "diagram_labelling"
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
  const isSpeaking = group.groupType.startsWith("speaking_part")

  const firstQ = group.questions[0]?.questionNumber
  const lastQ = group.questions[group.questions.length - 1]?.questionNumber
  const qRangeText = firstQ && lastQ ? (firstQ === lastQ ? `Câu ${firstQ}` : `Câu ${firstQ}–${lastQ}`) : "Chưa có câu hỏi"

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs transition-all">
      {/* Group Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-bold">
            {QUESTION_GROUP_TYPE_LABEL[group.groupType] || group.groupType}
          </Badge>
          <span className="font-mono text-xs font-semibold text-muted-foreground">{qRangeText}</span>
          <span className="text-[11px] text-muted-foreground">({group.questions.length} câu)</span>
        </div>
        <div className="flex items-center gap-1">
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
          <Label className="text-xs font-medium text-foreground">Hướng dẫn nhóm (Instructions)</Label>
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
        {/* Multiple Choice Options Configuration */}
        {/* ------------------------------------------------------------------- */}
        {(isMCSingle || isMCMultiple) && (
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Danh sách lựa chọn (Options)</Label>
              {isMCMultiple && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Số đáp án được chọn:</span>
                  <Input
                    type="number"
                    min={2}
                    max={mcOptions.length || 5}
                    value={config.maxSelections ?? 2}
                    disabled={examReadonly}
                    onChange={(e) => updateConfig({ maxSelections: Number(e.target.value) || 2 })}
                    className="h-6 w-14 font-mono text-xs text-center"
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
                    onChange={(e) => handleUpdateMCOptionText(oIdx, e.target.value)}
                    className="h-8 text-xs flex-1"
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
                className="h-7 text-xs gap-1"
              >
                <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm lựa chọn {String.fromCharCode(65 + mcOptions.length)}
              </Button>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Matching Headings Pool */}
        {/* ------------------------------------------------------------------- */}
        {isHeadings && (
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">Danh sách tiêu đề (List of Headings)</Label>
                <p className="text-[11px] text-muted-foreground">Tạo danh sách các tiêu đề (số La Mã i, ii, iii...)</p>
              </div>
              {!examReadonly && (
                <Button variant="outline" size="sm" onClick={handleAddHeading} className="h-7 text-xs gap-1">
                  <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm Heading
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {headingsPool.map((h, hIdx) => (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 font-mono text-xs font-bold text-primary text-center">
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
                    className="h-8 text-xs flex-1"
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
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Các đoạn văn (Paragraphs)</Label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.allowReuse ?? true}
                  disabled={examReadonly}
                  onChange={(e) => updateConfig({ allowReuse: e.target.checked })}
                  className="rounded border-border accent-primary"
                />
                <span className="text-muted-foreground">Cho phép dùng lại ký tự (NB: allow reuse)</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {paragraphLabels.map((p, pIdx) => (
                <div key={p} className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-bold">
                  <span>{p}</span>
                  {!examReadonly && paragraphLabels.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = paragraphLabels.filter((_, i) => i !== pIdx)
                        updateConfig({ paragraphLabels: next })
                      }}
                      className="text-muted-foreground hover:text-destructive ml-0.5"
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
                    const nextChar = String.fromCharCode(65 + paragraphLabels.length)
                    updateConfig({ paragraphLabels: [...paragraphLabels, nextChar] })
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
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">Danh sách đối tượng / đặc điểm (Features Pool)</Label>
                <p className="text-[11px] text-muted-foreground">Ví dụ: Các nhà khoa học, thuyết, tổ chức...</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.allowReuse ?? true}
                    disabled={examReadonly}
                    onChange={(e) => updateConfig({ allowReuse: e.target.checked })}
                    className="rounded border-border accent-primary"
                  />
                  <span className="text-muted-foreground">Cho phép dùng lại</span>
                </label>
                {!examReadonly && (
                  <Button variant="outline" size="sm" onClick={handleAddFeature} className="h-7 text-xs gap-1">
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
                    className="h-8 text-xs flex-1"
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
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">Danh sách phần kết câu (Sentence Endings)</Label>
                <p className="text-[11px] text-muted-foreground">Các phần kết câu A, B, C... để ghép với vế đầu câu.</p>
              </div>
              {!examReadonly && (
                <Button variant="outline" size="sm" onClick={handleAddEnding} className="h-7 text-xs gap-1">
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
                    className="h-8 text-xs flex-1"
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
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold">Giới hạn số từ (Word limit):</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={config.maxWords ?? 2}
                  disabled={examReadonly}
                  onChange={(e) => updateConfig({ maxWords: Number(e.target.value) || 2 })}
                  className="h-7 w-16 font-mono text-xs text-center"
                />
              </div>

              {!isSummaryOptions && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={config.allowNumbers ?? true}
                    disabled={examReadonly}
                    onChange={(e) => updateConfig({ allowNumbers: e.target.checked })}
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
                  <Label className="text-xs font-semibold">Ngân hàng từ khóa (Word Bank / Options Pool)</Label>
                  {!examReadonly && (
                    <Button variant="outline" size="sm" onClick={handleAddOptionsPoolItem} className="h-6 text-xs gap-1">
                      <HugeiconsIcon icon={Add01Icon} size={11} /> Thêm từ
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className="h-7 text-xs flex-1"
                        placeholder="Từ / cụm từ..."
                      />
                      {!examReadonly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionsPoolItem(oIdx)}
                          className="text-muted-foreground hover:text-destructive text-sm"
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
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Đoạn văn tóm tắt / Ghi chú (Template)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Sử dụng <code className="rounded bg-muted px-1 font-mono text-primary font-bold">{"{{q1}}"}</code> hoặc <code className="rounded bg-muted px-1 font-mono text-primary font-bold">[1]</code> cho các chỗ trống.
                  </p>
                </div>
                {!examReadonly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncQuestionsFromTemplate(config.template ?? "")}
                    className="h-7 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <HugeiconsIcon icon={SparklesIcon} size={12} /> Tự động tạo câu hỏi từ Template
                  </Button>
                )}
              </div>
              <Textarea
                value={config.template ?? ""}
                disabled={examReadonly}
                onChange={(e) => updateConfig({ template: e.target.value })}
                rows={4}
                className="resize-y font-mono text-xs leading-relaxed"
                placeholder={"Complete the notes below:\n- Ancient people discovered tea in {{q1}} around 2700 BC.\n- The leaves were initially used for {{q2}} purposes."}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* Labelling (Map & Diagram) */}
        {/* ------------------------------------------------------------------- */}
        {isLabelling && (
          <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Hình ảnh bản đồ / sơ đồ</Label>
              {!examReadonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                  className="h-7 text-xs gap-1.5"
                >
                  <HugeiconsIcon icon={Image01Icon} size={12} /> Chọn ảnh từ thư viện
                </Button>
              )}
            </div>

            {config.imageMediaId && (
              <p className="text-xs text-muted-foreground">
                Đã gắn ảnh (ID: <span className="font-mono">{config.imageMediaId}</span>)
              </p>
            )}

            <div className="space-y-2 border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Danh sách nhãn (Labels)</Label>
                {!examReadonly && (
                  <Button variant="outline" size="sm" onClick={handleAddLabel} className="h-6 text-xs gap-1">
                    <HugeiconsIcon icon={Add01Icon} size={11} /> Thêm nhãn
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((l, lIdx) => (
                  <div key={l.id} className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs">
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
                onChange={(e) => updateConfig({ maxWords: Number(e.target.value) || 3 })}
                className="h-7 w-16 font-mono text-xs text-center"
              />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.allowNumbers ?? true}
                disabled={examReadonly}
                onChange={(e) => updateConfig({ allowNumbers: e.target.checked })}
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
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-primary">
              {group.groupType === "writing_task_1" ? "Writing Task 1 — Tối thiểu 150 từ" : "Writing Task 2 — Tối thiểu 250 từ"}
            </p>
            <p>Nhập đề bài chi tiết vào câu hỏi bên dưới. Hệ thống sẽ tự động tính số từ khi học sinh làm bài.</p>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* QUESTIONS IN GROUP */}
        {/* ------------------------------------------------------------------- */}
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
                className="h-7 gap-1 text-xs text-primary border-primary/30"
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
                  className="rounded-lg border border-border bg-card p-3 space-y-2.5 shadow-2xs hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary mt-0.5">
                      {qNum}
                    </span>

                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Prompt */}
                      <Input
                        value={q.prompt}
                        disabled={examReadonly}
                        onChange={(e) => onUpdateQuestion(q.id, { prompt: e.target.value })}
                        className="h-8 text-xs font-medium"
                        placeholder="Nội dung câu hỏi / nhận định..."
                      />

                      {/* Answer Selectors based on Type */}
                      {isMCSingle && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Chọn đáp án đúng:</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {mcOptions.map((opt) => {
                              const isCorrect = accepted.includes(opt.id)
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={examReadonly}
                                  onClick={() => onUpdateQuestion(q.id, { acceptedAnswers: [opt.id] })}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                                    isCorrect
                                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  <span>{opt.id}</span>
                                  {opt.text && <span className="font-normal truncate max-w-[120px]">({opt.text})</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {isMCMultiple && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Chọn các đáp án đúng (tối đa {config.maxSelections ?? 2}):</Label>
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
                                      ? accepted.filter((a: string) => a !== opt.id)
                                      : [...accepted, opt.id]
                                    onUpdateQuestion(q.id, { acceptedAnswers: nextAnswers })
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                                    isCorrect
                                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  <span>{opt.id}</span>
                                  {opt.text && <span className="font-normal truncate max-w-[120px]">({opt.text})</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {isTFNG && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Chọn đáp án đúng:</Label>
                          <div className="flex gap-2">
                            {["TRUE", "FALSE", "NOT GIVEN"].map((val) => {
                              const isCorrect = accepted.includes(val)
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={examReadonly}
                                  onClick={() => onUpdateQuestion(q.id, { acceptedAnswers: [val] })}
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
                          <Label className="text-[11px] text-muted-foreground">Chọn đáp án đúng:</Label>
                          <div className="flex gap-2">
                            {["YES", "NO", "NOT GIVEN"].map((val) => {
                              const isCorrect = accepted.includes(val)
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={examReadonly}
                                  onClick={() => onUpdateQuestion(q.id, { acceptedAnswers: [val] })}
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
                          <Label className="text-[11px] text-muted-foreground">Chọn Heading đúng từ danh sách:</Label>
                          <select
                            value={accepted[0] ?? ""}
                            disabled={examReadonly}
                            onChange={(e) => onUpdateQuestion(q.id, { acceptedAnswers: e.target.value ? [e.target.value] : [] })}
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
                          <Label className="text-[11px] text-muted-foreground">Chọn đoạn văn chứa thông tin:</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {paragraphLabels.map((p) => {
                              const isCorrect = accepted.includes(p)
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  disabled={examReadonly}
                                  onClick={() => onUpdateQuestion(q.id, { acceptedAnswers: [p] })}
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
                          <Label className="text-[11px] text-muted-foreground">Chọn đối tượng / đặc điểm đúng:</Label>
                          <select
                            value={accepted[0] ?? ""}
                            disabled={examReadonly}
                            onChange={(e) => onUpdateQuestion(q.id, { acceptedAnswers: e.target.value ? [e.target.value] : [] })}
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
                          <Label className="text-[11px] text-muted-foreground">Chọn kết thúc câu đúng:</Label>
                          <select
                            value={accepted[0] ?? ""}
                            disabled={examReadonly}
                            onChange={(e) => onUpdateQuestion(q.id, { acceptedAnswers: e.target.value ? [e.target.value] : [] })}
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
                          <Label className="text-[11px] text-muted-foreground">Chọn từ đúng từ Word Bank:</Label>
                          <select
                            value={accepted[0] ?? ""}
                            disabled={examReadonly}
                            onChange={(e) => onUpdateQuestion(q.id, { acceptedAnswers: e.target.value ? [e.target.value] : [] })}
                            className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                          >
                            <option value="">-- Chọn từ từ Word Bank --</option>
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
                          <Label className="text-[11px] text-muted-foreground">Chọn nhãn vị trí đúng:</Label>
                          <select
                            value={accepted[0] ?? ""}
                            disabled={examReadonly}
                            onChange={(e) => onUpdateQuestion(q.id, { acceptedAnswers: e.target.value ? [e.target.value] : [] })}
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
                            Đáp án đúng (ngăn cách bằng dấu phẩy nếu có nhiều cách viết):
                          </Label>
                          <Input
                            value={accepted.join(", ")}
                            disabled={examReadonly}
                            onChange={(e) => {
                              const ans = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                              onUpdateQuestion(q.id, { acceptedAnswers: ans })
                            }}
                            className="h-8 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-medium"
                            placeholder="VD: China, Republic of China"
                          />
                        </div>
                      )}

                      {/* Explanation */}
                      <Input
                        value={q.explanation ?? ""}
                        disabled={examReadonly}
                        onChange={(e) => onUpdateQuestion(q.id, { explanation: e.target.value })}
                        className="h-7 text-[11px] text-muted-foreground"
                        placeholder="Giải thích đáp án (tùy chọn)..."
                      />
                    </div>

                    {!examReadonly && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive mt-1"
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
      </div>

      {/* Media Picker Dialog */}
      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        type="image"
        onSelect={(item) => {
          updateConfig({ imageMediaId: item.id })
          setMediaPickerOpen(false)
          toast.success("Đã chọn ảnh sơ đồ.")
        }}
      />
    </div>
  )
}
