"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
  Tick02Icon,
  SparklesIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import type { MediaAsset, Question, QuestionType, SkillType } from "@/lib/api/types"
import { QUESTION_TYPE_LABEL, QUESTION_TYPES } from "@/lib/format"
import { MediaPicker } from "@/components/shared/media-picker"
import { toast } from "sonner"

export interface QuestionFormProps {
  initial?: Question | null
  lockedSkill?: SkillType
  lockedPart?: number
  onSave: (question: Question) => void
  onSaveAndContinue?: (question: Question) => void
  onBatchSave?: (questions: Question[]) => void
  submitLabel?: string
  formId?: string
}

interface Option {
  id: string
  text: string
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

function defaultOptions(type: QuestionType): Option[] {
  if (type === "true_false_not_given") {
    return [
      { id: "TRUE", text: "True" },
      { id: "FALSE", text: "False" },
      { id: "NOT GIVEN", text: "Not Given" },
    ]
  }
  if (type === "yes_no_not_given") {
    return [
      { id: "YES", text: "Yes" },
      { id: "NO", text: "No" },
      { id: "NOT GIVEN", text: "Not Given" },
    ]
  }
  return [
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
  ]
}

const OPTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false_not_given",
  "yes_no_not_given",
  "matching",
  "map_labelling",
  "diagram_labelling",
]

const COMPLETION_TYPES: QuestionType[] = [
  "form_completion",
  "note_completion",
  "table_completion",
  "sentence_completion",
  "summary_completion",
]

