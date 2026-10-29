import { describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import { deleteExamApi, getExamsApi } from "./exams"

vi.mock("./client", () => ({
  apiClient: vi.fn(),
  downloadCsv: vi.fn(),
}))

const mockClient = vi.mocked(apiClient)

describe("getExamsApi", () => {
  it("gửi kèm skill, collectionName, search và sort", async () => {
    mockClient.mockResolvedValueOnce({ data: [], meta: undefined })

    await getExamsApi({
      kind: "practice",
      skill: "reading",
      collectionName: "Cambridge",
      search: "cam 8",
      sort: "title_asc",
      page: 2,
      limit: 20,
    })

    expect(mockClient).toHaveBeenCalledWith(
      "/api/exams?kind=practice&skill=reading&collectionName=Cambridge&search=cam+8&sort=title_asc&page=2&limit=20"
    )
  })
})

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
