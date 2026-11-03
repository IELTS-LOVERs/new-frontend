import { createClientId } from "@/lib/utils"
import type {
  BuilderExam,
  BuilderQuestionGroup,
  BuilderQuestionItem,
  BuilderSection,
  CandidateExam,
  CandidateSection,
  SkillType,
} from "@/lib/api/types"
import { alignTemplatePlaceholders } from "@/features/questions/lib/completion-template"
import type {
  CreateExamSectionPayload,
  QuestionItemPayload,
  TeacherExamDetail,
} from "@/lib/api/exams"

/** IELTS structural limits per skill (matches the backend `part` 1..4 Zod cap). */
export const MAX_PARTS: Record<SkillType, number> = {
  listening: 4,
  reading: 3,
  writing: 2,
}

/** Canonical titles generated for a freshly added section. Used to distinguish
 *  auto-generated titles from ones the teacher renamed by hand so that
 *  renumbering only rewrites the former. */
export const DEFAULT_SECTION_TITLE: Record<SkillType, RegExp> = {
  listening: /^Listening\s+Part\s+\d+$/i,
  reading: /^Reading\s+Passage\s+\d+$/i,
  writing: /^Writing\s+Task\s+\d+$/i,
}

export function defaultSectionTitle(skill: SkillType, part: number): string {
  if (skill === "listening") return `Listening Part ${part}`
  if (skill === "reading") return `Reading Passage ${part}`
  return `Writing Task ${part}`
}

export function isDefaultSectionTitle(skill: SkillType, title: string): boolean {
  return DEFAULT_SECTION_TITLE[skill].test(title.trim())
}

/** Deep clone a JSON-serialisable value (question group config etc.). */
export function deepCloneValue<T>(value: T): T {
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
export function countSectionQuestions(section: CandidateSection | BuilderSection): number {
  return (section.questionGroups ?? []).reduce((acc, g) => acc + g.questions.length, 0)
}

/**
 * Ensure parts are numbered `1..n` within each skill (in array order). Sections
 * whose title is still the auto-generated default are renamed to match the new
 * part number; custom titles are preserved.
 */
export function renormalizeSections<T extends CandidateSection | BuilderSection>(sections: T[]): T[] {
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
export function renumberAllQuestions<T extends CandidateSection | BuilderSection>(sections: T[]): T[] {
  const counters: Record<SkillType, number> = { listening: 0, reading: 0, writing: 0 }
  return sections.map((section) => {
    let changed = false
    const questionGroups = (section.questionGroups ?? []).map((group) => {
      const oldNumbers = group.questions.map((question) => question.questionNumber)
      const newNumbers: number[] = []
      let groupChanged = false
      const questions = group.questions.map((question) => {
        counters[section.skill] += 1
        const questionNumber = counters[section.skill]
        newNumbers.push(questionNumber)
        if (question.questionNumber === questionNumber) return question
        groupChanged = true
        return { ...question, questionNumber }
      })
      const config = group.config
      let nextConfig = config
      if (typeof config?.template === "string") {
        const template = alignTemplatePlaceholders(
          config.template,
          oldNumbers,
          newNumbers
        )
        if (template !== config.template) {
          nextConfig = { ...config, template }
          groupChanged = true
        }
      }
      if (!groupChanged) return group
      changed = true
      return { ...group, config: nextConfig, questions }
    })
    return changed ? ({ ...section, questionGroups } as T) : section
  })
}

/** Structural normalisation applied whenever parts are added / removed / moved. */
export function renumberEverything<T extends CandidateSection | BuilderSection>(sections: T[]): T[] {
  return renumberAllQuestions(renormalizeSections(sections))
}

/**
 * Deep copy a section, minting fresh client ids for the section, its question
 * groups and its questions so the backend treats them as brand-new entities.
 */
export function cloneSection<T extends CandidateSection | BuilderSection>(section: T): T {
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
  } as T
}

/**
 * Client-side pre-flight for autosave: skip the network call while the exam is
 * clearly invalid (e.g. the teacher is mid-typing a short title or cleared the
 * duration field), avoiding a flood of 400 VALIDATION_ERROR responses.
 * Mirrors `CreateExamSchema` in the backend.
 */
export function firstDraftValidationIssue(exam: CandidateExam | BuilderExam): string | null {
  if (exam.title.trim().length < 3) return "Tiêu đề cần tối thiểu 3 ký tự."
  if (exam.durationMinutes < 10 || exam.durationMinutes > 180) {
    return "Thời lượng phải trong khoảng 10–180 phút."
  }
  return null
}

export interface Issue {
  level: "error" | "warning"
  message: string
  sectionIndex?: number
}

// Convert API TeacherExamDetail -> local BuilderExam (builder source of truth)
export function toLocalExam(detail: TeacherExamDetail): BuilderExam {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description ?? undefined,
    bannerUrl: detail.bannerUrl ?? undefined,
    durationMinutes: detail.durationMinutes,
    kind: detail.kind,
    status: detail.status,
    scoringMode: detail.scoringMode,
    bandConversion: detail.bandConversion,
    disableTextSelection: detail.disableTextSelection ?? false,
    curriculum: detail.curriculum,
    sections: detail.sections
      // Defensive: ignore any legacy sections whose skill is no longer supported.
      .filter((s) => s.skill === "listening" || s.skill === "reading" || s.skill === "writing")
      .map((s) => {
        const questionGroups: BuilderQuestionGroup[] = (s.questionGroups ?? []).map((g) => ({
          id: g.id,
          groupType: g.groupType,
          instructions: g.instructions,
          instructionsDoc: g.instructionsDoc ?? null,
          config: g.config,
          media: g.media ?? [],
          questions: g.questions.map((q) => ({
            id: q.id,
            questionNumber: q.questionNumber,
            prompt: q.prompt,
            promptDoc: q.promptDoc ?? null,
            points: q.points,
            acceptedAnswers: q.acceptedAnswers ?? [],
            explanation: q.explanation ?? undefined,
            mediaIds: q.mediaIds,
          })),
        }))
        return {
          id: s.id,
          skill: s.skill,
          part: s.part,
          title: s.title,
          instructions: s.instructions ?? "",
          instructionsDoc: s.instructionsDoc ?? null,
          passageText: s.passageText ?? "",
          passageDoc: s.passageDoc ?? null,
          transcript: s.transcript ?? "",
          mediaIds: s.mediaIds ?? [],
          media: s.media ?? [],
          questionGroups,
        }
      }),
  }
}

