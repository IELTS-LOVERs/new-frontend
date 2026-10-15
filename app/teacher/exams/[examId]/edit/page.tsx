"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Alert02Icon,
  ArrowLeft01Icon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  EyeIcon,
  HeadphonesIcon,
  MusicNote01Icon,
  PenTool01Icon,
  RefreshIcon,
  Search01Icon,
  SparklesIcon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { cn, createClientId } from "@/lib/utils"
import { toast } from "sonner"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import {
  useTeacherExamDetailQuery,
  useUpdateExamMutation,
  useUpdateExamMetadataMutation,
  usePublishExamMutation,
  useUnpublishExamMutation,
  useCloneExamMutation,
} from "@/hooks/use-exams"
import { useQuestionsQuery, useCreateQuestionMutation } from "@/hooks/use-questions"
import { type CreateBankGroupPayload } from "@/lib/api/questions"
import {
  type CreateExamSectionPayload,
  type QuestionItemPayload,
} from "@/lib/api/exams"
import {
  QUESTION_GROUP_TYPE_LABEL,
  SKILL_LABEL,
  defaultGroupInstructions,
  defaultGroupConfig,
} from "@/lib/format"
import type {
  BankQuestionGroup,
  CandidateExam,
  CandidateQuestionGroup,
  CandidateSection,
  MediaItem,
  QuestionGroupType,
  QuestionItem,
  SkillType,
} from "@/lib/api/types"
import { DEMO_BANK_GROUPS, DEMO_EXAM_BUILDER, DEMO_EXAM_MOCK_01, DEMO_EXAMS } from "@/mocks/demo-data"
import { QuestionGroupEditor } from "@/features/questions/question-group-editor"
import { QuestionTypePickerDialog } from "@/features/questions/question-type-picker-dialog"
import { MediaPicker } from "@/components/shared/media-picker"
import { AssignDialog } from "@/components/shared/assign-dialog"

const SKILL_ICON: Record<SkillType, React.ComponentProps<typeof HugeiconsIcon>["icon"]> = {
  listening: HeadphonesIcon,
  reading: Book02Icon,
  writing: PenTool01Icon,
}

const SKILL_ORDER: SkillType[] = ["listening", "reading", "writing"]

/** IELTS structural limits per skill (matches the backend `part` 1..4 Zod cap). */
const MAX_PARTS: Record<SkillType, number> = {
  listening: 4,
  reading: 3,
  writing: 2,
}

/** Canonical titles generated for a freshly added section. Used to distinguish
 *  auto-generated titles from ones the teacher renamed by hand so that
 *  renumbering only rewrites the former. */
const DEFAULT_SECTION_TITLE: Record<SkillType, RegExp> = {
  listening: /^Listening\s+Part\s+\d+$/i,
  reading: /^Reading\s+Passage\s+\d+$/i,
  writing: /^Writing\s+Task\s+\d+$/i,
}

function defaultSectionTitle(skill: SkillType, part: number): string {
  if (skill === "listening") return `Listening Part ${part}`
  if (skill === "reading") return `Reading Passage ${part}`
  return `Writing Task ${part}`
}

function isDefaultSectionTitle(skill: SkillType, title: string): boolean {
  return DEFAULT_SECTION_TITLE[skill].test(title.trim())
}

/** Deep clone a JSON-serialisable value (question group config etc.). */
function deepCloneValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value)
    } catch {
      /* fall back to JSON round-trip below */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

/** Total number of questions inside a section. */
function countSectionQuestions(section: CandidateSection): number {
  return (section.questionGroups ?? []).reduce((acc, g) => acc + g.questions.length, 0)
}

/**
 * Ensure parts are numbered `1..n` within each skill (in array order). Sections
 * whose title is still the auto-generated default are renamed to match the new
 * part number; custom titles are preserved.
 */
function renormalizeSections(sections: CandidateSection[]): CandidateSection[] {
  const counters: Record<SkillType, number> = { listening: 0, reading: 0, writing: 0 }
  return sections.map((section) => {
    counters[section.skill] += 1
    const part = counters[section.skill]
    const title = isDefaultSectionTitle(section.skill, section.title)
      ? defaultSectionTitle(section.skill, part)
      : section.title
    if (section.part === part && section.title === title) return section
    return { ...section, part, title }
  })
}

/**
 * Renumber every question continuously per skill, starting at 1 and flowing
 * across groups and parts (Listening Part 1: Q1–Q10 → Part 2: Q11–Q20…).
 */
function renumberAllQuestions(sections: CandidateSection[]): CandidateSection[] {
  const counters: Record<SkillType, number> = { listening: 0, reading: 0, writing: 0 }
  return sections.map((section) => {
    let changed = false
    const questionGroups = (section.questionGroups ?? []).map((group) => {
      let groupChanged = false
      const questions = group.questions.map((question) => {
        counters[section.skill] += 1
        const questionNumber = counters[section.skill]
        if (question.questionNumber === questionNumber) return question
        groupChanged = true
        return { ...question, questionNumber }
      })
      if (!groupChanged) return group
      changed = true
      return { ...group, questions }
    })
    return changed ? { ...section, questionGroups } : section
  })
}

/** Structural normalisation applied whenever parts are added / removed / moved. */
function renumberEverything(sections: CandidateSection[]): CandidateSection[] {
  return renumberAllQuestions(renormalizeSections(sections))
}

/**
 * Deep copy a section, minting fresh client ids for the section, its question
 * groups and its questions so the backend treats them as brand-new entities.
 */
function cloneSection(section: CandidateSection): CandidateSection {
  return {
    ...section,
    id: undefined,
    mediaIds: section.mediaIds ? [...section.mediaIds] : undefined,
    media: (section.media ?? []).map((m) => ({ ...m })),
    questionGroups: (section.questionGroups ?? []).map((group) => ({
      ...group,
      id: createClientId("dup-group"),
      config: deepCloneValue(group.config),
      questions: group.questions.map((question) => ({
        ...question,
        id: createClientId("dup-q"),
      })),
    })),
  }
}

/**
 * Client-side pre-flight for autosave: skip the network call while the exam is
 * clearly invalid (e.g. the teacher is mid-typing a short title or cleared the
 * duration field), avoiding a flood of 400 VALIDATION_ERROR responses.
 * Mirrors `CreateExamSchema` in the backend.
 */
function firstDraftValidationIssue(exam: CandidateExam): string | null {
  if (exam.title.trim().length < 3) return "Tiêu đề cần tối thiểu 3 ký tự."
  if (exam.durationMinutes < 10 || exam.durationMinutes > 180) {
    return "Thời lượng phải trong khoảng 10–180 phút."
  }
  return null
}

function mockExamFor(examId: string): CandidateExam {
  if (examId === "exam-writing-02") return DEMO_EXAM_BUILDER
  if (examId === "exam-mock-01") return DEMO_EXAM_MOCK_01
  const base = DEMO_EXAM_MOCK_01
  return { ...base, id: examId, title: "Đề thi mới", sections: [] }
}

interface Issue {
  level: "error" | "warning"
  message: string
  sectionIndex?: number
}

// Convert API TeacherExamDetail -> local CandidateExam (builder source of truth)
function toLocalExam(detail: {
  id: string
  title: string
  description?: string | null
  durationMinutes: number
  openAt?: string | null
  closeAt?: string | null
  sections: Array<{
    id?: string
    skill: SkillType
    part: number
    title: string
    instructions?: string | null
    passageText?: string | null
    transcript?: string | null
    mediaIds?: string[]
    media?: MediaItem[]
    questionGroups?: Array<{
      id: string
      groupType: QuestionGroupType
      instructions: string
      config: Record<string, unknown>
      media?: MediaItem[]
      questions: Array<{
        id: string
        questionNumber: number
        prompt: string
        acceptedAnswers?: string[]
        points?: number
        explanation?: string | null
        mediaIds?: string[]
      }>
    }>
  }>
}): CandidateExam {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description ?? null,
    durationMinutes: detail.durationMinutes,
    sections: detail.sections
      // Defensive: ignore any legacy sections whose skill is no longer supported.
      .filter((s) => s.skill === "listening" || s.skill === "reading" || s.skill === "writing")
      .map((s) => {
      const questionGroups: CandidateQuestionGroup[] = (s.questionGroups ?? []).map((g) => ({
        id: g.id,
        groupType: g.groupType,
        instructions: g.instructions,
        config: g.config as any,
        media: g.media ?? [],
        questions: g.questions.map((q) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          prompt: q.prompt,
          points: q.points,
          acceptedAnswers: (q as any).acceptedAnswers ?? [],
          explanation: (q as any).explanation ?? undefined,
          mediaIds: q.mediaIds,
        })),
      }))
      return {
        id: s.id,
        skill: s.skill,
        part: s.part,
        title: s.title,
        instructions: s.instructions ?? "",
        passageText: s.passageText ?? "",
        transcript: s.transcript ?? "",
        mediaIds: s.mediaIds ?? [],
        media: s.media ?? [],
        questionGroups,
      } as CandidateSection
    }),
  }
}

