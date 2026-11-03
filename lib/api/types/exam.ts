import type { MediaItem, RichDoc, SkillType } from "./common"

export type ExamKind = "practice" | "mock"
export type ExamScoringMode = "band" | "raw"
export type BandConversionMode = "auto" | "custom"
export type ReadingTrainingType = "academic" | "general"

export interface BandThreshold {
  minRaw: number
  band: number
}

export interface BandConversion {
  mode: BandConversionMode
  readingType: ReadingTrainingType
  listeningThresholds?: BandThreshold[]
  readingThresholds?: BandThreshold[]
}

export interface IExamCurriculum {
  collectionName?: string | null
  testNumber?: number | null
  part?: number | null
  orderIndex?: number | null
}

export interface IExamVocabularyItem {
  _id?: string
  word: string
  phonetic?: string
  meaning: string
  contextSentence?: string
}

export interface IExamPostSubmissionResources {
  solutionVideoUrl?: string | null
  solutionDocumentUrl?: string | null
  solutionNotes?: string | null
  vocabularyItems?: IExamVocabularyItem[]
}

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

export interface QuestionItem {
  id: string
  questionNumber: number
  prompt: string
  promptDoc?: RichDoc | null
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
  /** #14: when false, a summary answer can only be chosen once. */
  allowChangeAnswer?: boolean
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
  /** Rich-text JSON for the group instructions. */
  instructionsDoc?: RichDoc | null
  config: QuestionGroupConfig
  /** Resolved group-level image (config.imageMediaId) with a presigned URL. */
  media?: MediaItem[]
  questions: QuestionItem[]
}

export interface BankQuestionItem {
  id: string
  prompt: string
  promptDoc?: RichDoc | null
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
  instructionsDoc?: RichDoc | null
  config: QuestionGroupConfig
  questions: BankQuestionItem[]
  questionCount?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CandidateQuestionItem {
  id: string
  questionNumber: number
  prompt: string
  promptDoc?: RichDoc | null
  points?: number
  mediaIds?: string[]
  media?: MediaItem[]
}

export interface CandidateQuestionGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  instructionsDoc?: RichDoc | null
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
  instructionsDoc?: RichDoc | null
  passageText?: string | null
  passageDoc?: RichDoc | null
  transcript?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
  questionGroups?: CandidateQuestionGroup[]
}

export interface CandidateExam {
  id: string
  title: string
  description?: string | null
  bannerUrl?: string | null
  durationMinutes: number
  kind?: ExamKind
  scoringMode?: ExamScoringMode
  bandConversion?: BandConversion
  disableTextSelection?: boolean
  curriculum?: IExamCurriculum
  sections: CandidateSection[]
}

export interface ExamListItem {
  id: string
  title: string
  bannerUrl?: string | null
  durationMinutes: number
  status: "draft" | "published" | "closed"
  createdAt: string
  sectionsCount?: number
  /** Distinct skills in the exam's sections, e.g. ["listening", "reading"]. */
  skills?: SkillType[]
  kind?: ExamKind
  scoringMode?: ExamScoringMode
  bandConversion?: BandConversion
  curriculum?: IExamCurriculum
  /** Teacher view: true when at least one student has attempted this exam. */
  hasAttempts?: boolean
  /** Teacher view: true when the exam is assigned to at least one class. */
  hasAssignments?: boolean
  /** Total attempts ever started (teacher view). */
  attemptsCount?: number
  /** Attempts currently in progress (teacher view). */
  activeAttemptsCount?: number
  /** Bumped when candidate-visible content changes. */
  contentRevision?: number
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
  /** Teacher view: true when at least one student has attempted this exam. */
  hasAttempts?: boolean
  /** Teacher view: true when the exam is assigned to at least one class. */
  hasAssignments?: boolean
  /** Total attempts ever started (teacher view). */
  attemptsCount?: number
  /** Attempts currently in progress (teacher view). */
  activeAttemptsCount?: number
  /** Bumped when candidate-visible content changes. */
  contentRevision?: number
}

export interface BuilderQuestionItem {
  id: string
  questionNumber: number
  prompt: string
  promptDoc?: RichDoc | null
  acceptedAnswers?: string[]
  points?: number
  explanation?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
}

export interface BuilderQuestionGroup {
  id: string
  groupType: QuestionGroupType
  instructions: string
  instructionsDoc?: RichDoc | null
  config: QuestionGroupConfig
  media?: MediaItem[]
  questions: BuilderQuestionItem[]
}

export interface BuilderSection {
  id?: string
  skill: SkillType
  part: number
  title: string
  instructions?: string | null
  instructionsDoc?: RichDoc | null
  passageText?: string | null
  passageDoc?: RichDoc | null
  transcript?: string | null
  mediaIds?: string[]
  media?: MediaItem[]
  questionGroups?: BuilderQuestionGroup[]
}

export interface BuilderExam {
  id: string
  title: string
  description?: string | null
  bannerUrl?: string | null
  status: "draft" | "published" | "closed"
  kind?: ExamKind
  scoringMode?: ExamScoringMode
  bandConversion?: BandConversion
  curriculum?: IExamCurriculum
  postSubmissionResources?: IExamPostSubmissionResources | null
  sections: BuilderSection[]
  durationMinutes: number
  price?: number
  allowedAttempts?: number
  shuffleQuestions?: boolean
  showScoreAfterSubmit?: boolean
  openAt?: string | null
  closeAt?: string | null
  disableTextSelection?: boolean
  allowChangeAnswer?: boolean
  collectionId?: string | null
  createdAt?: string
  updatedAt?: string
}

