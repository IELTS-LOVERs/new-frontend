export type UserRole = "student" | "teacher" | "admin"
export type UserStatus = "active" | "inactive" | "suspended"

export interface User {
  id: string
  email: string
  fullName: string
  phone?: string | null
  role: UserRole
  targetBand?: number | null
  status: UserStatus
  avatarMediaId?: string | null
  createdAt?: string
  updatedAt?: string
}

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

export type SkillType = "listening" | "reading" | "writing"

export type QuestionType =
  | "multiple_choice"
  | "multiple_choice_single"
  | "multiple_choice_multiple"
  | "form_completion"
  | "note_completion"
  | "table_completion"
  | "sentence_completion"
  | "matching"
  | "matching_headings"
  | "matching_information"
  | "matching_features"
  | "matching_sentence_endings"
  | "map_labelling"
  | "diagram_labelling"
  | "summary_completion"
  | "true_false_not_given"
  | "yes_no_not_given"
  | "short_answer"
  | "flow_chart_completion"
  | "writing_task_1"
  | "writing_task_2"

export type QuestionGroupType =
  | "multiple_choice_single"
  | "multiple_choice_multiple"
  | "true_false_not_given"
  | "yes_no_not_given"
  | "matching_headings"
  | "matching_information"
  | "matching_features"
  | "matching_sentence_endings"
  | "sentence_completion"
  | "note_completion"
  | "table_completion"
  | "summary_completion"
  | "summary_completion_options"
  | "form_completion"
  | "flow_chart_completion"
  | "map_labelling"
  | "diagram_labelling"
  | "short_answer"
  | "writing_task_1"
  | "writing_task_2"

export interface Question {
  id: string
  skill: SkillType
  type: QuestionType
  part: number
  prompt: string
  content?: string | null
  data?: Record<string, any>
  acceptedAnswers?: string[]
  points?: number
  explanation?: string | null
  mediaIds?: string[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface MediaItem {
  id: string
  url: string
  type: "audio" | "image"
  originalName?: string
  mimeType?: string
  size?: number
}

// === New: Question Group types for embedded exam questions ===

export interface QuestionItem {
  id: string
  questionNumber: number
  prompt: string
  acceptedAnswers?: string[]
  points?: number
  explanation?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
}

export interface QuestionGroupConfig {
  options?: Array<{ id: string; text: string }>
  maxSelections?: number
  headingsPool?: Array<{ id: string; text: string }>
  paragraphLabels?: string[]
  featuresPool?: Array<{ id: string; text: string }>
  endingsPool?: Array<{ id: string; text: string }>
  allowReuse?: boolean
  template?: string
  maxWords?: number
  allowNumbers?: boolean
  wordLimitText?: string
  optionsPool?: Array<{ id: string; text: string }>
  imageMediaId?: string
  labels?: Array<{ id: string; label: string; xPercent?: number; yPercent?: number }>
  minWords?: number
  sampleAnswer?: string
  bandDescriptors?: string
  topics?: Array<{ topicName: string; questions: string[] }>
  cueCard?: string
  bulletPoints?: string[]
  prepTimeSeconds?: number
  speakTimeSeconds?: number
  questions?: string[]
  [key: string]: unknown
}

export interface QuestionGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  config: QuestionGroupConfig
  /** Resolved group-level image (config.imageMediaId) with a presigned URL. */
  media?: MediaItem[]
  questions: QuestionItem[]
}

// === Question Bank (group-based) ===
// The bank stores reusable Question Groups (same shape as an exam section group,
// minus `questionNumber` which is assigned when the group is inserted into an exam).

export interface BankQuestionItem {
  id: string
  prompt: string
  acceptedAnswers?: string[]
  points?: number
  explanation?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
}

export interface BankQuestionGroup {
  id: string
  skill: SkillType
  part: number
  groupType: QuestionGroupType
  instructions: string
  config: QuestionGroupConfig
  questions: BankQuestionItem[]
  questionCount?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

// === Candidate types (student-facing, no answers) ===

export interface CandidateQuestionItem {
  id: string
  questionNumber: number
  prompt: string
  points?: number
  mediaIds?: string[]
  media?: MediaItem[]
}

export interface CandidateQuestionGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  config: QuestionGroupConfig
  /** Resolved group-level image (config.imageMediaId) with a presigned URL. */
  media?: MediaItem[]
  questions: CandidateQuestionItem[]
}

export interface CandidateSection {
  id?: string
  skill: SkillType
  part: number
  title: string
  instructions?: string | null
  passageText?: string | null
  transcript?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
  questionGroups?: CandidateQuestionGroup[]
}

export interface CandidateExam {
  id: string
  title: string
  description?: string | null
  durationMinutes: number
  sections: CandidateSection[]
}

export interface ExamListItem {
  id: string
  title: string
  durationMinutes: number
  status: "draft" | "published" | "closed"
  createdAt: string
  sectionsCount?: number
}

export type SubmissionStatus = "not_started" | "in_progress" | "submitted" | "expired"

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
}

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
}

export interface AttemptRecoveryResponse {
  attemptId: string
  status: "in_progress" | "submitted" | "expired"
  remainingSeconds: number
  answers: Array<{ questionId: string; value: string }>
  exam: CandidateExam
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
  studentAnswer: string
  acceptedAnswers: string[]
  isCorrect: boolean
  explanation?: string | null
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
}

export interface AntiCheatEvent {
  id?: string
  type:
    | "TAB_SWITCH"
    | "WINDOW_BLUR"
    | "FULLSCREEN_EXIT"
    | "RELOAD"
    | "COPY"
    | "PASTE"
    | "CUT"
    | "CONTEXT_MENU"
    | "INTERRUPTION"
  timestamp?: string
  metadata?: Record<string, any>
}

export interface StudentDashboardStats {
  assignedCount: number
  inProgressCount: number
  submittedCount: number
  averageBand: number
  recentAttempts: Array<{
    id: string
    examTitle: string
    submittedAt: string
    scores: AttemptScores
    status: SubmissionStatus
  }>
  upcomingAssignments: MyAssignment[]
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

export interface ExamSummary {
  id: string
  title: string
  description?: string | null
  durationMinutes: number
  status: "draft" | "published" | "closed"
  skills: SkillType[]
  questionCount: number
  assignmentCount: number
  openAt?: string | null
  closeAt?: string | null
  createdAt: string
  updatedAt?: string
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

export type AssignmentStatus = "active" | "archived"

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

export interface MediaAsset extends MediaItem {
  uploadedAt: string
  sizeLabel: string
  usageCount: number
  status: "ready" | "pending" | "failed"
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
  targetBand: number
  latest: {
    listening?: number | null
    reading?: number | null
    writing?: number | null
    overall?: number | null
  }
  deltaFromTarget: number
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