const isValidObjectId = (id?: string | null) => Boolean(id && /^[0-9a-fA-F]{24}$/.test(id))

/** Convert a datetime-local value into an ISO string, or undefined when invalid/empty. */
function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

// Convert local CandidateExam -> PUT payload
function toUpdatePayload(exam: CandidateExam, openAt: string, closeAt: string) {
  const sections: CreateExamSectionPayload[] = exam.sections.map((s) => ({
    _id: isValidObjectId(s.id) ? s.id : undefined,
    skill: s.skill,
    part: s.part,
    title: s.title,
    instructions: s.instructions ?? "",
    passageText: s.skill === "reading" ? (s.passageText ?? "") : undefined,
    transcript: s.skill === "listening" ? (s.transcript ?? "") : undefined,
    // Prefer media picked in this session; otherwise fall back to the persisted
    // mediaIds. The teacher detail endpoint does not hydrate `media` objects,
    // so without this fallback every autosave would wipe section audio/images.
    mediaIds:
      (s.media ?? []).length > 0 ? (s.media ?? []).map((m) => m.id) : (s.mediaIds ?? []),
    questionGroups: (s.questionGroups ?? []).map((g) => ({
      _id: isValidObjectId(g.id) ? g.id : undefined,
      groupType: g.groupType,
      instructions: g.instructions ?? "",
      config: g.config ?? {},
      questions: g.questions.map(
        (q) =>
          ({
            _id: isValidObjectId(q.id) ? q.id : undefined,
            questionNumber: q.questionNumber,
            prompt: q.prompt ?? "",
            acceptedAnswers: (q as any).acceptedAnswers ?? [],
            points: q.points ?? 1,
            explanation: (q as any).explanation ?? undefined,
            mediaIds: q.mediaIds,
          }) as QuestionItemPayload
      ),
    })),
  }))
  return {
    title: exam.title,
    description: exam.description ?? undefined,
    durationMinutes: exam.durationMinutes,
    sections,
    openAt: toIsoOrUndefined(openAt),
    closeAt: toIsoOrUndefined(closeAt),
  }
}