export function QuestionForm({
  initial,
  lockedSkill,
  lockedPart,
  onSave,
  onSaveAndContinue,
  onBatchSave,
  submitLabel = "Lưu câu hỏi",
  formId,
}: QuestionFormProps) {
  const [activeTab, setActiveTab] = React.useState<"single" | "batch">("single")

  // --- Single Question Form States ---
  const [skill, setSkill] = React.useState<SkillType>(initial?.skill ?? lockedSkill ?? "listening")
  const [part, setPart] = React.useState<number>(initial?.part ?? lockedPart ?? 1)
  const [type, setType] = React.useState<QuestionType>(initial?.type ?? "multiple_choice")
  const [prompt, setPrompt] = React.useState(initial?.prompt ?? "")
  const [content, setContent] = React.useState(initial?.content ?? "")
  const [points, setPoints] = React.useState(String(initial?.points ?? 1))
  const [explanation, setExplanation] = React.useState(initial?.explanation ?? "")
  const [wordLimit] = React.useState(
    (initial?.data?.wordLimit as string) ?? "ONE WORD AND/OR A NUMBER"
  )
  const [templateText] = React.useState(
    (initial?.data?.templateText as string) ?? ""
  )
  const [minWords, setMinWords] = React.useState(
    String((initial?.data?.minWords as number) ?? (lockedPart === 2 ? 250 : 150))
  )
  const [options, setOptions] = React.useState<Option[]>(
    (initial?.data?.options as Option[]) ??
      (initial?.data?.headings as Option[]) ??
      defaultOptions(initial?.type ?? "multiple_choice")
  )
  const [accepted, setAccepted] = React.useState<string[]>(initial?.acceptedAnswers ?? [])
  const [answerDraft, setAnswerDraft] = React.useState("")
  const [media, setMedia] = React.useState<MediaAsset[]>([])
  const [pickerOpen, setPickerOpen] = React.useState(false)

  // --- Batch Completion Mode States ---
  const [batchText, setBatchText] = React.useState("")
  const [batchAnswers, setBatchAnswers] = React.useState<Record<string, string>>({})
  const [batchWordLimit, setBatchWordLimit] = React.useState("ONE WORD AND/OR A NUMBER")

  const isOptionType = OPTION_TYPES.includes(type)
  const isHeadingType = type === "matching_headings"
  const isCompletion = COMPLETION_TYPES.includes(type)
  const isWriting = type === "writing_task_1" || type === "writing_task_2"

  const handleTypeChange = (value: QuestionType) => {
    setType(value)
    if (OPTION_TYPES.includes(value)) setOptions(defaultOptions(value))
    if (value === "matching_headings") {
      setOptions([
        { id: "i", text: "" },
        { id: "ii", text: "" },
        { id: "iii", text: "" },
      ])
    }
    if (value === "writing_task_2") setMinWords("250")
    if (value === "writing_task_1") setMinWords("150")
  }

  const updateOption = (index: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)))
  }

  const addOption = () => {
    setOptions((prev) => {
      if (isHeadingType) {
        const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
        return [...prev, { id: roman[prev.length] ?? String(prev.length + 1), text: "" }]
      }
      return [...prev, { id: LETTERS[prev.length] ?? String(prev.length + 1), text: "" }]
    })
  }

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const addAcceptedAnswer = () => {
    const val = answerDraft.trim()
    if (!val) return
    if (!accepted.includes(val)) {
      setAccepted((prev) => [...prev, val])
    }
    setAnswerDraft("")
  }

  const buildQuestionData = (): Question => {
    const data: Record<string, unknown> = {}
    if (isOptionType) data.options = options
    if (isHeadingType) data.headings = options
    if (isCompletion) {
      data.wordLimit = wordLimit
      if (templateText) data.templateText = templateText
    }
    if (isWriting) data.minWords = Number(minWords) || 150

    return {
      id: initial?.id ?? `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      skill,
      part,
      type,
      prompt: prompt.trim(),
      content: content.trim() || undefined,
      points: Number(points) || 1,
      explanation: explanation.trim() || undefined,
      acceptedAnswers: accepted,
      data: Object.keys(data).length ? data : undefined,
      mediaIds: media.map((m) => m.id),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập nội dung hoặc câu hỏi")
      return
    }
    const q = buildQuestionData()
    onSave(q)
  }

  const handleSaveAndContinue = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập nội dung hoặc câu hỏi")
      return
    }
    const q = buildQuestionData()
    if (onSaveAndContinue) {
      onSaveAndContinue(q)
    } else {
      onSave(q)
    }

    // Reset fields for the next question while retaining skill and part
    setPrompt("")
    setContent("")
    setExplanation("")
    setAccepted([])
    setAnswerDraft("")
    if (isOptionType) {
      setOptions(defaultOptions(type))
    }
    toast.success("Đã thêm câu hỏi. Tiếp tục nhập câu kế tiếp!")
  }

  // --- Batch Completion Parser Logic ---
  // Detect all [1], [2], [3] placeholders in batch text
  const detectedPlaceholders = React.useMemo(() => {
    const matches = Array.from(batchText.matchAll(/\[(\d+)\]/g))
    const ids: string[] = []
    matches.forEach((m) => {
      if (m[1] && !ids.includes(m[1])) {
        ids.push(m[1])
      }
    })
    return ids.sort((a, b) => Number(a) - Number(b))
  }, [batchText])

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (detectedPlaceholders.length === 0) {
      toast.error("Không tìm thấy vị trí điền từ [1], [2]... nào trong văn bản!")
      return
    }

    const createdList: Question[] = detectedPlaceholders.map((numStr) => {
      const ansString = batchAnswers[numStr] || ""
      const acceptedList = ansString
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean)

      return {
        id: `q-batch-${Date.now()}-${numStr}-${Math.random().toString(36).slice(2, 5)}`,
        skill,
        part,
        type: "note_completion",
        prompt: `Điền vào vị trí [${numStr}]`,
        content: batchText.trim(),
        points: 1,
        acceptedAnswers: acceptedList.length > 0 ? acceptedList : [`Đáp án ${numStr}`],
        data: {
          wordLimit: batchWordLimit,
          slotNumber: numStr,
        },
        createdAt: new Date().toISOString(),
      }
    })

    if (onBatchSave) {
      onBatchSave(createdList)
    } else {
      createdList.forEach((q) => onSave(q))
    }
    toast.success(`Đã tự động tạo ${createdList.length} câu hỏi điền từ thành công!`)
  }

  return (
    <div className="space-y-4">
      {/* Tabs: Soạn đơn lẻ hoặc Soạn cả cụm điền từ */}
      {!initial && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1">
            <TabsTrigger value="single" className="text-xs font-medium">
              Soạn từng câu
            </TabsTrigger>
            <TabsTrigger value="batch" className="text-xs font-medium gap-1.5">
              <HugeiconsIcon icon={SparklesIcon} size={13} className="text-primary" />
              <span>Soạn cụm điền từ [1], [2]...</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {activeTab === "batch" && !initial ? (
        <form onSubmit={handleBatchSubmit} className="space-y-4 pt-2">
          {/* Skill & Part Selection for Batch */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kỹ năng</Label>
              <Select
                value={skill}
                onValueChange={(v) => setSkill(v as SkillType)}
                disabled={Boolean(lockedSkill)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="listening">Listening</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {skill === "reading" ? "Passage" : "Part"}
              </Label>
              <Select
                value={String(part)}
                onValueChange={(v) => setPart(Number(v))}
                disabled={Boolean(lockedPart)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{skill === "reading" ? "Passage 1" : "Part 1"}</SelectItem>
                  <SelectItem value="2">{skill === "reading" ? "Passage 2" : "Part 2"}</SelectItem>
                  <SelectItem value="3">{skill === "reading" ? "Passage 3" : "Part 3"}</SelectItem>
                  {skill === "listening" && <SelectItem value="4">Part 4</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <HugeiconsIcon icon={SparklesIcon} size={14} />
              Soạn cụm câu hỏi điền từ tự động
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Dán đoạn văn có các nhãn <code className="font-mono font-bold text-foreground bg-muted/60 px-1 py-0.5 rounded">[1]</code>, <code className="font-mono font-bold text-foreground bg-muted/60 px-1 py-0.5 rounded">[2]</code>. Hệ thống sẽ tự bóc tách và sinh câu hỏi tương ứng.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Giới hạn số từ</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBatchWordLimit("ONE WORD ONLY")}
                  className="text-[10px] text-muted-foreground hover:text-primary hover:underline"
                >
                  1 từ duy nhất
                </button>
                <button
                  type="button"
                  onClick={() => setBatchWordLimit("NO MORE THAN TWO WORDS")}
                  className="text-[10px] text-muted-foreground hover:text-primary hover:underline"
                >
                  Tối đa 2 từ
                </button>
              </div>
            </div>
            <Input
              value={batchWordLimit}
              onChange={(e) => setBatchWordLimit(e.target.value)}
              placeholder="VD: NO MORE THAN TWO WORDS"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Đoạn văn / Ghi chú chứa nhãn [1], [2]...</Label>
              {!batchText && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchText("Name of applicant: Sarah [1]\nDestination: [2] City\nTravel date: [3] September")
                  }}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Dán mẫu thử
                </button>
              )}
            </div>
            <Textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={"Dán nội dung vào đây...\nVí dụ:\nApplicant name: [1]\nDestination city: [2]\nTravel date: [3]"}
              rows={5}
              className="font-mono text-xs leading-relaxed resize-y"
              required
            />
          </div>

          {detectedPlaceholders.length > 0 ? (
            <div className="rounded-xl border border-border p-3.5 space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Đáp án chuẩn ({detectedPlaceholders.length} vị trí tìm thấy):
                </Label>
                <span className="text-[10px] text-muted-foreground">Phân tách nhiều đáp án bằng /</span>
              </div>
              <div className="space-y-2">
                {detectedPlaceholders.map((numStr) => (
                  <div key={numStr} className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold">
                      [{numStr}]
                    </span>
                    <Input
                      value={batchAnswers[numStr] || ""}
                      onChange={(e) =>
                        setBatchAnswers((prev) => ({ ...prev, [numStr]: e.target.value }))
                      }
                      placeholder={`Đáp án đúng cho [${numStr}] (vd: London / city of London)`}
                      className="h-8 text-xs font-mono flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : batchText.trim() ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
              ⚠️ Chưa tìm thấy nhãn [1], [2]... nào trong văn bản. Hãy chèn [1], [2] vào các vị trí cần điền.
            </p>
          ) : null}

          <div className="sticky bottom-0 bg-popover/95 backdrop-blur-sm border-t border-border -mx-6 -mb-6 px-6 py-3 flex justify-end gap-2 mt-4 z-10">
            <Button
              type="submit"
              variant="default"
              disabled={detectedPlaceholders.length === 0}
              className="gap-1.5 font-semibold text-xs h-9"
            >
              <HugeiconsIcon icon={SparklesIcon} size={15} />
              {detectedPlaceholders.length > 0
                ? `Tạo ${detectedPlaceholders.length} câu hỏi điền từ (${skill === "reading" ? `Passage ${part}` : `Part ${part}`})`
                : "Chèn [1], [2]... vào văn bản để tạo"}
            </Button>
          </div>
        </form>
      ) : (
        /* Single Question Form */
        <form onSubmit={handleSubmit} id={formId} className="space-y-4 pt-1">
          {/* Skill & Part */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Kỹ năng</Label>
              <Select
                value={skill}
                onValueChange={(v) => setSkill(v as SkillType)}
                disabled={Boolean(lockedSkill)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="listening">Listening</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="writing">Writing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Part / Task</Label>
              <Select
                value={String(part)}
                onValueChange={(v) => setPart(Number(v))}
                disabled={Boolean(lockedPart)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Part / Task 1</SelectItem>
                  <SelectItem value="2">Part / Task 2</SelectItem>
                  <SelectItem value="3">Part 3</SelectItem>
                  <SelectItem value="4">Part 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Loại câu hỏi</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {QUESTION_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nội dung câu hỏi / Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="VD: What time does the flight depart?"
              rows={2}
              className="resize-none text-xs"
              required
            />
          </div>

          {/* Options */}
          {isOptionType && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Các lựa chọn</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Bấm vào ký tự A, B, C... để đánh dấu đáp án đúng
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs">
                  <HugeiconsIcon icon={Add01Icon} size={13} /> Thêm lựa chọn
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const isCorrect = accepted.includes(opt.id)
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-1.5 transition-colors",
                        isCorrect
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isCorrect) {
                            setAccepted((prev) => prev.filter((x) => x !== opt.id))
                          } else {
                            setAccepted([opt.id])
                          }
                        }}
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
                          isCorrect
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                        title={isCorrect ? "Đang là đáp án đúng (bấm để bỏ chọn)" : "Bấm để chọn làm đáp án đúng"}
                      >
                        {isCorrect ? (
                          <HugeiconsIcon icon={Tick02Icon} size={14} />
                        ) : (
                          opt.id
                        )}
                      </button>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Nội dung lựa chọn ${opt.id}...`}
                        className="h-8 text-xs flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none px-1"
                      />
                      {isCorrect && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-medium shrink-0">
                          Đáp án đúng
                        </Badge>
                      )}
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted/50 transition-colors"
                          title="Xóa lựa chọn này"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Accepted Answers */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Đáp án đúng / Chấp nhận</Label>
            {isOptionType ? (
              <div className="space-y-2">
                {/* Select Dropdown */}
                <Select
                  value={accepted[0] ?? ""}
                  onValueChange={(val) => setAccepted([val])}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Chọn đáp án đúng (A, B, C, D...)" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        Lựa chọn {opt.id} {opt.text ? `(${opt.text})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quick Toggle Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Hoặc chọn nhanh:</span>
                  {options.map((opt) => {
                    const isSelected = accepted.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAccepted((prev) => prev.filter((x) => x !== opt.id))
                          } else {
                            setAccepted([opt.id])
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all border cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-foreground border-border hover:bg-muted"
                        )}
                      >
                        {opt.id}
                        {isSelected && <HugeiconsIcon icon={Tick02Icon} size={12} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* For text/completion questions */
              <>
                <div className="flex gap-2">
                  <Input
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addAcceptedAnswer()
                      }
                    }}
                    placeholder="Nhập đáp án và bấm Thêm..."
                    className="h-8 text-xs flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addAcceptedAnswer} className="h-8 text-xs">
                    Thêm
                  </Button>
                </div>
                {accepted.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {accepted.map((a) => (
                      <Badge key={a} variant="secondary" className="gap-1 font-mono text-xs">
                        {a}
                        <button type="button" onClick={() => setAccepted((prev) => prev.filter((x) => x !== a))}>
                          <HugeiconsIcon icon={Cancel01Icon} size={11} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Points & Explanation */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Điểm</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Giải thích đáp án (tuỳ chọn)</Label>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Giải thích lý do đáp án đúng..."
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          {/* Buttons: Lưu câu hỏi VÀ Lưu & tạo câu tiếp */}
          <div className="sticky bottom-0 bg-popover/95 backdrop-blur-sm border-t border-border -mx-6 -mb-6 px-6 py-3 flex items-center justify-end gap-2.5 mt-4 z-10">
            {onSaveAndContinue && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAndContinue}
                className="gap-1.5 text-xs font-medium h-9"
              >
                <span>Lưu & tạo câu tiếp</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            )}

            <Button type="submit" variant="default" size="sm" className="gap-1.5 font-semibold text-xs h-9">
              <HugeiconsIcon icon={Tick02Icon} size={15} />
              <span>{submitLabel}</span>
            </Button>
          </div>
        </form>
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        type={skill === "listening" ? "audio" : "all"}
        onSelect={(asset) => setMedia((prev) => (prev.some((m) => m.id === asset.id) ? prev : [...prev, asset]))}
      />
    </div>
  )
}
