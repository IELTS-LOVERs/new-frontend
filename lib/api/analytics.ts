import { apiClient } from "./client"
import type { ExamAnalytics, ClassAnalytics, SkillType, StudentProgressAnalytics } from "./types"

export async function getStudentProgressApi(studentId?: string): Promise<StudentProgressAnalytics> {
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""
  const { data } = await apiClient<StudentProgressAnalytics>(`/api/analytics/student/progress${qs}`)
  return data
}

// ─── Adapter: hình dạng backend → type UI ───────────────────────────────────
// Backend trả { class, totalStudents, classAverages, students[] }, UI cần
// { classId, className, studentsCount, average, needSupport }.
interface RawClassAnalytics {
  class?: { id?: string; name?: string; code?: string }
  totalStudents?: number
  classAverages?: {
    listening?: number | null
    reading?: number | null
    writing?: number | null
    overall?: number | null
  }
  students?: Array<{
    student?: { id?: string; fullName?: string; email?: string }
    overall?: number | null
  }>
}

export async function getClassAnalyticsApi(classId: string): Promise<ClassAnalytics> {
  const { data } = await apiClient<RawClassAnalytics>(`/api/analytics/classes/${classId}`)

  const averages = data?.classAverages ?? {}
  const students = data?.students ?? []
  const classOverall = averages.overall ?? null

  // "Cần hỗ trợ": học sinh có Overall dưới trung bình lớp (chưa có targetBand cấp lớp).
  const needSupport = students
    .filter(
      (s): s is { student?: { id?: string; fullName?: string }; overall?: number | null } & {
        overall: number
      } => typeof s.overall === "number"
    )
    .filter((s) => classOverall === null || s.overall < classOverall)
    .map((s) => ({
      studentId: s.student?.id ?? "",
      fullName: s.student?.fullName ?? "",
      overall: s.overall,
    }))
    .sort((a, b) => a.overall - b.overall)

  return {
    classId: data?.class?.id ?? classId,
    className: data?.class?.name ?? "",
    studentsCount: data?.totalStudents ?? students.length,
    average: {
      listening: averages.listening ?? null,
      reading: averages.reading ?? null,
      writing: averages.writing ?? null,
      overall: classOverall,
    },
    needSupport,
  }
}

// Backend trả { exam, totalAttempts, averageOverallBand, sections, bandDistribution,
// hardestQuestions } với accuracy là TỈ LỆ 0..1; UI cần percent + đổi tên field.
interface RawExamAnalytics {
  exam?: { id?: string; title?: string }
  totalAttempts?: number
  averageOverallBand?: number | null
  sections?: Array<{ title?: string; skill?: SkillType; accuracy?: number }>
  bandDistribution?: Array<{ band?: number; count?: number }>
  hardestQuestions?: Array<{
    questionId?: string
    prompt?: string
    skill?: SkillType
    part?: number
    accuracy?: number
    acceptedAnswer?: string
  }>
}

const toPercent = (value?: number): number => Math.round((value ?? 0) * 100)

export async function getExamAnalyticsApi(examId: string): Promise<ExamAnalytics> {
  const { data } = await apiClient<RawExamAnalytics>(`/api/analytics/exams/${examId}`)

  return {
    examId: data?.exam?.id ?? examId,
    examTitle: data?.exam?.title ?? "",
    attemptCount: data?.totalAttempts ?? 0,
    averageBand: data?.averageOverallBand ?? 0,
    bandDistribution: (data?.bandDistribution ?? []).map((bucket) => ({
      band: String(bucket.band ?? ""),
      count: bucket.count ?? 0,
    })),
    sectionAccuracy: (data?.sections ?? []).map((section) => ({
      label: section.title ?? "",
      skill: (section.skill ?? "listening") as SkillType,
      accuracy: toPercent(section.accuracy),
    })),
    hardestQuestions: (data?.hardestQuestions ?? []).map((question) => ({
      questionId: question.questionId ?? "",
      prompt: question.prompt ?? "",
      skill: (question.skill ?? "listening") as SkillType,
      part: question.part ?? 1,
      accuracy: toPercent(question.accuracy),
      acceptedAnswer: question.acceptedAnswer,
    })),
  }
}
