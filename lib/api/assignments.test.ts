import { describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import { getAssignmentProgressApi } from "./assignments"

vi.mock("./client", () => ({
  apiClient: vi.fn(),
  downloadCsv: vi.fn(),
}))

const mockClient = vi.mocked(apiClient)

describe("getAssignmentProgressApi", () => {
  it("làm phẳng student lồng nhau + scores thành cột UI", async () => {
    mockClient.mockResolvedValueOnce({
      data: {
        assignment: {
          id: "a1",
          examTitle: "Mock 01",
          deadline: "2026-11-11T00:00:00.000Z",
          class: { id: "c1", name: "IELTS A", code: "ABC" },
        },
        overview: {
          totalStudents: 2,
          submittedCount: 1,
          inProgressCount: 0,
          notStartedCount: 1,
          averageBand: 7.5,
        },
        students: [
          {
            student: { id: "s1", fullName: "Nguyễn A", email: "a@test.com" },
            status: "submitted",
            scores: { listeningBand: 7, readingBand: 8, writingBand: 6.5, overallBand: 7.5 },
            submittedAt: "2026-10-01T00:00:00.000Z",
            suspicious: true,
          },
          {
            student: { id: "s2", fullName: "Trần B", email: "b@test.com" },
            status: "not_started",
          },
        ],
      },
    })

    const result = await getAssignmentProgressApi("a1")

    expect(result.examTitle).toBe("Mock 01")
    expect(result.className).toBe("IELTS A")
    expect(result.averageBand).toBe(7.5)
    expect(result.students).toHaveLength(2)
    expect(result.students[0]).toMatchObject({
      studentId: "s1",
      studentName: "Nguyễn A",
      studentEmail: "a@test.com",
      status: "submitted",
      listening: 7,
      reading: 8,
      writing: 6.5,
      overall: 7.5,
      needsCheck: true,
      attemptId: null,
    })
    expect(result.students[1]).toMatchObject({
      studentId: "s2",
      studentName: "Trần B",
      status: "not_started",
      listening: null,
      needsCheck: false,
    })
  })

  it("không crash khi thiếu dữ liệu", async () => {
    mockClient.mockResolvedValueOnce({ data: {} })
    const result = await getAssignmentProgressApi("a-x")
    expect(result.id).toBe("a-x")
    expect(result.averageBand).toBeNull()
    expect(result.students).toEqual([])
  })
})
