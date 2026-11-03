import type { SkillType } from "./common"
import type { IExamCurriculum } from "./exam"

export type PracticeProgressStatus = "not_started" | "in_progress" | "completed"

export interface PracticeCatalogProgress {
  status: PracticeProgressStatus
  attemptId?: string
  lastSubmittedAt?: string
  rawScore?: number
  totalPoints?: number
  percentage?: number
  correctCount?: number
  wrongCount?: number
  blankCount?: number
}

export interface PracticeCatalogItem {
  examId: string
  title: string
  bannerUrl?: string
  durationMinutes: number
  /** Ngày tạo/đăng bài (ISO string) — dùng để sắp xếp theo ngày. */
  createdAt?: string
  questionCount: number
  totalPoints?: number
  kind: "practice"
  curriculum?: IExamCurriculum
  skills: SkillType[]
  parts?: number[]
  sections?: Array<{
    skill: SkillType
    part: number
    title?: string
  }>
  questionTypes?: string[]
  progress: PracticeCatalogProgress
}

export interface PracticeCatalogResponse {
  items: PracticeCatalogItem[]
}

export type DailyPracticeStatus = "both" | "listening_only" | "reading_only" | "none"

export interface PracticeHeatmapDay {
  date: string
  status: DailyPracticeStatus
  listening: number
  reading: number
  /** Writing practice attempts on that day (teacher-graded). */
  writing?: number
}

export interface PracticeHeatmapResponse {
  range: {
    from: string
    to: string
    timezone: string
  }
  days: PracticeHeatmapDay[]
  streak: {
    current: number
    longest: number
  }
}

export interface WeeklyReportDayCell {
  date: string
  status: DailyPracticeStatus
  listening: number
  reading: number
  /** Writing practice attempts on that day (teacher-graded). */
  writing?: number
  practiceCount: number
  mockCount: number
}

export interface WeeklyReportStudentItem {
  student: {
    id: string
    fullName: string
  }
  days: WeeklyReportDayCell[]
  assignmentsDue: number
  assignmentsCompleted: number
  completionRate: number | null
  practiceAttempts: number
  practiceAccuracy: number | null
  mockAverageBand: number | null
}

export interface WeeklyReportResponse {
  class: {
    id: string
    name: string
    code: string
  }
  week: {
    from: string
    to: string
    timezone: string
  }
  students: WeeklyReportStudentItem[]
  totals: {
    students: number
    assignmentsDue: number
    assignmentsCompleted: number
    completionRate: number | null
  }
}
