import { describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import { getRegisteredStudentsApi } from "./users"

vi.mock("./client", () => ({
  apiClient: vi.fn(),
}))

const mockClient = vi.mocked(apiClient)

describe("getRegisteredStudentsApi", () => {
  it("gọi endpoint /api/users/students kèm bộ lọc và trả meta phân trang", async () => {
    mockClient.mockResolvedValueOnce({
      data: [
        {
          id: "s1",
          email: "an@example.com",
          fullName: "An",
          role: "student",
          status: "active",
          classes: [{ id: "c1", name: "IELTS 6.5", code: "ABC123" }],
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    const result = await getRegisteredStudentsApi({
      search: "an",
      unassigned: true,
      page: 2,
      limit: 20,
    })

    expect(mockClient).toHaveBeenCalledWith(
      "/api/users/students?search=an&unassigned=true&page=2&limit=20"
    )
    expect(result.items[0].classes[0].name).toBe("IELTS 6.5")
    expect(result.meta?.total).toBe(1)
  })

  it("không gửi unassigned khi tắt bộ lọc", async () => {
    mockClient.mockResolvedValueOnce({ data: [] })

    await getRegisteredStudentsApi({ unassigned: false })

    expect(mockClient).toHaveBeenCalledWith("/api/users/students")
  })
})
