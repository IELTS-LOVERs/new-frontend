import type { APIRequestContext } from "@playwright/test"
import {
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
  /** id câu hỏi theo đúng thứ tự tạo (flatten theo section). */
  questionIds: string[]
}

const TEACHER = { email: "teacher@ielts.com", password: "Teacher@123" } as const

let seq = 0
/** Hậu tố duy nhất, an toàn cho cả email, tên lớp và tiêu đề đề. */
function uniqueSuffix(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

/**
 * Tạo mới hoàn toàn (độc lập, lặp lại được) một kịch bản gồm:
 * câu hỏi → đề → xuất bản → lớp → học sinh mới → giao bài.
 * Mọi test dùng hàm này thay vì dựa vào trạng thái seed có thể bị thay đổi.
 */
export async function createScenario(
  api: APIRequestContext,
  options: CreateScenarioOptions
): Promise<Scenario> {
  const suffix = uniqueSuffix("e2e")
  const teacher = await loginViaApi(api, TEACHER.email, TEACHER.password)

  // 1. Tạo câu hỏi, giữ id theo thứ tự section.
  const sectionQuestionIds: string[][] = []
  for (const section of options.sections) {
    const ids: string[] = []
    for (const q of section.questions) {
      const created = await apiPost(api, "/api/questions", teacher.token, {
        skill: q.skill,
        type: q.type,
        part: q.part,
        prompt: `${q.prompt} [${suffix}]`,
        data: q.data ?? {},
        acceptedAnswers: q.acceptedAnswers ?? [],
        points: 1,
      })
      ids.push(created.id)
    }
    sectionQuestionIds.push(ids)
  }

  // 2. Tạo đề nháp với các section tham chiếu câu hỏi.
  const examTitle = `${options.titlePrefix} ${suffix}`
  const exam = await apiPost(api, "/api/exams", teacher.token, {
    title: examTitle,
    description: "Đề E2E được tạo tự động cho kiểm thử nghiệm thu.",
    durationMinutes: options.durationMinutes ?? 60,
    sections: options.sections.map((section, index) => ({
      skill: section.skill,
      part: section.part,
      title: section.title,
      instructions: section.instructions ?? "",
      passageText: section.passageText ?? "",
      mediaIds: [],
      questionIds: sectionQuestionIds[index],
    })),
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

  return {
    teacher,
    student,
    classId: klass.id,
    className,
    examId: exam.id,
    examTitle,
    assignmentId: assignment.id,
    questionIds: sectionQuestionIds.flat(),
  }
}