export const isValidObjectId = (id?: string | null) => Boolean(id && /^[0-9a-fA-F]{24}$/.test(id))

/** Convert a datetime-local value into an ISO string, or undefined when invalid/empty. */
export function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

// Convert local BuilderExam / CandidateExam -> PUT payload
export function toUpdatePayload(exam: BuilderExam | CandidateExam, openAt: string, closeAt: string) {
  const sections: CreateExamSectionPayload[] = exam.sections.map((s) => ({
    _id: isValidObjectId(s.id) ? s.id : undefined,
    skill: s.skill,
    part: s.part,
    title: s.title,
    instructions: s.instructions ?? "",
    instructionsDoc: s.instructionsDoc ?? undefined,
    passageText: s.skill === "reading" ? (s.passageText ?? "") : undefined,
    passageDoc: s.skill === "reading" ? (s.passageDoc ?? undefined) : undefined,
    transcript: s.skill === "listening" ? (s.transcript ?? "") : undefined,
    mediaIds:
      (s.media ?? []).length > 0 ? (s.media ?? []).map((m) => m.id) : (s.mediaIds ?? []),
    questionGroups: (s.questionGroups ?? []).map((g) => ({
      _id: isValidObjectId(g.id) ? g.id : undefined,
      groupType: g.groupType,
      instructions: g.instructions ?? "",
      instructionsDoc: g.instructionsDoc ?? undefined,
      config: g.config ?? {},
      questions: g.questions.map(
        (q) =>
          ({
            _id: isValidObjectId(q.id) ? q.id : undefined,
            questionNumber: q.questionNumber,
            prompt: q.prompt ?? "",
            promptDoc: q.promptDoc ?? undefined,
            acceptedAnswers: (q as BuilderQuestionItem).acceptedAnswers ?? [],
            points: q.points ?? 1,
            explanation: (q as BuilderQuestionItem).explanation ?? undefined,
            mediaIds: q.mediaIds,
          }) as QuestionItemPayload
      ),
    })),
  }))
  return {
    title: exam.title,
    description: exam.description ?? undefined,
    bannerUrl: (exam as CandidateExam).bannerUrl ?? undefined,
    durationMinutes: exam.durationMinutes,
    kind: exam.kind,
    scoringMode: exam.scoringMode,
    bandConversion: exam.bandConversion,
    disableTextSelection: exam.disableTextSelection ?? false,
    curriculum: exam.curriculum,
    sections,
    openAt: toIsoOrUndefined(openAt),
    closeAt: toIsoOrUndefined(closeAt),
  }
}

export function toLocalInputValue(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
