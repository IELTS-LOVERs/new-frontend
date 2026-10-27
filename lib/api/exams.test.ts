import { describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import { deleteExamApi } from "./exams"

vi.mock("./client", () => ({
  apiClient: vi.fn(),
  downloadCsv: vi.fn(),
}))

const mockClient = vi.mocked(apiClient)

describe("deleteExamApi", () => {
  it("gọi DELETE thường và trả về số bài tập đã xoá kèm", async () => {
    mockClient.mockResolvedValueOnce({
      data: { message: "Xóa đề thi thành công", deletedAssignments: 2, deletedAttempts: 0 },
    })

    const result = await deleteExamApi("e1")

    expect(mockClient).toHaveBeenCalledWith("/api/exams/e1", { method: "DELETE" })
    expect(result).toEqual({
      message: "Xóa đề thi thành công",
      deletedAssignments: 2,
      deletedAttempts: 0,
    })
  })

  it("thêm ?force=true khi admin xoá cứng", async () => {
    mockClient.mockResolvedValueOnce({
      data: { message: "Xóa đề thi thành công", deletedAssignments: 1, deletedAttempts: 3 },
    })

    const result = await deleteExamApi("e1", { force: true })

    expect(mockClient).toHaveBeenCalledWith("/api/exams/e1?force=true", {
      method: "DELETE",
    })
    expect(result.deletedAttempts).toBe(3)
  })
})
