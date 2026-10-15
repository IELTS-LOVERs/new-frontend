import type { APIRequestContext } from "@playwright/test"
import {
  apiGet,
  apiPatch,
  apiPost,
  loginViaApi,
  registerStudentViaApi,
  type ApiSession,
} from "./api"

export type SkillType = "listening" | "reading" | "writing"

export interface QuestionSpec {
  skill: SkillType
  type: string
  part: number
  prompt: string
  data?: Record<string, unknown>
  acceptedAnswers?: string[]
}

export interface SectionSpec {
  skill: SkillType
  part: number
  title: string
  instructions?: string
  passageText?: string
  questions: QuestionSpec[]
}

export interface CreateScenarioOptions {
  /** Tiền tố tiêu đề đề thi, được nối thêm hậu tố duy nhất. */
  titlePrefix: string
  /** Tiền tố tên lớp, được nối thêm hậu tố duy nhất. */
  classPrefix?: string
  durationMinutes?: number
  sections: SectionSpec[]
}

export interface Scenario {
  teacher: ApiSession
  student: ApiSession
  classId: string
  className: string
  examId: string
  examTitle: string
  assignmentId: string
  /** id câu hỏi NHÚNG trong đề (theo thứ tự), dùng để trả lời. */
  questionIds: string[]
}

const TEACHER = { email: "teacher@ielts.com", password: "Teacher@123" } as const

/** Legacy flat question type → QuestionGroupType (chỉ 2 type cần remap). */
const LEGACY_TYPE_TO_GROUP: Record<string, string> = {
  multiple_choice: "multiple_choice_single",
  matching: "matching_headings",
}

function groupTypeFor(section: SectionSpec): string {
  const legacyType = section.questions[0]?.type ?? "short_answer"
  return LEGACY_TYPE_TO_GROUP[legacyType] ?? legacyType
}

let seq = 0
/** Hậu tố duy nhất, an toàn cho cả email, tên lớp và tiêu đề đề. */
function uniqueSuffix(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

/**
 * Tạo mới hoàn toàn (độc lập, lặp lại được) một kịch bản gồm:
 * nhóm câu hỏi → đề → xuất bản → lớp → học sinh mới → giao bài.
 * Mọi test dùng hàm này thay vì dựa vào trạng thái seed có thể bị thay đổi.
 */
export async function createScenario(
  api: APIRequestContext,
  options: CreateScenarioOptions
): Promise<Scenario> {
  const suffix = uniqueSuffix("e2e")
  const teacher = await loginViaApi(api, TEACHER.email, TEACHER.password)

  // 1. Tạo một Question Group cho mỗi section (mỗi nhóm chứa các câu của section).
  for (const section of options.sections) {
    await apiPost(api, "/api/questions", teacher.token, {
      skill: section.skill,
      part: section.part,
      groupType: groupTypeFor(section),
      instructions: section.instructions ?? "",
      config: section.questions[0]?.data ?? {},
      questions: section.questions.map((q) => ({
        prompt: `${q.prompt} [${suffix}]`,
        acceptedAnswers: q.acceptedAnswers ?? [],
        points: 1,
      })),
    })
  }

  // 2. Tạo đề nháp: mỗi section nhúng một bản sao Question Group.
  const examTitle = `${options.titlePrefix} ${suffix}`
  const exam = await apiPost(api, "/api/exams", teacher.token, {
    title: examTitle,
    description: "Đề E2E được tạo tự động cho kiểm thử nghiệm thu.",
    durationMinutes: options.durationMinutes ?? 60,
    sections: options.sections.map((section) => {
      let questionNumber = 1
      return {
        skill: section.skill,
        part: section.part,
        title: section.title,
        instructions: section.instructions ?? "",
        passageText: section.passageText ?? "",
        mediaIds: [],
        questionGroups: [
          {
            groupType: groupTypeFor(section),
            instructions: section.instructions ?? "",
            config: section.questions[0]?.data ?? {},
            questions: section.questions.map((q) => ({
              questionNumber: questionNumber++,
              prompt: `${q.prompt} [${suffix}]`,
              acceptedAnswers: q.acceptedAnswers ?? [],
              points: 1,
            })),
          },
        ],
      }
    }),
  })

  // 3. Xuất bản (yêu cầu đề có câu hỏi).
  await apiPatch(api, `/api/exams/${exam.id}/publish`, teacher.token)

  // 4. Tạo lớp và học sinh mới.
  const className = `${options.classPrefix ?? "E2E Class"} ${suffix}`
  const klass = await apiPost(api, "/api/classes", teacher.token, {
    name: className,
    description: "Lớp E2E dùng một lần.",
  })

  const studentEmail = `${suffix}@e2e.test`
  const student = await registerStudentViaApi(api, studentEmail, "Student@123", `E2E Student ${suffix}`)
  await apiPost(api, `/api/classes/${klass.id}/students`, teacher.token, { email: studentEmail })

  // 5. Giao bài cho lớp với hạn xa trong tương lai.
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const assignment = await apiPost(api, "/api/assignments", teacher.token, {
    examId: exam.id,
    classId: klass.id,
    deadline,
    maxAttempts: 1,
    shuffleQuestions: false,
    showScoreAfterSubmit: true,
  })

  // 6. Đọc lại đề để lấy id câu hỏi đã nhúng (bản sao trong đề, không phải id bank).
  const detail = await apiGet(api, `/api/exams/${exam.id}`, teacher.token)
  const questionIds: string[] = ((detail?.sections ?? []) as Array<{
    questionGroups?: Array<{ questions?: Array<{ id: string }> }>
  }>).flatMap((s) =>
    (s.questionGroups ?? []).flatMap((g) => (g.questions ?? []).map((q) => q.id))
  )

  return {
    teacher,
    student,
    classId: klass.id,
    className,
    examId: exam.id,
    examTitle,
    assignmentId: assignment.id,
    questionIds,
  }
}
