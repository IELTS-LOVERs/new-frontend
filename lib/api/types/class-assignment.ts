import type { SkillType } from "./common"
import type { ExamKind } from "./exam"
import type { AttemptScores, SubmissionStatus } from "./attempt"

export interface ClassSummary {
  id: string
  name: string
  code: string
  description?: string | null
  studentsCount: number
  teacherId?: string
  // REQ-003: backend bổ sung cho role student (GET /classes).
  teacher?: { id: string; fullName: string } | null
  assignmentsTotal?: number
  assignmentsSubmitted?: number
}

export interface ClassDetail extends ClassSummary {
  teacher?: { id: string; fullName: string }
  students: Array<{
    id: string
    email: string
    fullName: string
    targetBand?: number | null
  }>
}

export interface ClassRosterStudent {
  id: string
  fullName: string
  email: string
  targetBand?: number | null
  attemptsCount: number
  listening?: number | null
  reading?: number | null
  writing?: number | null
  overall?: number | null
}

export type AssignmentStatus = "active" | "archived"

export interface MyAssignment {
  id: string
  examId: string
  examTitle: string
  durationMinutes: number
  deadline: string | null
  submissionStatus: SubmissionStatus
  teacherName: string
  classId?: string | null
  className: string | null
  attemptId: string | null
  scores: AttemptScores | null
  examKind?: ExamKind
}

export interface AssignmentSummary {
  id: string
  examId: string
  examTitle: string
  skills: SkillType[]
  targetLabel: string
  classId?: string | null
  className?: string | null
  assignedAt: string
  deadline: string | null
  maxAttempts: number
  status: AssignmentStatus
  stats: { assigned: number; submitted: number; inProgress: number }
}

export interface AssignmentStudentProgress {
  studentId: string
  studentName: string
  studentEmail: string
  status: SubmissionStatus
  listening?: number | null
  reading?: number | null
  writing?: number | null
  overall?: number | null
  submittedAt?: string | null
  attemptId?: string | null
  needsCheck: boolean
}

export interface AssignmentProgress {
  id: string
  examId: string
  examTitle: string
  className: string | null
  deadline: string | null
  maxAttempts: number
  status: AssignmentStatus
  averageBand: number | null
  students: AssignmentStudentProgress[]
}
