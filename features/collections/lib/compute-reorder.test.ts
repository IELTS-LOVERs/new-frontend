import { describe, expect, it } from "vitest"
import { computeReorder } from "./compute-reorder"

describe("computeReorder", () => {
  it("reorders items within the same test", () => {
    const items = [
      { _id: "ex1", curriculum: { testNumber: 1, orderIndex: 0 } },
      { _id: "ex2", curriculum: { testNumber: 1, orderIndex: 1 } },
      { _id: "ex3", curriculum: { testNumber: 1, orderIndex: 2 } },
    ]

    // Drag ex3 and drop on ex1
    const res = computeReorder(items, "ex3", "ex1")
    expect(res).toEqual([
      { examId: "ex3", testNumber: 1, orderIndex: 0 },
      { examId: "ex1", testNumber: 1, orderIndex: 1 },
      { examId: "ex2", testNumber: 1, orderIndex: 2 },
    ])
  })

  it("moves item to a different test and reindexes both", () => {
    const items = [
      { _id: "ex1", curriculum: { testNumber: 1, orderIndex: 0 } },
      { _id: "ex2", curriculum: { testNumber: 2, orderIndex: 0 } },
    ]

    // Drag ex1 into test 2
    const res = computeReorder(items, "ex1", "ex2", 2)
    expect(res).toEqual([
      { examId: "ex1", testNumber: 2, orderIndex: 0 },
      { examId: "ex2", testNumber: 2, orderIndex: 1 },
    ])
  })
})
