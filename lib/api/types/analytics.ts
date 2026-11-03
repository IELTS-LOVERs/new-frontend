import type { SkillType } from "./common"

export interface ClassAnalytics {
  classId: string
  className: string
  studentsCount: number
  average: {
    listening?: number | null
    reading?: number | null
    writing?: number | null
    overall?: number | null
  }
  needSupport: Array<{ studentId: string; fullName: string; overall?: number | null }>
}

export interface ExamAnalytics {
  examId: string
  examTitle: string
  attemptCount: number
  averageBand: number
  bandDistribution: Array<{ band: string; count: number }>
  sectionAccuracy: Array<{ label: string; skill: SkillType; accuracy: number }>
  hardestQuestions: Array<{
    questionId: string
    prompt: string
    skill: SkillType
    part: number
    accuracy: number
    acceptedAnswer?: string
  }>
}

export interface StudentProgressAnalytics {
  studentId: string
  student: {
    id: string
    fullName: string
    email: string
  }
  targetBand: number | null
  latest: {
    listening?: number | null
    reading?: number | null
    writing?: number | null
    overall?: number | null
  }
  deltaFromTarget: number | null
  points: Array<{
    attemptId: string
    examId: string
    examTitle: string
    submittedAt: string
    listening?: number | null
    reading?: number | null
    writing?: number | null
    overall?: number | null
  }>
}
