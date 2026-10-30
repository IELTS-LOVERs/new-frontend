export interface ExamSortableItem {
  _id: string
  curriculum?: {
    testNumber?: number | null
    part?: number | null
    orderIndex?: number | null
  } | null
}

export interface ReorderResultItem {
  examId: string
  testNumber: number
  orderIndex: number
}

/**
 * Tính toán mảng orderIndex và testNumber mới khi kéo thả 1 bài thi
 * @param items Danh sách tất cả bài thi trong collection hiện tại
 * @param activeId ID của bài thi đang được kéo
 * @param overId ID của bài thi đích được thả lên (hoặc thả vào container test)
 * @param targetTest Số test đích (nếu chuyển qua test khác)
 */
export function computeReorder(
  items: ExamSortableItem[],
  activeId: string,
  overId: string,
  targetTest?: number
): ReorderResultItem[] {
  const activeItem = items.find((it) => it._id === activeId)
  if (!activeItem) return []

  const currentTest = activeItem.curriculum?.testNumber ?? 1
  const finalTest = targetTest !== undefined ? targetTest : (items.find((it) => it._id === overId)?.curriculum?.testNumber ?? currentTest)

  // Gom theo test
  const testItems = items.filter((it) => (it.curriculum?.testNumber ?? 1) === finalTest)

  // Sắp xếp các item của finalTest trước khi chèn
  const sortedTestItems = testItems.filter((it) => it._id !== activeId).sort((a, b) => {
    const oA = a.curriculum?.orderIndex ?? 0
    const oB = b.curriculum?.orderIndex ?? 0
    return oA - oB
  })

  // Tìm index của overId trong danh sách đích
  const overIndex = sortedTestItems.findIndex((it) => it._id === overId)
  const insertIndex = overIndex >= 0 ? overIndex : sortedTestItems.length

  sortedTestItems.splice(insertIndex, 0, {
    ...activeItem,
    curriculum: {
      ...activeItem.curriculum,
      testNumber: finalTest,
    },
  })

  // Đánh lại orderIndex 0..n-1
  const results: ReorderResultItem[] = sortedTestItems.map((item, index) => ({
    examId: item._id,
    testNumber: finalTest,
    orderIndex: index,
  }))

  return results
}