function toLocalInputValue(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ExamBuilderPage() {
  const params = useParams<{ examId: string }>()
  const examId = params.examId

  const examQuery = useTeacherExamDetailQuery(examId, !USE_MOCKS)
  const updateMutation = useUpdateExamMutation(examId)
  const updateMetadataMutation = useUpdateExamMetadataMutation(examId)
  const publishMutation = usePublishExamMutation(examId)
  const unpublishMutation = useUnpublishExamMutation(examId)
  const cloneMutation = useCloneExamMutation()
  const createQuestionMutation = useCreateQuestionMutation()

  // ----- Mock source -----
  const mockSource = DEMO_EXAMS.find((e) => e.id === examId)
  const mockExam = React.useMemo(() => mockExamFor(examId), [examId])
  const mockStatus: "draft" | "published" | "closed" = mockSource?.status ?? "draft"

  // ----- Local builder state (source of truth khi đang soạn) -----
  const [exam, setExam] = React.useState<CandidateExam | null>(null)
  const [status, setStatus] = React.useState<"draft" | "published" | "closed">("draft")
  const [openAt, setOpenAt] = React.useState<string>("")
  const [closeAt, setCloseAt] = React.useState<string>("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "error">("saved")
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)
  const [hasAttemptsError, setHasAttemptsError] = React.useState(false)

  const [bankOpen, setBankOpen] = React.useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false)
  const [imagePickerOpen, setImagePickerOpen] = React.useState(false)
  const [publishConfirmOpen, setPublishConfirmOpen] = React.useState(false)
  const [errorsOpen, setErrorsOpen] = React.useState(false)
  const [successOpen, setSuccessOpen] = React.useState(false)
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [passagePreview, setPassagePreview] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dropTarget, setDropTarget] = React.useState<{
    index: number
    position: "top" | "bottom"
  } | null>(null)
  const [deleteTargetIndex, setDeleteTargetIndex] = React.useState<number | null>(null)
  const [groupTypePickerOpen, setGroupTypePickerOpen] = React.useState(false)

  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Always points at the most recent builder snapshot. `doSave` reads from here
  // instead of closing over `exam`, which otherwise makes the debounced autosave
  // persist data that is one edit behind (the last keystroke is dropped).
  const latestRef = React.useRef({ exam, openAt, closeAt, status })

  // Hydrate local state khi query về (chỉ lần đầu / khi id đổi)
  const hydratedFor = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (USE_MOCKS) {
      if (hydratedFor.current !== examId) {
        hydratedFor.current = examId
        setExam(mockExam)
        setStatus(mockStatus)
        setOpenAt(toLocalInputValue(mockSource?.openAt))
        setCloseAt(toLocalInputValue(mockSource?.closeAt))
      }
      return
    }
    if (examQuery.data && hydratedFor.current !== examId) {
      hydratedFor.current = examId
      setExam(toLocalExam(examQuery.data))
      setStatus(examQuery.data.status)
      setOpenAt(toLocalInputValue(examQuery.data.openAt))
      setCloseAt(toLocalInputValue(examQuery.data.closeAt))
    }
  }, [examQuery.data, examId, mockExam, mockStatus, mockSource])

  // Keep the debounced autosave in sync with the latest state after every render.
  React.useEffect(() => {
    latestRef.current = { exam, openAt, closeAt, status }
  }, [exam, openAt, closeAt, status])

  const reportSaveError = React.useCallback((err: unknown, fallback: string) => {
    const detail = err instanceof ApiError ? err.details : undefined
    const detailMessage =
      Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.message === "string"
        ? detail[0].message
        : null
    toast.error(err instanceof ApiError ? err.message : fallback, {
      description: detailMessage ?? undefined,
    })
  }, [])

  // ----- Autosave (debounce 1.5s) -----
  const doSave = React.useCallback(async () => {
    const snapshot = latestRef.current
    if (!snapshot.exam) return
    if (USE_MOCKS) {
      setSaveStatus("saved")
      setLastSavedAt(new Date())
      return
    }
    if (snapshot.status !== "draft") {
      // Đề đã xuất bản/đóng: chỉ metadata (tên, mô tả, thời gian) được sửa.
      try {
        await updateMetadataMutation.mutateAsync({
          title: snapshot.exam.title,
          description: snapshot.exam.description ?? undefined,
          openAt: toIsoOrUndefined(snapshot.openAt),
          closeAt: toIsoOrUndefined(snapshot.closeAt),
        })
        setSaveStatus("saved")
        setLastSavedAt(new Date())
      } catch (err) {
        setSaveStatus("error")
        reportSaveError(err, "Lưu thông tin đề thất bại.")
      }
      return
    }
    // Tránh gọi API với dữ liệu chắc chắn 400 (đang gõ tiêu đề / xoá thời lượng).
    const draftIssue = firstDraftValidationIssue(snapshot.exam)
    if (draftIssue) {
      setSaveStatus("error")
      return
    }
    const payload = toUpdatePayload(snapshot.exam, snapshot.openAt, snapshot.closeAt)
    try {
      await updateMutation.mutateAsync(payload)
      setSaveStatus("saved")
      setLastSavedAt(new Date())
    } catch (err) {
      setSaveStatus("error")
      reportSaveError(err, "Lưu đề thất bại.")
    }
  }, [updateMutation, updateMetadataMutation, reportSaveError])

  const markDirty = React.useCallback(() => {
    setSaveStatus("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void doSave()
    }, 1500)
  }, [doSave])

  const examReadonly = status !== "draft"
  const active = exam?.sections[activeIndex] as CandidateSection | undefined
  const activeMedia = active?.media ?? []
  const activeAudio = activeMedia.filter((m) => m.type === "audio")
  const activeImages = activeMedia.filter((m) => m.type === "image")

  const updateExam = (patch: Partial<CandidateExam>) => {
    setExam((prev) => (prev ? { ...prev, ...patch } : prev))
    markDirty()
  }

  const updateSection = (index: number, patch: Partial<CandidateSection>) => {
    setExam((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
          }
        : prev
    )
    markDirty()
  }

  /** Replace the whole section list, optionally focusing a section, and queue autosave. */
  const applySections = (sections: CandidateSection[], nextActiveIndex?: number) => {
    setExam((prev) => (prev ? { ...prev, sections } : prev))
    if (nextActiveIndex !== undefined) setActiveIndex(nextActiveIndex)
    markDirty()
  }

  const numbering = React.useMemo(() => {
    const map = new Map<string, number>()
    const counters: Record<string, number> = { listening: 0, reading: 0, writing: 0 }
    exam?.sections.forEach((sec) => {
      for (const group of sec.questionGroups ?? []) {
        for (const q of group.questions) {
          counters[sec.skill] += 1
          map.set(q.id, counters[sec.skill])
        }
      }
    })
    return map
  }, [exam?.sections])

  const issues = React.useMemo<Issue[]>(() => {
    if (!exam) return []
    const list: Issue[] = []
    if (exam.title.trim().length < 3) {
      list.push({ level: "error", message: "Tiêu đề cần tối thiểu 3 ký tự." })
    }
    if (exam.durationMinutes < 10 || exam.durationMinutes > 180) {
      list.push({ level: "error", message: "Thời lượng phải trong khoảng 10–180 phút." })
    }
    exam.sections.forEach((section, index) => {
      const groups = section.questionGroups ?? []
      const totalQs = groups.reduce((acc, g) => acc + g.questions.length, 0)
      if (totalQs === 0) {
        list.push({
          level: "error",
          message: `${SKILL_LABEL[section.skill]} · ${section.title} đang trống (0 câu hỏi).`,
          sectionIndex: index,
        })
      }
      groups.forEach((g) => {
        if (g.questions.length === 0) {
          list.push({
            level: "error",
            message: `${section.title}: Nhóm "${QUESTION_GROUP_TYPE_LABEL[g.groupType] || g.groupType}" không được để trống (0 câu hỏi).`,
            sectionIndex: index,
          })
        }
        if (section.skill !== "writing") {
          g.questions.forEach((q) => {
            const answers = (q as any).acceptedAnswers ?? []
            if (answers.length === 0) {
              list.push({
                level: "error",
                message: `${section.title}: Câu số ${numbering.get(q.id) ?? q.questionNumber} chưa thiết lập đáp án đúng.`,
                sectionIndex: index,
              })
            }
          })
        }
      })
      if (
        section.skill === "listening" &&
        !((section.media ?? []).length > 0 || (section.mediaIds?.length ?? 0) > 0)
      ) {
        list.push({
          level: "warning",
          message: `${section.title} thiếu tệp audio.`,
          sectionIndex: index,
        })
      }
      if (section.skill === "reading" && !section.passageText?.trim()) {
        list.push({
          level: "warning",
          message: `${section.title} thiếu nội dung bài đọc.`,
          sectionIndex: index,
        })
      }
      if (section.skill === "writing") {
        const writingGroups = groups.filter(
          (g) => g.groupType === "writing_task_1" || g.groupType === "writing_task_2"
        )
        if (writingGroups.length !== 1) {
          list.push({
            level: "warning",
            message: `${section.title} cần đúng 1 nhóm writing_task.`,
            sectionIndex: index,
          })
        }
      }
    })
    if (openAt && closeAt && new Date(openAt) >= new Date(closeAt)) {
      list.push({ level: "error", message: "Mở lúc phải trước Đóng lúc." })
    }
    return list
  }, [exam, openAt, closeAt, numbering])

  const errors = issues.filter((i) => i.level === "error")
  const warnings = issues.filter((i) => i.level === "warning")

  /** Insert copies of bank question groups into the active section (renumbered). */
  const addGroupsFromBank = (bankGroups: BankQuestionGroup[]) => {
    if (!active || bankGroups.length === 0) return

    const existingGroups = active.questionGroups ?? []
    let maxNumber = 0
    for (const group of existingGroups) {
      for (const question of group.questions) {
        if (question.questionNumber > maxNumber) maxNumber = question.questionNumber
      }
    }

    const copies = bankGroups.map((bankGroup) => {
      const questions: QuestionItem[] = bankGroup.questions.map((item) => {
        maxNumber += 1
        return {
          id: createClientId("from-bank-q"),
          questionNumber: maxNumber,
          prompt: item.prompt ?? "",
          acceptedAnswers: item.acceptedAnswers ?? [],
          points: item.points ?? 1,
          explanation: item.explanation ?? undefined,
          mediaIds: item.mediaIds ?? [],
        }
      })
      return {
        id: createClientId("from-bank"),
        groupType: bankGroup.groupType,
        instructions: bankGroup.instructions ?? "",
        config: (bankGroup.config ?? {}) as Record<string, unknown>,
        questions,
      } as unknown as CandidateQuestionGroup
    })

    updateSection(activeIndex, { questionGroups: [...existingGroups, ...copies] })
    toast.success(`Đã thêm ${copies.length} nhóm câu hỏi vào ${active.title}`)
    setBankOpen(false)
  }

  const [savingBankId, setSavingBankId] = React.useState<string | null>(null)

  /** Persist a section group into the shared Question Bank. */
  const saveGroupToBank = async (group: CandidateQuestionGroup) => {
    if (!active) return
    if (group.questions.length === 0) {
      toast.error("Nhóm chưa có câu hỏi để lưu.")
      return
    }
    if (USE_MOCKS) {
      toast.success("Đã lưu nhóm vào ngân hàng (demo)")
      return
    }
    setSavingBankId(group.id)
    try {
      const payload: CreateBankGroupPayload = {
        skill: active.skill,
        part: active.part,
        groupType: group.groupType,
        instructions: group.instructions ?? "",
        config: (group.config ?? {}) as Record<string, unknown>,
        questions: group.questions.map((q) => ({
          prompt: q.prompt ?? "",
          acceptedAnswers: (q as QuestionItem).acceptedAnswers ?? [],
          points: q.points ?? 1,
          explanation: (q as QuestionItem).explanation ?? undefined,
          mediaIds: q.mediaIds ?? [],
        })),
      }
      await createQuestionMutation.mutateAsync(payload)
      toast.success(
        `Đã lưu nhóm "${QUESTION_GROUP_TYPE_LABEL[group.groupType] || group.groupType}" vào ngân hàng`
      )
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể lưu nhóm vào ngân hàng.")
    } finally {
      setSavingBankId(null)
    }
  }

  const addSection = (skill: SkillType) => {
    if (!exam) return
    const sameSkill = exam.sections.filter((s) => s.skill === skill)
    if (sameSkill.length >= MAX_PARTS[skill]) {
      toast.error(`${SKILL_LABEL[skill]} chỉ có tối đa ${MAX_PARTS[skill]} phần.`)
      return
    }
    const nextPart = sameSkill.length + 1
    const newSection: CandidateSection = {
      skill,
      part: nextPart,
      title: defaultSectionTitle(skill, nextPart),
      instructions: "",
      passageText: "",
      transcript: "",
      media: [],
      questionGroups: [],
    }
    const nextSections = renumberEverything([...exam.sections, newSection])
    applySections(nextSections, nextSections.length - 1)
  }

  /** Add a new question group to the active section */
  const addQuestionGroup = (groupType: QuestionGroupType) => {
    if (!active || !exam) return
    const groups = active.questionGroups ?? []
    const newGroup: CandidateQuestionGroup = {
      id: createClientId("new"),
      groupType,
      instructions: defaultGroupInstructions(groupType),
      config: defaultGroupConfig(groupType) as any,
      questions: [],
    }
    updateSection(activeIndex, { questionGroups: [...groups, newGroup] })
    setGroupTypePickerOpen(false)
    toast.success(`Đã thêm nhóm "${QUESTION_GROUP_TYPE_LABEL[groupType]}"`)
  }

  /** Remove a question group from the active section */
  const removeQuestionGroup = (groupId: string) => {
    if (!active) return
    const groups = active.questionGroups ?? []
    updateSection(activeIndex, { questionGroups: groups.filter((g) => g.id !== groupId) })
    toast.success("Đã xóa nhóm câu hỏi")
  }

  /** Add a question to a specific group */
  const addQuestionToGroup = (groupId: string) => {
    if (!active) return
    const groups = [...(active.questionGroups ?? [])]
    const groupIndex = groups.findIndex((g) => g.id === groupId)
    if (groupIndex === -1) return
    const group = groups[groupIndex]

    // Calculate next question number (across all groups in section)
    let maxQNum = 0
    for (const g of groups) {
      for (const q of g.questions) {
        if (q.questionNumber > maxQNum) maxQNum = q.questionNumber
      }
    }

    const newQ: QuestionItem = {
      id: createClientId("new-q"),
      questionNumber: maxQNum + 1,
      prompt: "",
      points: 1,
      acceptedAnswers: [],
    }
    groups[groupIndex] = {
      ...group,
      questions: [...group.questions, newQ],
    }
    updateSection(activeIndex, { questionGroups: groups })
  }

  /** Remove a question from a group */
  const removeQuestionFromGroup = (groupId: string, questionId: string) => {
    if (!active) return
    const groups = [...(active.questionGroups ?? [])]
    const groupIndex = groups.findIndex((g) => g.id === groupId)
    if (groupIndex === -1) return
    const group = groups[groupIndex]
    groups[groupIndex] = {
      ...group,
      questions: group.questions.filter((q) => q.id !== questionId),
    }
    updateSection(activeIndex, { questionGroups: groups })
  }

  /** Update a question item within a group */
  const updateQuestionInGroup = (groupId: string, questionId: string, patch: Partial<QuestionItem>) => {
    if (!active) return
    const groups = [...(active.questionGroups ?? [])]
    const groupIndex = groups.findIndex((g) => g.id === groupId)
    if (groupIndex === -1) return
    const group = groups[groupIndex]
    groups[groupIndex] = {
      ...group,
      questions: group.questions.map((q) =>
        q.id === questionId ? { ...q, ...patch } : q
      ),
    }
    updateSection(activeIndex, { questionGroups: groups })
  }

  /** Update a question group's config/instructions */
  const updateQuestionGroup = (groupId: string, patch: Partial<CandidateQuestionGroup>) => {
    if (!active) return
    const groups = [...(active.questionGroups ?? [])]
    const groupIndex = groups.findIndex((g) => g.id === groupId)
    if (groupIndex === -1) return
    groups[groupIndex] = { ...groups[groupIndex], ...patch }
    updateSection(activeIndex, { questionGroups: groups })
  }

  /** Remove a section immediately (already confirmed / empty section). */
  const performRemoveSection = (index: number) => {
    if (!exam) return
    const section = exam.sections[index]
    if (!section) return
    const nextSections = renumberEverything(exam.sections.filter((_, i) => i !== index))
    setExam({ ...exam, sections: nextSections })
    setActiveIndex((prev) =>
      nextSections.length === 0 ? 0 : Math.min(prev > index ? prev - 1 : prev, nextSections.length - 1)
    )
    setDeleteTargetIndex(null)
    markDirty()
    toast.success(`Đã xoá ${section.title} khỏi đề`)
  }

  /** Trash button: confirm only when the section actually holds data. */
  const requestRemoveSection = (index: number) => {
    if (!exam) return
    const section = exam.sections[index]
    if (!section) return
    const hasMedia =
      (section.media ?? []).length > 0 || (section.mediaIds?.length ?? 0) > 0
    if (countSectionQuestions(section) === 0 && !hasMedia) {
      performRemoveSection(index)
      return
    }
    setDeleteTargetIndex(index)
  }

  /** Duplicate a section, minting new ids, right after the source. */
  const duplicateSection = (index: number) => {
    if (!exam) return
    const source = exam.sections[index]
    if (!source) return
    const sameSkillCount = exam.sections.filter((s) => s.skill === source.skill).length
    if (sameSkillCount >= MAX_PARTS[source.skill]) {
      toast.error(`${SKILL_LABEL[source.skill]} chỉ có tối đa ${MAX_PARTS[source.skill]} phần.`)
      return
    }
    const clone = cloneSection(source)
    if (!isDefaultSectionTitle(source.skill, source.title)) {
      clone.title = `${source.title} (bản sao)`
    }
    const nextSections = [...exam.sections]
    nextSections.splice(index + 1, 0, clone)
    applySections(renumberEverything(nextSections), index + 1)
    toast.success(`Đã nhân bản ${source.title}`)
  }

  /** Move a section to a new position within its own skill (drag & drop). */
  const moveSectionWithinSkill = (
    fromIndex: number,
    overIndex: number,
    position: "top" | "bottom"
  ) => {
    if (!exam) return
    const from = exam.sections[fromIndex]
    const over = exam.sections[overIndex]
    if (!from || !over || from.skill !== over.skill) return

    // Positions the dragged skill currently occupies in the flat array.
    const skillPositions = exam.sections
      .map((section, i) => (section.skill === from.skill ? i : -1))
      .filter((i) => i !== -1)
    const ordered = skillPositions.map((i) => exam.sections[i])
    const fromPos = skillPositions.indexOf(fromIndex)
    const overPos = skillPositions.indexOf(overIndex)
    if (fromPos === -1 || overPos === -1) return

    const [moved] = ordered.splice(fromPos, 1)
    let insertPos = overPos + (position === "bottom" ? 1 : 0)
    if (fromPos < insertPos) insertPos -= 1
    insertPos = Math.max(0, Math.min(insertPos, ordered.length))
    if (insertPos === fromPos) return

    ordered.splice(insertPos, 0, moved)
    const nextSections = [...exam.sections]
    skillPositions.forEach((arrayIndex, k) => {
      nextSections[arrayIndex] = ordered[k]
    })
    applySections(renumberEverything(nextSections), skillPositions[insertPos])
    toast.success("Đã đổi thứ tự phần thi")
  }

  // ----- Drag & drop handlers (sidebar outline) -----
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = "move"
    try {
      event.dataTransfer.setData("text/plain", String(index))
    } catch {
      /* some browsers restrict setData during dragstart */
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    if (dragIndex === null || !exam) return
    const from = exam.sections[dragIndex]
    const over = exam.sections[index]
    // Only allow reordering within the same skill.
    if (!from || !over || from.skill !== over.skill) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const rect = event.currentTarget.getBoundingClientRect()
    const position: "top" | "bottom" =
      event.clientY - rect.top < rect.height / 2 ? "top" : "bottom"
    setDropTarget((prev) =>
      prev && prev.index === index && prev.position === position ? prev : { index, position }
    )
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!dropTarget || dropTarget.index !== index) return
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) return
    setDropTarget(null)
  }

  const handleDropSection = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    if (dragIndex === null) return
    const position =
      dropTarget && dropTarget.index === index ? dropTarget.position : "bottom"
    if (dragIndex !== index) moveSectionWithinSkill(dragIndex, index, position)
    setDragIndex(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropTarget(null)
  }

  /** Manually renumber every question across the exam (1..N per skill). */
  const handleRenumberAll = () => {
    if (!exam) return
    const nextSections = renumberEverything(exam.sections)
    const total = nextSections.reduce(
      (acc, section) => acc + countSectionQuestions(section),
      0
    )
    setExam({ ...exam, sections: nextSections })
    markDirty()
    toast.success(`Đã đánh số lại toàn bộ ${total} câu hỏi theo thứ tự chuẩn`)
  }

  const handlePublish = () => {
    if (errors.length > 0) {
      setErrorsOpen(true)
      return
    }
    if (warnings.length > 0) {
      setPublishConfirmOpen(true)
      return
    }
    doPublish()
  }

  const doPublish = async () => {
    if (USE_MOCKS) {
      setStatus("published")
      setPublishConfirmOpen(false)
      setSuccessOpen(true)
      return
    }
    try {
      await publishMutation.mutateAsync()
      setStatus("published")
      setPublishConfirmOpen(false)
      setSuccessOpen(true)
      hydratedFor.current = null // refetch lần sau
      await examQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_EMPTY") {
        setPublishConfirmOpen(false)
        setErrorsOpen(true)
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể xuất bản đề.")
      }
    }
  }

  const handleUnpublish = async () => {
    if (USE_MOCKS) {
      setStatus("draft")
      toast.success("Đã hủy xuất bản (demo)")
      return
    }
    try {
      await unpublishMutation.mutateAsync()
      setStatus("draft")
      setHasAttemptsError(false)
      toast.success("Đã hủy xuất bản, đề chuyển về nháp")
      hydratedFor.current = null
      await examQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_HAS_ATTEMPTS") {
        setHasAttemptsError(true)
        toast.error("Đã có học sinh làm đề này, không thể hủy xuất bản. Hãy nhân bản.")
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể hủy xuất bản.")
      }
    }
  }

  const router = useRouter()

  const handleClone = async () => {
    if (USE_MOCKS) {
      toast.success("Đã nhân bản đề thi (demo)")
      return
    }
    try {
      const cloned = await cloneMutation.mutateAsync(examId)
      toast.success("Đã nhân bản đề thi", { description: "Đang mở bản sao ở chế độ chỉnh sửa." })
      router.push(`/teacher/exams/${cloned.id}/edit`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể nhân bản đề.")
    }
  }

  const grouped = SKILL_ORDER.map((skill) => ({
    skill,
    sections: (exam?.sections ?? [])
      .map((section, index) => ({ section, index }))
      .filter((x) => x.section.skill === skill),
  })).filter((g) => g.sections.length > 0)

  // ----- Loading & error -----
  if (!USE_MOCKS && examQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <div className="sticky top-16 z-10 -mx-8 -mt-8 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-8 py-3 backdrop-blur-md">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="mt-5 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[15rem_1fr_18rem]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!USE_MOCKS && (examQuery.isError || !exam)) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Không tải được trình soạn đề</p>
            <p className="text-xs text-muted-foreground">
              {examQuery.error instanceof ApiError
                ? examQuery.error.message
                : "Đề không tồn tại hoặc bạn không có quyền chỉnh sửa."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-medium"
                onClick={() => examQuery.refetch()}
              >
                <HugeiconsIcon icon={RefreshIcon} size={14} />
                <span>Thử lại</span>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teacher/exams">Quay lại danh sách</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!exam) return null

  const deleteTarget =
    deleteTargetIndex !== null ? exam.sections[deleteTargetIndex] : undefined

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="sticky top-16 z-10 -mx-8 -mt-8 flex flex-col gap-3 border-b border-border bg-background/95 px-8 py-3 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/teacher/exams">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
            </Link>
          </Button>
          <div className="min-w-0">
            <Input
              value={exam.title}
              onChange={(e) => updateExam({ title: e.target.value })}
              disabled={!USE_MOCKS && status === "closed"}
              className="h-8 max-w-sm border-transparent bg-transparent px-1 font-heading text-lg font-bold shadow-none hover:border-border focus-visible:border-border"
            />
            <div className="flex items-center gap-2 pl-1">
              <Badge variant={status === "published" ? "default" : "outline"} className="text-[10px]">
                {status === "published" ? "Đã xuất bản" : status === "closed" ? "Đã đóng" : "Nháp"}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {saveStatus === "saving" ? (
                  <>
                    <HugeiconsIcon icon={SparklesIcon} size={11} className="animate-pulse" /> Đang lưu…
                  </>
                ) : saveStatus === "error" ? (
                  <button
                    type="button"
                    onClick={() => void doSave()}
                    className="flex items-center gap-1 text-amber-600 hover:underline"
                  >
                    <HugeiconsIcon icon={Alert02Icon} size={11} /> Chưa lưu · Thử lại
                  </button>
                ) : (
                  <>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />
                    {lastSavedAt
                      ? ` Đã lưu ${String(lastSavedAt.getHours()).padStart(2, "0")}:${String(lastSavedAt.getMinutes()).padStart(2, "0")}`
                      : " Đã lưu"}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/teacher/exams/${examId}/preview`}>
              <HugeiconsIcon icon={EyeIcon} size={15} /> Xem trước
            </Link>
          </Button>
          {!examReadonly && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={handlePublish}
              disabled={!USE_MOCKS && publishMutation.isPending}
            >
              <HugeiconsIcon icon={Upload04Icon} size={15} />
              {publishMutation.isPending && !USE_MOCKS ? "Đang xuất bản…" : "Xuất bản đề"}
            </Button>
          )}
        </div>
      </div>

      {examReadonly && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <HugeiconsIcon icon={Alert02Icon} size={18} className="mt-0.5 text-amber-600" />
            <div>
              {hasAttemptsError ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    Đã có học sinh làm đề này, không thể sửa câu hỏi/đáp án.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hãy nhân bản để tạo phiên bản mới.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    Đề đang xuất bản nên cấu trúc đang bị khóa
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cho phép sửa Tên đề & Mô tả. Cấu trúc câu hỏi bị khóa để bảo toàn kết quả thi.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!hasAttemptsError && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={!USE_MOCKS && unpublishMutation.isPending}
              >
                {unpublishMutation.isPending && !USE_MOCKS ? "Đang hủy…" : "Hủy xuất bản để sửa"}
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleClone}
              disabled={!USE_MOCKS && cloneMutation.isPending}
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} />
              {cloneMutation.isPending && !USE_MOCKS ? "Đang nhân bản…" : "Nhân bản"}
            </Button>
          </div>
        </div>
      )}

      {/* 3-column layout */}
      <div className="mt-5 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[15rem_1fr_18rem]">
        {/* Outline */}
        <Card className="h-fit border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border pb-3">
            <CardTitle className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cấu trúc đề
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={examReadonly}
                  onClick={handleRenumberAll}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Đánh số lại câu hỏi</TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent className="space-y-4 p-3">
            {grouped.map((group) => (
              <div key={group.skill} className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-foreground">
                  <HugeiconsIcon icon={SKILL_ICON[group.skill]} size={14} className="text-primary" />
                  {SKILL_LABEL[group.skill]}
                </div>
                {group.sections.map(({ section, index }) => {
                  const groups = section.questionGroups ?? []
                  const count = groups.reduce((acc, g) => acc + g.questions.length, 0)
                  const missing =
                    (section.skill === "listening" &&
                      !((section.media ?? []).length > 0 || (section.mediaIds?.length ?? 0) > 0)) ||
                    (section.skill === "reading" && !section.passageText?.trim())
                  const atMaxParts =
                    exam.sections.filter((s) => s.skill === section.skill).length >=
                    MAX_PARTS[section.skill]
                  const isDropTarget =
                    dropTarget?.index === index && dragIndex !== null && dragIndex !== index
                  const isDragging = dragIndex === index
                  return (
                    <div key={section.id ?? `${section.skill}-${index}`} className="relative">
                      {isDropTarget && dropTarget?.position === "top" && (
                        <span className="pointer-events-none absolute -top-1 right-1 left-1 z-10 h-0.5 rounded-full bg-primary" />
                      )}
                      <div
                        draggable={!examReadonly}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={(e) => handleDragLeave(e, index)}
                        onDrop={(e) => handleDropSection(e, index)}
                        className={cn(
                          "group flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 transition-colors",
                          activeIndex === index
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted",
                          !examReadonly && "cursor-grab active:cursor-grabbing",
                          isDragging && "opacity-40"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className="flex flex-1 items-center justify-between gap-2 text-left text-xs truncate"
                        >
                          <span className="truncate">
                            {section.skill === "reading"
                              ? `Passage ${section.part}`
                              : section.skill === "writing"
                                ? `Task ${section.part}`
                                : `Part ${section.part}`}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {count > 0 && <span className="font-mono text-[10px]">({count})</span>}
                            {(count === 0 || missing) && (
                              <HugeiconsIcon icon={Alert02Icon} size={12} className="text-amber-600" />
                            )}
                          </span>
                        </button>
                        {!examReadonly && (
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <span
                              aria-hidden
                              title="Kéo để đổi thứ tự"
                              className="flex h-5 w-5 items-center justify-center text-muted-foreground/60"
                            >
                              <HugeiconsIcon icon={DragDropVerticalIcon} size={13} />
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={atMaxParts}
                              onClick={(e) => {
                                e.stopPropagation()
                                duplicateSection(index)
                              }}
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                              title={
                                atMaxParts
                                  ? `${SKILL_LABEL[section.skill]} đã đủ ${MAX_PARTS[section.skill]} phần`
                                  : "Nhân bản phần này"
                              }
                            >
                              <HugeiconsIcon icon={Copy01Icon} size={11} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                requestRemoveSection(index)
                              }}
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                              title="Xoá phần này"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={11} />
                            </Button>
                          </div>
                        )}
                      </div>
                      {isDropTarget && dropTarget?.position === "bottom" && (
                        <span className="pointer-events-none absolute -bottom-1 right-1 left-1 z-10 h-0.5 rounded-full bg-primary" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            <Separator />
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Thêm phần
              </p>
              {SKILL_ORDER.map((skill) => {
                const atMax = (exam.sections.filter((s) => s.skill === skill).length ?? 0) >= MAX_PARTS[skill]
                return (
                  <Button
                    key={skill}
                    variant="ghost"
                    size="sm"
                    disabled={examReadonly || atMax}
                    title={atMax ? `${SKILL_LABEL[skill]} đã đủ ${MAX_PARTS[skill]} phần` : undefined}
                    onClick={() => addSection(skill)}
                    className="w-full justify-start gap-2 text-xs"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={13} />
                    {SKILL_LABEL[skill]}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Workspace */}
        <div className="min-w-0 space-y-4">
          {!active ? (
            <Card className="border-dashed border-border shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <HugeiconsIcon icon={Book02Icon} size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Chưa có phần nào. Thêm một phần từ cột bên trái để bắt đầu.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={SKILL_ICON[active.skill]} size={16} className="text-primary" />
                    <CardTitle className="font-heading text-sm font-bold">
                      {SKILL_LABEL[active.skill]} · {active.title}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={examReadonly}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => requestRemoveSection(activeIndex)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={15} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tiêu đề phần</Label>
                    <Input
                      value={active.title}
                      disabled={examReadonly}
                      onChange={(e) => updateSection(activeIndex, { title: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Hướng dẫn</Label>
                    <Textarea
                      value={active.instructions ?? ""}
                      disabled={examReadonly}
                      onChange={(e) => updateSection(activeIndex, { instructions: e.target.value })}
                      placeholder="VD: Questions 1–10. Complete the notes below..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>

                  {active.skill === "listening" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Audio của phần</Label>
                      <div className="space-y-2">
                        {activeAudio.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2"
                          >
                            <HugeiconsIcon icon={MusicNote01Icon} size={16} className="text-primary" />
                            <span className="flex-1 truncate text-xs font-medium">{m.originalName}</span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={examReadonly}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                updateSection(activeIndex, {
                                  media: activeMedia.filter((x) => x.id !== m.id),
                                })
                              }
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={14} />
                            </Button>
                          </div>
                        ))}
                        {activeAudio.length === 0 &&
                          activeMedia.length === 0 &&
                          (active.mediaIds ?? []).length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {active.mediaIds!.length} tệp audio đã gắn (id: {active.mediaIds!.join(", ")})
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={examReadonly}
                          className="gap-1.5 text-xs"
                          onClick={() => setMediaPickerOpen(true)}
                        >
                          <HugeiconsIcon icon={Add01Icon} size={13} /> Chọn audio từ thư viện
                        </Button>
                      </div>
                    </div>
                  )}

                  {active.skill === "reading" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Nội dung bài đọc (đánh nhãn đoạn A / B / C)</Label>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-primary hover:underline"
                          onClick={() => setPassagePreview((v) => !v)}
                        >
                          {passagePreview ? "Chỉnh sửa" : "Xem trước"}
                        </button>
                      </div>
                      {passagePreview ? (
                        <div className="prose prose-sm max-w-none rounded-xl border border-border bg-card p-4 leading-relaxed">
                          {(active.passageText ?? "").split(/\n{2,}/).map((para, i) => (
                            <p key={i} className="whitespace-pre-line text-sm">
                              {para}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <Textarea
                          value={active.passageText ?? ""}
                          disabled={examReadonly}
                          onChange={(e) => updateSection(activeIndex, { passageText: e.target.value })}
                          placeholder={"Paragraph A\nNội dung đoạn A...\n\nParagraph B\nNội dung đoạn B..."}
                          rows={10}
                          className="resize-y text-sm leading-relaxed"
                        />
                      )}
                    </div>
                  )}

                  {active.skill === "writing" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                      Writing sử dụng câu hỏi dạng <span className="font-mono">writing_task_1</span> /{" "}
                      <span className="font-mono">writing_task_2</span>. Thêm chúng ở danh sách câu hỏi bên dưới.
                    </div>
                  )}

                  {/* Section illustration (all skills) */}
                  <div className="space-y-2">
                    <Label className="text-xs">Ảnh minh hoạ của phần</Label>
                    <div className="space-y-2">
                      {activeImages.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.url}
                            alt={m.originalName || "Ảnh minh hoạ"}
                            className="h-12 w-16 shrink-0 rounded-md border border-border object-cover"
                          />
                          <span className="flex-1 truncate text-xs font-medium">
                            {m.originalName || "Ảnh minh hoạ"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={examReadonly}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              updateSection(activeIndex, {
                                media: activeMedia.filter((x) => x.id !== m.id),
                              })
                            }
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                          </Button>
                        </div>
                      ))}
                      {activeImages.length === 0 &&
                        activeMedia.length === 0 &&
                        (active.mediaIds ?? []).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {active.mediaIds!.length} tệp đã gắn (id: {active.mediaIds!.join(", ")})
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={examReadonly}
                        className="gap-1.5 text-xs"
                        onClick={() => setImagePickerOpen(true)}
                      >
                        <HugeiconsIcon icon={Add01Icon} size={13} /> Chọn ảnh minh hoạ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Question Groups */}
              <Card className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <CardTitle className="font-heading text-sm font-bold">
                    Nhóm câu hỏi ({(active.questionGroups ?? []).reduce(
                      (acc, g) => acc + g.questions.length,
                      0
                    )}{" "}
                    câu trong {(active.questionGroups ?? []).length} nhóm)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={examReadonly}
                      onClick={() => setBankOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <HugeiconsIcon icon={SparklesIcon} size={13} /> Từ ngân hàng
                    </Button>
                    <Button
                      size="sm"
                      disabled={examReadonly}
                      onClick={() => setGroupTypePickerOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={13} /> Thêm nhóm câu hỏi
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {(active.questionGroups ?? []).length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <HugeiconsIcon icon={Alert02Icon} size={26} className="text-amber-600" />
                      <p className="text-sm text-muted-foreground">
                        Phần này chưa có nhóm câu hỏi. Thêm từ ngân hàng hoặc tạo nhóm mới.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(active.questionGroups ?? []).map((group) => (
                        <QuestionGroupEditor
                          key={group.id}
                          group={group}
                          examReadonly={examReadonly}
                          numbering={numbering}
                          onUpdateGroup={(patch) => updateQuestionGroup(group.id, patch)}
                          onRemoveGroup={() => removeQuestionGroup(group.id)}
                          onAddQuestion={() => addQuestionToGroup(group.id)}
                          onRemoveQuestion={(qId) => removeQuestionFromGroup(group.id, qId)}
                          onUpdateQuestion={(qId, patch) => updateQuestionInGroup(group.id, qId, patch)}
                          onSaveToBank={() => void saveGroupToBank(group)}
                          savingToBank={savingBankId === group.id}
                        />
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={examReadonly}
                        onClick={() => setGroupTypePickerOpen(true)}
                        className="w-full gap-1.5 text-xs"
                      >
                        <HugeiconsIcon icon={Add01Icon} size={13} /> Thêm nhóm câu hỏi mới
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Settings + Checklist */}
        <div className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cài đặt đề
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Thời lượng (phút)</Label>
                <Input
                  type="number"
                  value={exam.durationMinutes}
                  disabled={examReadonly}
                  onChange={(e) => updateExam({ durationMinutes: Number(e.target.value) })}
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mở lúc</Label>
                <Input
                  type="datetime-local"
                  value={openAt}
                  disabled={examReadonly}
                  onChange={(e) => {
                    setOpenAt(e.target.value)
                    markDirty()
                  }}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Đóng lúc</Label>
                <Input
                  type="datetime-local"
                  value={closeAt}
                  disabled={examReadonly}
                  onChange={(e) => {
                    setCloseAt(e.target.value)
                    markDirty()
                  }}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mô tả</Label>
                <Textarea
                  value={exam.description ?? ""}
                  disabled={!USE_MOCKS && status === "closed"}
                  onChange={(e) => updateExam({ description: e.target.value })}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center justify-between font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Kiểm tra hợp lệ
                <Badge variant={errors.length ? "destructive" : warnings.length ? "outline" : "default"}>
                  {errors.length
                    ? `${errors.length} lỗi`
                    : warnings.length
                      ? `${warnings.length} cảnh báo`
                      : "Hợp lệ"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
                  Đề đã sẵn sàng xuất bản!
                </div>
              ) : (
                issues.map((issue, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => issue.sectionIndex !== undefined && setActiveIndex(issue.sectionIndex)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      issue.level === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-500"
                    )}
                  >
                    <HugeiconsIcon icon={Alert02Icon} size={13} className="mt-0.5 shrink-0" />
                    <span>{issue.message}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete section confirmation */}
      <AlertDialog
        open={deleteTargetIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetIndex(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá phần này?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Bạn sắp xoá{" "}
                  <span className="font-semibold text-foreground">{deleteTarget.title}</span>
                  {countSectionQuestions(deleteTarget) > 0
                    ? ` cùng ${countSectionQuestions(deleteTarget)} câu hỏi`
                    : ""}
                  {((deleteTarget.media ?? []).length > 0 ||
                    (deleteTarget.mediaIds?.length ?? 0) > 0)
                    ? " và media đã gắn"
                    : ""}
                  . Hành động này không thể hoàn tác.
                </>
              ) : (
                ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTargetIndex !== null) performRemoveSection(deleteTargetIndex)
              }}
            >
              Xoá phần
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bank sheet */}
      <BankGroupSheet
        open={bankOpen}
        onOpenChange={setBankOpen}
        section={active}
        onAddGroups={addGroupsFromBank}
      />

      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        type="audio"
        onSelect={(asset) => {
          if (!active) return
          const item: MediaItem = { id: asset.id, url: asset.url, type: "audio", originalName: asset.originalName }
          updateSection(activeIndex, { media: [...(active.media ?? []), item] })
        }}
      />

      <MediaPicker
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        type="image"
        onSelect={(asset) => {
          if (!active) return
          if ((active.media ?? []).some((m) => m.id === asset.id)) {
            toast.info("Ảnh này đã được gắn vào phần.")
            return
          }
          const item: MediaItem = { id: asset.id, url: asset.url, type: "image", originalName: asset.originalName }
          updateSection(activeIndex, { media: [...(active.media ?? []), item] })
          toast.success("Đã gắn ảnh minh hoạ cho phần.")
        }}
      />

      {/* Publish warnings confirm */}
      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Xuất bản đề thi?</DialogTitle>
            <DialogDescription className="text-xs">
              Còn {warnings.length} cảnh báo chưa xử lý. Bạn vẫn có thể xuất bản sau khi xác nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
                <HugeiconsIcon icon={Alert02Icon} size={13} className="mt-0.5" /> {w.message}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>Quay lại</Button>
            <Button onClick={() => void doPublish()} className="font-semibold">Vẫn xuất bản</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Errors dialog */}
      <Dialog open={errorsOpen} onOpenChange={setErrorsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Chưa thể xuất bản</DialogTitle>
            <DialogDescription className="text-xs">
              Vui lòng xử lý {errors.length} lỗi bắt buộc trước khi xuất bản.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {errors.map((e, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (e.sectionIndex !== undefined) setActiveIndex(e.sectionIndex)
                  setErrorsOpen(false)
                }}
                className="flex w-full items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-left text-xs text-destructive"
              >
                <HugeiconsIcon icon={Alert02Icon} size={13} className="mt-0.5" /> {e.message}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setErrorsOpen(false)}>Đã hiểu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success + assign */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={30} />
            </div>
            <DialogTitle className="text-center font-heading text-lg font-bold">
              Xuất bản đề thành công!
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {exam.title} đã sẵn sàng. Bạn có muốn giao bài cho học sinh ngay không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setSuccessOpen(false)}>Để sau</Button>
            <Button
              className="gap-2 font-semibold"
              onClick={() => {
                setSuccessOpen(false)
                setAssignOpen(true)
              }}
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} /> Giao bài ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} initialExamId={examId} />

      {/* Question Group Type Picker */}
      <QuestionTypePickerDialog
        open={groupTypePickerOpen}
        onOpenChange={setGroupTypePickerOpen}
        activeSection={active}
        onSelectType={addQuestionGroup}
      />
    </div>
  )
}

function BankGroupSheet({
  open,
  onOpenChange,
  section,
  onAddGroups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  section?: CandidateSection
  onAddGroups: (groups: BankQuestionGroup[]) => void
}) {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])

  // Reset selection khi Sheet đóng → mở lại: dùng key ở component cha.
  // Tại đây chỉ reset khi open chuyển false → true thông qua onOpenChange của Sheet.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelected([])
      setQuery("")
    }
    onOpenChange(next)
  }

  const bankQuery = useQuestionsQuery(
    {
      skill: section?.skill,
      part: section?.part,
      scope: "all",
      search: query || undefined,
      limit: 50,
    },
    !USE_MOCKS && open && !!section
  )

  const candidates: BankQuestionGroup[] = USE_MOCKS
    ? DEMO_BANK_GROUPS.filter(
        (g) =>
          section &&
          g.skill === section.skill &&
          g.part === section.part &&
          `${g.instructions} ${g.questions.map((q) => q.prompt).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase())
      )
    : (bankQuery.data?.items ?? [])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleAdd = () => {
    const selectedGroups = candidates.filter((g) => selected.includes(g.id))
    onAddGroups(selectedGroups)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold">Thêm nhóm câu hỏi từ ngân hàng</SheetTitle>
          <SheetDescription className="text-xs">
            Đã lọc theo {section && SKILL_LABEL[section.skill]} · Part {section?.part}. Nhóm được chèn dưới dạng bản sao và đánh số lại.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nhóm câu hỏi..."
              className="h-9 pl-9 text-sm"
            />
          </div>
          <ScrollArea className="min-h-48 flex-1">
            <div className="space-y-2 pr-2">
              {!USE_MOCKS && bankQuery.isLoading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !USE_MOCKS && bankQuery.isError ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <p className="text-xs text-muted-foreground">
                    {bankQuery.error instanceof ApiError
                      ? bankQuery.error.message
                      : "Không tải được ngân hàng câu hỏi."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => bankQuery.refetch()}
                  >
                    <HugeiconsIcon icon={RefreshIcon} size={13} /> Thử lại
                  </Button>
                </div>
              ) : candidates.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Không tìm thấy nhóm câu hỏi phù hợp với phần này.
                </p>
              ) : (
                candidates.map((g) => {
                  const checked = selected.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggle(g.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}
                      >
                        {checked && <HugeiconsIcon icon={Tick02Icon} size={11} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {QUESTION_GROUP_TYPE_LABEL[g.groupType] || g.groupType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {g.questions.length} câu · Part {g.part}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium text-foreground">
                          {g.instructions || g.questions[0]?.prompt || "—"}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Đã chọn {selected.length} nhóm</span>
            <Button
              disabled={selected.length === 0}
              onClick={handleAdd}
              className="font-semibold"
            >
              Thêm {selected.length > 0 ? `${selected.length} ` : ""}nhóm
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
