import type { SkillType } from "./common"
import type { CandidateExam, ExamKind, ExamScoringMode, IExamPostSubmissionResources } from "./exam"

export type SubmissionStatus = "not_started" | "in_progress" | "submitted" | "expired"

export interface AttemptScores {
  listeningRaw?: number
  listeningBand?: number
  readingRaw?: number
  readingBand?: number
  writingTask1Band?: number
  writingTask2Band?: number
  writingBand?: number
  overallBand?: number
}

export interface StartAttemptResponse {
  attemptId: string
  examId: string
  startedAt: string
  expiresAt: string
  remainingSeconds: number
  status: "in_progress"
  exam: CandidateExam
  /** Content revision of the exam when this attempt was started/resumed. */
  revision: number
}

export interface AttemptRecoveryResponse {
  attemptId: string
  status: "in_progress" | "submitted" | "expired"
  remainingSeconds: number
  answers: Array<{ questionId: string; value: string }>
  exam: CandidateExam
  /** Current content revision of the exam. */
  revision: number
}

/** Lightweight poll response used while the student is taking the exam. */
export interface AttemptRevisionResponse {
  revision: number
  status: "in_progress" | "submitted" | "expired"
  remainingSeconds: number
}

/** Full exam content response used after a revision change. */
export interface AttemptExamResponse {
  exam: CandidateExam
  revision: number
  remainingSeconds: number
  updatedAt: string
}

export interface WritingReview {
  id: string
  attemptId: string
  task1?: { score: number; comment?: string | null }
  task2?: { score: number; comment?: string | null }
  overallWritingScore: number
  generalFeedback?: string | null
  teacherId?: string
  createdAt: string
  updatedAt: string
}

export interface AttemptResultDetail {
  questionId: string
  questionNumber?: number
  groupType?: string
  /** Skill of the question; Writing is teacher-graded and has no answer key. */
  skill?: SkillType
  studentAnswer: string
  acceptedAnswers: string[]
  isCorrect: boolean
  explanation?: string | null
  /** Maximum points of the question at snapshot time. */
  points?: number
  /** Question prompt frozen at submit time (survives later exam edits). */
  prompt?: string
}

export interface AttemptResult {
  attemptId: string
  examId?: string
  examTitle?: string
  examDurationMinutes?: number
  studentName?: string
  studentEmail?: string
  status: "submitted" | "expired"
  startedAt?: string
  submittedAt?: string
  durationSeconds?: number
  scores: AttemptScores
  writingReview?: WritingReview | null
  details: AttemptResultDetail[]
  examKind?: ExamKind
  scoreMode?: ExamScoringMode
  questionCount?: number
  totalPoints?: number
  rawScore?: number
  percentage?: number
  correctCount?: number
  wrongCount?: number
  blankCount?: number
  postSubmissionResources?: IExamPostSubmissionResources | null
  assignmentId?: string | null
  maxAttempts?: number | null
  attemptsUsed?: number
  canRetake?: boolean
}

export interface StudentDashboardStats {
  assignedCount: number
  inProgressCount: number
  submittedCount: number
  averageBand: number
  recentAttempts: Array<{
    id: string
    examTitle?: string
    exam?: { id?: string; title?: string; kind?: "practice" | "mock" }
    submittedAt: string | null
    scores: AttemptScores
    status: SubmissionStatus
    examKind?: "practice" | "mock"
    scoringMode?: "band" | "raw"
    totalPoints?: number
    rawScore?: number
    percentage?: number
    correctCount?: number
    wrongCount?: number
    blankCount?: number
  }>
  upcomingAssignments: Array<{
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
  }>
}

export interface TeacherDashboardStats {
  totalClasses: number
  totalStudents: number
  pendingGradingCount: number
  averageScore: number
  recentSubmissions: Array<{
    attemptId: string
    studentId: string
    studentName: string
    examTitle: string
    submittedAt: string
    overallBand: number
    suspicious: boolean
  }>
}

export interface PendingWritingSubmission {
  attemptId: string
  studentName: string
  studentEmail: string
  examTitle: string
  submittedAt: string
  hasSuspiciousActivity: boolean
}

export interface WritingTaskGradingView {
  task: 1 | 2
  prompt: string
  studentContent: string
  wordCount: number
}

export interface AttemptGradingView {
  attemptId: string
  student: { id: string; fullName: string }
  writingTasks: WritingTaskGradingView[]
}
