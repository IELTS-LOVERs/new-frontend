"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, RefreshIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClientId } from "@/lib/utils"
import {
  QUESTION_GROUP_TYPE_LABEL,
  SKILL_LABEL,
  defaultGroupConfig,
  defaultGroupInstructions,
} from "@/lib/format"
import { QuestionGroupEditor } from "./question-group-editor"
import { QuestionTypePickerDialog } from "./question-type-picker-dialog"
import { RichTextFormatBar } from "@/features/exam-engine/components/rich-text-format-bar"
import type {
  BankQuestionGroup,
  CandidateSection,
  QuestionGroupConfig,
  QuestionGroupType,
  QuestionItem,
  RichDoc,
  SkillType,
} from "@/lib/api/types"
import type { CreateBankGroupPayload } from "@/lib/api/questions"

/** Internal shape required by QuestionGroupEditor (adds questionNumber). */
interface EditorGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  instructionsDoc?: RichDoc | null
  config: QuestionGroupConfig
  questions: QuestionItem[]
}

export interface BankGroupFormProps {
  initial?: BankQuestionGroup | null
  lockedSkill?: SkillType
  lockedPart?: number
  submitLabel?: string
  onSave: (payload: CreateBankGroupPayload) => void
}

function toEditorGroup(group: BankQuestionGroup): EditorGroup {
  return {
    id: group.id,
    groupType: group.groupType,
    instructions: group.instructions ?? "",
    instructionsDoc: group.instructionsDoc ?? null,
    config: (group.config ?? {}) as QuestionGroupConfig,
    questions: (group.questions ?? []).map((q, index) => ({
      id: q.id,
      questionNumber: index + 1,
      prompt: q.prompt ?? "",
      promptDoc: q.promptDoc ?? null,
      acceptedAnswers: q.acceptedAnswers ?? [],
      points: q.points ?? 1,
      explanation: q.explanation ?? undefined,
      mediaIds: q.mediaIds ?? [],
    })),
  }
}

function emptyGroup(groupType: QuestionGroupType): EditorGroup {
  return {
    id: createClientId("bank"),
    groupType,
    instructions: defaultGroupInstructions(groupType),
    config: defaultGroupConfig(groupType) as QuestionGroupConfig,
    questions: [],
  }
}

export function BankGroupForm({
  initial,
  lockedSkill,
  lockedPart,
  submitLabel = "Lưu vào ngân hàng",
  onSave,
}: BankGroupFormProps) {
  const [skill, setSkill] = React.useState<SkillType>(
    initial?.skill ?? lockedSkill ?? "reading"
  )
  const [part, setPart] = React.useState<number>(initial?.part ?? lockedPart ?? 1)
  const [group, setGroup] = React.useState<EditorGroup | null>(() =>
    initial ? toEditorGroup(initial) : null
  )
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const formRef = React.useRef<HTMLDivElement | null>(null)

  const numbering = React.useMemo(() => {
    const map = new Map<string, number>()
    ;(group?.questions ?? []).forEach((q, index) => map.set(q.id, index + 1))
    return map
  }, [group])

  const selectGroupType = (groupType: QuestionGroupType) => {
    setGroup(emptyGroup(groupType))
    setPickerOpen(false)
  }

  const handleSubmit = () => {
    if (!group) {
      toast.error("Hãy chọn dạng câu hỏi cho nhóm.")
      return
    }
    if (group.questions.length === 0) {
      toast.error("Nhóm câu hỏi phải có ít nhất 1 câu.")
      return
    }
    onSave({
      skill,
      part,
      groupType: group.groupType,
      instructions: group.instructions ?? "",
      instructionsDoc: group.instructionsDoc ?? undefined,
      config: group.config ?? {},
      questions: group.questions.map((q) => ({
        prompt: q.prompt ?? "",
        promptDoc: q.promptDoc ?? undefined,
        acceptedAnswers: q.acceptedAnswers ?? [],
        points: q.points ?? 1,
        explanation: q.explanation ?? undefined,
        mediaIds: q.mediaIds ?? [],
      })),
    })
  }

  const pickerSection = {
    skill,
    part,
    title: SKILL_LABEL[skill],
    questions: [],
  } as CandidateSection

  return (
    <div ref={formRef} className="space-y-4">
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
              {skill === "listening" && <SelectItem value="4">Part 4</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Group type */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Dạng câu hỏi (Question Group)</Label>
          {group && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px] text-muted-foreground"
              onClick={() => setPickerOpen(true)}
            >
              <HugeiconsIcon icon={RefreshIcon} size={12} /> Đổi dạng
            </Button>
          )}
        </div>
        {group ? (
          <Badge variant="secondary" className="font-medium">
            {QUESTION_GROUP_TYPE_LABEL[group.groupType] || group.groupType}
          </Badge>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-1.5 border-dashed text-xs"
            onClick={() => setPickerOpen(true)}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} /> Chọn dạng câu hỏi
          </Button>
        )}
      </div>

      {/* Editor */}
      {group && (
        <>
          <div className="flex justify-end">
            <RichTextFormatBar containerRef={formRef} />
          </div>
          <QuestionGroupEditor
          group={group}
          examReadonly={false}
          numbering={numbering}
          onUpdateGroup={(patch) => setGroup((prev) => (prev ? { ...prev, ...patch } : prev))}
          onRemoveGroup={() => setGroup(null)}
          onAddQuestion={() =>
            setGroup((prev) =>
              prev
                ? {
                    ...prev,
                    questions: [
                      ...prev.questions,
                      {
                        id: createClientId("bank-q"),
                        questionNumber: prev.questions.length + 1,
                        prompt: "",
                        points: 1,
                        acceptedAnswers: [],
                      },
                    ],
                  }
                : prev
            )
          }
          onRemoveQuestion={(qId) =>
            setGroup((prev) =>
              prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== qId) } : prev
            )
          }
          onUpdateQuestion={(qId, patch) =>
            setGroup((prev) =>
              prev
                ? {
                    ...prev,
                    questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
                  }
                : prev
            )
          }
        />
        </>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 z-10 mt-4 flex justify-end gap-2 border-t border-border bg-popover/95 px-6 py-3 -mx-6 -mb-6 backdrop-blur-sm">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          disabled={!group || group.questions.length === 0}
          onClick={handleSubmit}
        >
          <HugeiconsIcon icon={Tick02Icon} size={15} />
          {submitLabel}
        </Button>
      </div>

      <QuestionTypePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeSection={pickerSection}
        onSelectType={selectGroupType}
      />
    </div>
  )
}
