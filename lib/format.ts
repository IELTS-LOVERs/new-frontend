import { format, formatDistanceToNow, isValid, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import type { QuestionType, QuestionGroupType, SkillType } from "@/lib/api/types"

export function formatBand(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return value.toFixed(1)
}

export function toDate(value?: string | null): Date | null {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

export function formatDate(value?: string | null): string {
  const date = toDate(value)
  return date ? format(date, "dd/MM/yyyy HH:mm", { locale: vi }) : "—"
}

export function formatDateShort(value?: string | null): string {
  const date = toDate(value)
  return date ? format(date, "dd/MM/yyyy", { locale: vi }) : "—"
}

export function formatRelative(value?: string | null): string {
  const date = toDate(value)
  if (!date) return "—"
  return formatDistanceToNow(date, { addSuffix: true, locale: vi })
}

export function deadlineLabel(value?: string | null): string {
  const date = toDate(value)
  if (!date) return "Không giới hạn"
  const diff = date.getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (diff < 0) return `Quá hạn ${formatDistanceToNow(date, { locale: vi })}`
  if (days <= 1) return `Còn dưới 1 ngày`
  return `Còn ${days} ngày`
}

export function isDeadlineSoon(value?: string | null): boolean {
  const date = toDate(value)
  if (!date) return false
  const diff = date.getTime() - Date.now()
  return diff >= 0 && diff < 1000 * 60 * 60 * 24
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h >= 5 && h < 11) return "Chào buổi sáng"
  if (h >= 11 && h < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const SKILL_LABEL: Record<SkillType, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
}

export const SKILL_COLOR_VAR: Record<SkillType, string> = {
  listening: "var(--chart-1)",
  reading: "var(--chart-2)",
  writing: "var(--chart-3)",
  speaking: "var(--chart-4)",
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  multiple_choice_single: "Multiple choice (chọn 1)",
  multiple_choice_multiple: "Multiple choice (chọn nhiều)",
  form_completion: "Form completion",
  note_completion: "Note completion",
  table_completion: "Table completion",
  sentence_completion: "Sentence completion",
  matching: "Matching",
  map_labelling: "Map labelling",
  diagram_labelling: "Diagram labelling",
  matching_headings: "Matching headings",
  matching_information: "Matching information",
  matching_features: "Matching features",
  matching_sentence_endings: "Matching sentence endings",
  summary_completion: "Summary completion",
  true_false_not_given: "True / False / Not Given",
  yes_no_not_given: "Yes / No / Not Given",
  short_answer: "Short-answer questions",
  flow_chart_completion: "Flow-chart completion",
  writing_task_1: "Writing Task 1",
  writing_task_2: "Writing Task 2",
}

export const QUESTION_GROUP_TYPE_LABEL: Record<QuestionGroupType, string> = {
  multiple_choice_single: "Multiple choice (chọn 1)",
  multiple_choice_multiple: "Multiple choice (chọn nhiều)",
  true_false_not_given: "True / False / Not Given",
  yes_no_not_given: "Yes / No / Not Given",
  matching_headings: "Matching headings",
  matching_information: "Matching information",
  matching_features: "Matching features",
  matching_sentence_endings: "Matching sentence endings",
  sentence_completion: "Sentence completion",
  note_completion: "Note completion",
  table_completion: "Table completion",
  summary_completion: "Summary completion",
  summary_completion_options: "Summary completion (danh sách)",
  form_completion: "Form completion",
  flow_chart_completion: "Flow-chart completion",
  map_labelling: "Map labelling",
  diagram_labelling: "Diagram labelling",
  short_answer: "Short-answer questions",
  writing_task_1: "Writing Task 1",
  writing_task_2: "Writing Task 2",
  speaking_part_1: "Speaking Part 1",
  speaking_part_2: "Speaking Part 2",
  speaking_part_3: "Speaking Part 3",
}

export const QUESTION_GROUP_CATEGORIES: Array<{
  label: string
  emoji: string
  types: QuestionGroupType[]
}> = [
  {
    label: "Lựa chọn",
    emoji: "📝",
    types: ["multiple_choice_single", "multiple_choice_multiple"],
  },
  {
    label: "Xác định thông tin",
    emoji: "✅",
    types: ["true_false_not_given", "yes_no_not_given"],
  },
  {
    label: "Nối ghép",
    emoji: "🔗",
    types: [
      "matching_headings",
      "matching_information",
      "matching_features",
      "matching_sentence_endings",
    ],
  },
  {
    label: "Điền từ",
    emoji: "✏️",
    types: [
      "sentence_completion",
      "note_completion",
      "table_completion",
      "summary_completion",
      "summary_completion_options",
      "form_completion",
      "flow_chart_completion",
    ],
  },
  {
    label: "Gán nhãn",
    emoji: "🖼️",
    types: ["map_labelling", "diagram_labelling"],
  },
  {
    label: "Trả lời ngắn",
    emoji: "💬",
    types: ["short_answer"],
  },
]

export const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

/** Get default instructions text for a question group type */
export function defaultGroupInstructions(groupType: QuestionGroupType): string {
  const MAP: Record<string, string> = {
    multiple_choice_single: "Choose the correct letter, A, B, C or D.",
    multiple_choice_multiple: "Choose the correct letters.",
    true_false_not_given:
      "Do the following statements agree with the information given in the reading passage?\nWrite TRUE, FALSE or NOT GIVEN.",
    yes_no_not_given:
      "Do the following statements agree with the views of the writer?\nWrite YES, NO or NOT GIVEN.",
    matching_headings: "Choose the correct heading for each section from the list of headings below.",
    matching_information: "Which paragraph contains the following information?",
    matching_features: "Look at the following statements and the list of people/features below.",
    matching_sentence_endings: "Complete each sentence with the correct ending, A–G, below.",
    sentence_completion: "Complete the sentences below.\nWrite NO MORE THAN TWO WORDS for each answer.",
    note_completion: "Complete the notes below.\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    table_completion: "Complete the table below.\nWrite NO MORE THAN TWO WORDS for each answer.",
    summary_completion: "Complete the summary below.\nWrite NO MORE THAN TWO WORDS for each answer.",
    summary_completion_options: "Complete the summary using the list of words, A–K, below.",
    form_completion: "Complete the form below.\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    flow_chart_completion: "Complete the flow-chart below.\nWrite NO MORE THAN TWO WORDS for each answer.",
    map_labelling: "Label the map/plan below.\nChoose the correct letter, A–H.",
    diagram_labelling: "Label the diagram below.\nWrite NO MORE THAN TWO WORDS for each answer.",
    short_answer: "Answer the questions below.\nWrite NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
    writing_task_1: "",
    writing_task_2: "",
    speaking_part_1: "",
    speaking_part_2: "",
    speaking_part_3: "",
  }
  return MAP[groupType] ?? ""
}

/** Get default config for a question group type */
export function defaultGroupConfig(groupType: QuestionGroupType): Record<string, unknown> {
  switch (groupType) {
    case "multiple_choice_single":
      return {
        options: [
          { id: "A", text: "" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
      }
    case "multiple_choice_multiple":
      return {
        options: [
          { id: "A", text: "" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
          { id: "E", text: "" },
        ],
        maxSelections: 2,
      }
    case "true_false_not_given":
      return {
        options: [
          { id: "TRUE", text: "TRUE" },
          { id: "FALSE", text: "FALSE" },
          { id: "NOT GIVEN", text: "NOT GIVEN" },
        ],
      }
    case "yes_no_not_given":
      return {
        options: [
          { id: "YES", text: "YES" },
          { id: "NO", text: "NO" },
          { id: "NOT GIVEN", text: "NOT GIVEN" },
        ],
      }
    case "matching_headings":
      return { headingsPool: [], allowReuse: false }
    case "matching_information":
      return { paragraphLabels: ["A", "B", "C", "D", "E", "F", "G"], allowReuse: true }
    case "matching_features":
      return { featuresPool: [], allowReuse: true }
    case "matching_sentence_endings":
      return { endingsPool: [], allowReuse: false }
    case "sentence_completion":
    case "note_completion":
    case "table_completion":
    case "summary_completion":
    case "form_completion":
    case "flow_chart_completion":
      return { maxWords: 2, allowNumbers: true, template: "" }
    case "summary_completion_options":
      return { maxWords: 1, template: "", optionsPool: [] }
    case "map_labelling":
    case "diagram_labelling":
      return { labels: [] }
    case "short_answer":
      return { maxWords: 3, allowNumbers: true }
    case "writing_task_1":
      return { minWords: 150 }
    case "writing_task_2":
      return { minWords: 250 }
    default:
      return {}
  }
}
