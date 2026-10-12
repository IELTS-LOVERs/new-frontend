import { describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import { getClassAnalyticsApi, getExamAnalyticsApi } from "./analytics"

vi.mock("./client", () => ({
  apiClient: vi.fn(),
}))

const mockClient = vi.mocked(apiClient)

describe("getClassAnalyticsApi", () => {
  it("ánh xạ classAverages + dựng needSupport cho điểm dưới trung bình lớp", async () => {
    mockClient.mockResolvedValueOnce({
      data: {
        class: { id: "c1", name: "IELTS A", code: "ABC" },
        totalStudents: 3,
        classAverages: { listening: 6.5, reading: 6.0, writing: null, overall: 6.2 },
        students: [
          { student: { id: "s1", fullName: "A" }, overall: 5.5 },
          { student: { id: "s2", fullName: "B" }, overall: 7.0 },
          { student: { id: "s3", fullName: "C" }, overall: null },
        ],
      },
    })

    const result = await getClassAnalyticsApi("c1")

    expect(result.classId).toBe("c1")
    expect(result.className).toBe("IELTS A")
    expect(result.studentsCount).toBe(3)
    expect(result.average).toEqual({
      listening: 6.5,
      reading: 6.0,
      writing: null,
      overall: 6.2,
    })
    expect(result.needSupport).toEqual([
      { studentId: "s1", fullName: "A", overall: 5.5 },
    ])
  })

  it("không crash khi thiếu average (dữ liệu rỗng)", async () => {
    mockClient.mockResolvedValueOnce({ data: {} })
    const result = await getClassAnalyticsApi("c-empty")
    expect(result.average).toEqual({
      listening: null,
      reading: null,
      writing: null,
      overall: null,
    })
    expect(result.needSupport).toEqual([])
  })
})

describe("getExamAnalyticsApi", () => {
  it("đổi accuracy 0..1 sang percent và band number sang string", async () => {
    mockClient.mockResolvedValueOnce({
      data: {
        exam: { id: "e1", title: "Mock 01" },
        totalAttempts: 4,
        averageOverallBand: 6.25,
        sections: [{ title: "Listening Part 1", skill: "listening", accuracy: 0.84 }],
        bandDistribution: [{ band: 6.5, count: 3 }],
        hardestQuestions: [
          {
            questionId: "q1",
            prompt: "Q?",
            skill: "reading",
            part: 2,
            accuracy: 0.32,
          },
        ],
      },
    })

    const result = await getExamAnalyticsApi("e1")

    expect(result.examId).toBe("e1")
    expect(result.attemptCount).toBe(4)
    expect(result.averageBand).toBe(6.25)
    expect(result.bandDistribution).toEqual([{ band: "6.5", count: 3 }])
    expect(result.sectionAccuracy).toEqual([
      { label: "Listening Part 1", skill: "listening", accuracy: 84 },
    ])
    expect(result.hardestQuestions[0]).toMatchObject({
      questionId: "q1",
      skill: "reading",
      part: 2,
      accuracy: 32,
    })
  })
})
