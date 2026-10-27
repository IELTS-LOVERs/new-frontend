import { create } from "zustand"
import type { CandidateExam } from "@/lib/api/types"
import type { ExamHighlightItem } from "@/features/exam-engine/lib/highlight"

export type ExamPhase =
  | "loading"
  | "resumeGate"
  | "active"
  | "offline"
  | "submitting"
  | "finished"

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline"

export interface LocalAnswer {
  value: string
  updatedAt: number
  dirty: boolean
}

export interface ExamUpdateSummary {
  /** Questions that exist in the new content but not in the old one. */
  addedQuestions: number
  /** Questions removed by the teacher; their answer/flag/highlight state is dropped. */
  removedQuestions: number
  /** True when the number of sections changed. */
  sectionsChanged: boolean
  /** True when the question the student was viewing was deleted. */
  activeQuestionRemoved: boolean
}

/** Extract the question id referenced by a highlight target, if any. */
export function questionIdFromHighlightTarget(targetId: string): string | null {
  if (targetId.startsWith("q-")) return targetId.slice(2)
  if (targetId.startsWith("opt-")) {
    const match = /^opt-([0-9a-fA-F]{24})-/.exec(targetId)
    if (match) return match[1]
    // Fallback: strip the first segment after `opt-`.
    const rest = targetId.slice(4)
    const dash = rest.indexOf("-")
    return dash > 0 ? rest.slice(0, dash) : null
  }
  return null
}

interface ExamUIState {
  fontScale: number
  theme: "white" | "cream"
  splitRatio: number
}

/** Check if a candidate exam uses the new questionGroups format */
export function examUsesGroups(exam: CandidateExam): boolean {
  return exam.sections.some(
    (s) => Array.isArray(s.questionGroups) && s.questionGroups.length > 0
  )
}

/** Collect all question IDs from a candidate exam. */
export function collectAllQuestionIds(exam: CandidateExam): string[] {
  return exam.sections.flatMap((section) =>
    (section.questionGroups ?? []).flatMap((g) => g.questions.map((q) => q.id))
  )
}

interface ExamSessionState {
  attemptId: string | null
  exam: CandidateExam | null
  phase: ExamPhase
  /** performance.now() tại thời điểm hết giờ (server-side deadline, sync qua remainingSeconds) */
  deadlineMono: number | null
  answers: Record<string, LocalAnswer>
  flagged: Record<string, true>
  highlights: ExamHighlightItem[]
  activeSectionIndex: number
  activeQuestionId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  audio: Record<number, { position: number }>
  ui: ExamUIState
  /** Content revision the current `exam` was loaded from. */
  examRevision: number

  // actions
  init: (
    attemptId: string,
    exam: CandidateExam,
    remainingSeconds: number,
    revision?: number
  ) => void
  /** Swap in new exam content without touching answers, flags, highlights or the deadline. */
  applyExamUpdate: (exam: CandidateExam, revision: number) => ExamUpdateSummary
  setPhase: (phase: ExamPhase) => void
  setActiveSectionIndex: (index: number) => void
  setActiveQuestion: (questionId: string | null) => void
  setAnswer: (questionId: string, value: string) => void
  markAnswerSynced: (questionId: string, sentAt: number) => void
  markAnswersSynced: (questionIds: string[], sentAt: number) => void
  toggleFlag: (questionId: string) => void
  setHighlights: (highlights: ExamHighlightItem[]) => void
  setSaveStatus: (status: SaveStatus) => void
  resyncTimer: (serverRemainingSeconds: number) => void
  setAudioPosition: (sectionIndex: number, position: number) => void
  setUIFontScale: (scale: number) => void
  increaseFontScale: () => void
  decreaseFontScale: () => void
  resetFontScale: () => void
  setUITheme: (theme: ExamUIState["theme"]) => void
  setSplitRatio: (ratio: number) => void
  reset: () => void
}

const initialState = {
  attemptId: null,
  exam: null,
  phase: "loading" as ExamPhase,
  deadlineMono: null,
  answers: {},
  flagged: {},
  highlights: [] as ExamHighlightItem[],
  activeSectionIndex: 0,
  activeQuestionId: null,
  saveStatus: "idle" as SaveStatus,
  lastSavedAt: null,
  audio: {},
  ui: { fontScale: 1, theme: "white", splitRatio: 50 } as ExamUIState,
  examRevision: 0,
}

