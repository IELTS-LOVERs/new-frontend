import { describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import {
  addExamsToCollectionApi,
  createCollectionApi,
  deleteCollectionApi,
  getCollectionDetailApi,
  getCollectionsApi,
  removeExamFromCollectionApi,
  updateCollectionApi,
  updateExamInCollectionApi,
} from "./collections"

vi.mock("./client", () => ({
  apiClient: vi.fn(),
}))

const mockClient = vi.mocked(apiClient)

describe("Collections API Client", () => {
  it("getCollectionsApi constructs correct query string", async () => {
    mockClient.mockResolvedValueOnce({ data: [], meta: undefined })

    await getCollectionsApi({
      search: "Cambridge",
      category: "cambridge",
      page: 1,
      limit: 20,
    })

    expect(mockClient).toHaveBeenCalledWith(
      "/api/collections?search=Cambridge&category=cambridge&page=1&limit=20"
    )
  })

  it("getCollectionDetailApi calls GET /api/collections/:id", async () => {
    const mockDetail = { collection: { _id: "c1", name: "Cam 18" }, exams: [] }
    mockClient.mockResolvedValueOnce({ data: mockDetail })

    const result = await getCollectionDetailApi("c1")
    expect(mockClient).toHaveBeenCalledWith("/api/collections/c1")
    expect(result).toEqual(mockDetail)
  })

  it("createCollectionApi sends POST /api/collections", async () => {
    const mockCreated = { _id: "c1", name: "Cam 19", category: "cambridge" }
    mockClient.mockResolvedValueOnce({ data: mockCreated })

    const result = await createCollectionApi({
      name: "Cam 19",
      category: "cambridge",
    })

    expect(mockClient).toHaveBeenCalledWith("/api/collections", {
      method: "POST",
      body: JSON.stringify({ name: "Cam 19", category: "cambridge" }),
    })
    expect(result).toEqual(mockCreated)
  })

  it("updateCollectionApi sends PUT /api/collections/:id", async () => {
    const mockUpdated = { _id: "c1", name: "Cam 19 New", category: "cambridge" }
    mockClient.mockResolvedValueOnce({ data: mockUpdated })

    const result = await updateCollectionApi("c1", {
      name: "Cam 19 New",
    })

    expect(mockClient).toHaveBeenCalledWith("/api/collections/c1", {
      method: "PUT",
      body: JSON.stringify({ name: "Cam 19 New" }),
    })
    expect(result).toEqual(mockUpdated)
  })

  it("deleteCollectionApi sends DELETE /api/collections/:id", async () => {
    mockClient.mockResolvedValueOnce({ data: { id: "c1", message: "Deleted" } })

    const result = await deleteCollectionApi("c1")
    expect(mockClient).toHaveBeenCalledWith("/api/collections/c1", {
      method: "DELETE",
    })
    expect(result).toEqual({ id: "c1", message: "Deleted" })
  })

  it("addExamsToCollectionApi sends POST /api/collections/:id/exams", async () => {
    mockClient.mockResolvedValueOnce({ data: { count: 2, message: "Added" } })

    const result = await addExamsToCollectionApi("c1", {
      examIds: ["e1", "e2"],
      testNumber: 1,
      part: 1,
    })

    expect(mockClient).toHaveBeenCalledWith("/api/collections/c1/exams", {
      method: "POST",
      body: JSON.stringify({ examIds: ["e1", "e2"], testNumber: 1, part: 1 }),
    })
    expect(result.count).toBe(2)
  })

  it("removeExamFromCollectionApi sends DELETE /api/collections/:id/exams/:examId", async () => {
    mockClient.mockResolvedValueOnce({ data: { examId: "e1", message: "Removed" } })

    const result = await removeExamFromCollectionApi("c1", "e1")
    expect(mockClient).toHaveBeenCalledWith("/api/collections/c1/exams/e1", {
      method: "DELETE",
    })
    expect(result.examId).toBe("e1")
  })

  it("updateExamInCollectionApi sends PATCH /api/collections/:id/exams/:examId", async () => {
    mockClient.mockResolvedValueOnce({ data: { examId: "e1", message: "Updated" } })

    const result = await updateExamInCollectionApi("c1", "e1", {
      testNumber: 2,
      part: 3,
    })

    expect(mockClient).toHaveBeenCalledWith("/api/collections/c1/exams/e1", {
      method: "PATCH",
      body: JSON.stringify({ testNumber: 2, part: 3 }),
    })
    expect(result.examId).toBe("e1")
  })
})
