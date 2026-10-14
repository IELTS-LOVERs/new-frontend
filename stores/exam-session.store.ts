import { create } from "zustand"
import type { CandidateExam } from "@/lib/api/types"

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

interface ExamUIState {
  fontScale: 1 | 1.125 | 1.25
  theme: "white" | "cream"
  splitRatio: number
}

/** Check if a candidate exam uses the new questionGroups format */
export function examUsesGroups(exam: CandidateExam): boolean {
  return exam.sections.some(
    (s) => Array.isArray(s.questionGroups) && s.questionGroups.length > 0
  )
}

/** Collect all question IDs from a candidate exam (supports both formats) */
export function collectAllQuestionIds(exam: CandidateExam): string[] {
  return exam.sections.flatMap((section) => {
    if (section.questionGroups && section.questionGroups.length > 0) {
      return section.questionGroups.flatMap((g) => g.questions.map((q) => q.id))
    }
    return section.questions.map((q) => q.id)
  })
}

interface ExamSessionState {
  attemptId: string | null
  exam: CandidateExam | null
  phase: ExamPhase
  /** performance.now() tại thời điểm hết giờ (server-side deadline, sync qua remainingSeconds) */
  deadlineMono: number | null
  answers: Record<string, LocalAnswer>
  flagged: Record<string, true>
  activeSectionIndex: number
  activeQuestionId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  audio: Record<number, { position: number }>
  ui: ExamUIState

  // actions
  init: (attemptId: string, exam: CandidateExam, remainingSeconds: number) => void
  setPhase: (phase: ExamPhase) => void
  setActiveSectionIndex: (index: number) => void
  setActiveQuestion: (questionId: string | null) => void
  setAnswer: (questionId: string, value: string) => void
  markAnswerSynced: (questionId: string, sentAt: number) => void
  markAnswersSynced: (questionIds: string[], sentAt: number) => void
  toggleFlag: (questionId: string) => void
  setSaveStatus: (status: SaveStatus) => void
  resyncTimer: (serverRemainingSeconds: number) => void
  setAudioPosition: (sectionIndex: number, position: number) => void
  setUIFontScale: (scale: ExamUIState["fontScale"]) => void
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
  activeSectionIndex: 0,
  activeQuestionId: null,
  saveStatus: "idle" as SaveStatus,
  lastSavedAt: null,
  audio: {},
  ui: { fontScale: 1, theme: "white", splitRatio: 50 } as ExamUIState,
}

export const useExamSessionStore = create<ExamSessionState>()((set) => ({
  ...initialState,

  init: (attemptId, exam, remainingSeconds) =>
    set({
      attemptId,
      exam,
      deadlineMono: performance.now() + remainingSeconds * 1000,
      phase: "active",
      answers: {},
      flagged: {},
      activeSectionIndex: 0,
      activeQuestionId: null,
      saveStatus: "idle",
      lastSavedAt: null,
      audio: {},
    }),

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
  setUITheme: (theme) => set((state) => ({ ui: { ...state.ui, theme } })),
  setSplitRatio: (splitRatio) => set((state) => ({ ui: { ...state.ui, splitRatio } })),

  reset: () => set(initialState),
}))