export const useExamSessionStore = create<ExamSessionState>()((set, get) => ({
  ...initialState,

  init: (attemptId, exam, remainingSeconds, revision = 0) =>
    set({
      attemptId,
      exam,
      deadlineMono: performance.now() + remainingSeconds * 1000,
      phase: "active",
      answers: {},
      flagged: {},
      highlights: [],
      activeSectionIndex: 0,
      activeQuestionId: null,
      saveStatus: "idle",
      lastSavedAt: null,
      audio: {},
      examRevision: revision,
    }),

  applyExamUpdate: (exam, revision) => {
    const state = get()
    const previousExam = state.exam
    const previousIds = previousExam ? collectAllQuestionIds(previousExam) : []
    const nextIds = collectAllQuestionIds(exam)
    const nextIdSet = new Set(nextIds)
    const previousIdSet = new Set(previousIds)

    const removed = previousIds.filter((id) => !nextIdSet.has(id))
    const added = nextIds.filter((id) => !previousIdSet.has(id))
    const removedSet = new Set(removed)

    const answers = { ...state.answers }
    for (const id of removed) delete answers[id]

    const flagged = { ...state.flagged }
    for (const id of removed) delete flagged[id]

    const highlights = state.highlights.filter((item) => {
      if (item.sectionIndex < 0 || item.sectionIndex >= exam.sections.length) {
        return false
      }
      const questionId = questionIdFromHighlightTarget(item.targetId)
      return questionId === null || !removedSet.has(questionId)
    })

    let activeQuestionId = state.activeQuestionId
    let activeQuestionRemoved = false
    if (activeQuestionId && removedSet.has(activeQuestionId)) {
      activeQuestionRemoved = true
      const oldIndex = previousIds.indexOf(activeQuestionId)
      activeQuestionId = null
      // Prefer the nearest following question, then walk backwards.
      for (let i = oldIndex + 1; i < previousIds.length; i += 1) {
        if (nextIdSet.has(previousIds[i])) {
          activeQuestionId = previousIds[i]
          break
        }
      }
      if (!activeQuestionId) {
        for (let i = oldIndex - 1; i >= 0; i -= 1) {
          if (nextIdSet.has(previousIds[i])) {
            activeQuestionId = previousIds[i]
            break
          }
        }
      }
      if (!activeQuestionId) activeQuestionId = nextIds[0] ?? null
    }

    const activeSectionIndex = Math.max(
      0,
      Math.min(state.activeSectionIndex, Math.max(0, exam.sections.length - 1))
    )

    set({
      exam,
      examRevision: revision,
      answers,
      flagged,
      highlights,
      activeQuestionId,
      activeSectionIndex,
    })

    return {
      addedQuestions: added.length,
      removedQuestions: removed.length,
      sectionsChanged: (previousExam?.sections.length ?? 0) !== exam.sections.length,
      activeQuestionRemoved,
    }
  },

  setPhase: (phase) => set({ phase }),
  setActiveSectionIndex: (activeSectionIndex) => set({ activeSectionIndex }),
  setActiveQuestion: (activeQuestionId) => set({ activeQuestionId }),

  setAnswer: (questionId, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { value, updatedAt: Date.now(), dirty: true },
      },
      saveStatus: state.saveStatus === "saving" ? "saving" : "idle",
    })),

  markAnswerSynced: (questionId, sentAt) =>
    set((state) => {
      const a = state.answers[questionId]
      if (!a) return state
      if (a.updatedAt > sentAt) return state // có update mới hơn sau khi gửi
      return {
        answers: {
          ...state.answers,
          [questionId]: { ...a, dirty: false },
        },
      }
    }),

  markAnswersSynced: (questionIds, sentAt) =>
    set((state) => {
      const next = { ...state.answers }
      for (const id of questionIds) {
        const a = next[id]
        if (!a) continue
        if (a.updatedAt > sentAt) continue
        next[id] = { ...a, dirty: false }
      }
      return { answers: next, saveStatus: "saved", lastSavedAt: Date.now() }
    }),

  toggleFlag: (questionId) =>
    set((state) => {
      const next = { ...state.flagged }
      if (next[questionId]) delete next[questionId]
      else next[questionId] = true
      return { flagged: next }
    }),

  setHighlights: (highlights) => set({ highlights }),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  resyncTimer: (serverRemainingSeconds) =>
    set({
      deadlineMono: performance.now() + serverRemainingSeconds * 1000,
    }),

  setAudioPosition: (sectionIndex, position) =>
    set((state) => ({
      audio: { ...state.audio, [sectionIndex]: { position } },
    })),

  setUIFontScale: (fontScale) =>
    set((state) => ({ ui: { ...state.ui, fontScale } })),
  increaseFontScale: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        fontScale: Math.min(1.4, Math.round((state.ui.fontScale + 0.1) * 100) / 100),
      },
    })),
  decreaseFontScale: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        fontScale: Math.max(0.85, Math.round((state.ui.fontScale - 0.1) * 100) / 100),
      },
    })),
  resetFontScale: () =>
    set((state) => ({ ui: { ...state.ui, fontScale: 1 } })),
  setUITheme: (theme) => set((state) => ({ ui: { ...state.ui, theme } })),
  setSplitRatio: (splitRatio) => set((state) => ({ ui: { ...state.ui, splitRatio } })),

  reset: () => set(initialState),
}))
