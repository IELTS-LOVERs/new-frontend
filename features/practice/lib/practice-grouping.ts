import type { IExamCurriculum, CollectionTreeNode } from "@/lib/api/types"

/**
 * Phân nhóm & sắp xếp bài luyện tập dùng chung cho trang Giáo viên và Học sinh.
 *
 * Nhóm bộ đề được suy ra từ Tree lookup (ưu tiên cao nhất) hoặc regex trên tiêu đề
 * / curriculum (fallback an toàn cho dữ liệu cũ).
 */

export interface PracticeGroupableItem {
  title: string
  createdAt?: string | Date | null
  curriculum?: Pick<IExamCurriculum, "collectionName" | "testNumber" | "part" | "orderIndex"> | null
}

export interface PracticeBookGroup {
  /** "cambridge" | "vol" | "road_to_ielts" | "other" | "custom:<tên>" */
  key: string
  /** Nhãn hiển thị của nhóm lớn, ví dụ "Cambridge", "Vol", "Bộ đề khác". */
  label: string
  /** Quyển con, ví dụ "Cambridge 8", "Vol 2". */
  bookLabel?: string
  /** Thứ tự của nhóm lớn */
  orderIndex?: number
}

export type PracticeSortMode =
  | "curriculum"
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "title_desc"

export interface PracticeBookSection<T extends PracticeGroupableItem> {
  group: PracticeBookGroup
  items: T[]
}

export interface PracticeBookFacet {
  group: PracticeBookGroup
  count: number
  books: Array<{ label: string; count: number }>
}

export interface CollectionLookupItem {
  rootKey: string
  rootLabel: string
  rootOrderIndex: number
  bookLabel?: string
}

export type CollectionLookupMap = Map<string, CollectionLookupItem>

/**
 * Xây dựng lookup map từ cây CollectionTreeNode:
 * Map từ tên (lowercase) -> { rootKey, rootLabel, rootOrderIndex, bookLabel }
 */
export function buildCollectionLookup(tree: readonly CollectionTreeNode[]): CollectionLookupMap {
  const map: CollectionLookupMap = new Map()

  for (const root of tree) {
    const rootKey = `root:${root._id}`
    // Map chính root (khi root không có con hoặc chứa đề trực tiếp)
    map.set(root.name.toLowerCase().trim(), {
      rootKey,
      rootLabel: root.name,
      rootOrderIndex: root.orderIndex ?? 0,
      bookLabel: undefined,
    })

    // Map các con
    if (root.children) {
      for (const child of root.children) {
        map.set(child.name.toLowerCase().trim(), {
          rootKey,
          rootLabel: root.name,
          rootOrderIndex: root.orderIndex ?? 0,
          bookLabel: child.name,
        })
      }
    }
  }

  return map
}

export const OTHER_BOOK_GROUP: PracticeBookGroup = {
  key: "other",
  label: "Chưa phân nhóm",
  orderIndex: 999,
}

const GROUP_PRIORITY: Record<string, number> = {
  cambridge: 0,
  vol: 1,
  road_to_ielts: 2,
  other: 99,
}

/** Số quyển có thể có 1–2 chữ số (Cam 8 … Cambridge 19). */
const CAMBRIDGE_NUMBER = /\bcam(?:bridge)?(?:\s+ielts)?\s*(\d{1,2})\b/i
const VOLUME_NUMBER = /\bvol(?:ume)?\s*(\d{1,2})\b/i

const naturalCollator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
})

function normalizedNumber(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return String(Number(raw))
}

function toTimestamp(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const time = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function compareTitles(a: PracticeGroupableItem, b: PracticeGroupableItem): number {
  return naturalCollator.compare(a.title, b.title)
}

/**
 * Nhận diện nhóm bộ đề của một bài luyện tập.
 * Ưu tiên 1: Tra cứu qua collectionLookup (từ DB Tree thật).
 * Ưu tiên 2: Regex nhận diện Cambridge, Vol, v.v. (fallback cho dữ liệu cũ).
 */
export function resolvePracticeBookGroup(
  item: PracticeGroupableItem,
  lookup?: CollectionLookupMap
): PracticeBookGroup {
  const collectionName = item.curriculum?.collectionName?.trim()

  if (collectionName && lookup) {
    const found = lookup.get(collectionName.toLowerCase())
    if (found) {
      return {
        key: found.rootKey,
        label: found.rootLabel,
        bookLabel: found.bookLabel,
        orderIndex: found.rootOrderIndex,
      }
    }
  }

  const source = collectionName || item.title.trim()

  if (!source) return OTHER_BOOK_GROUP

  if (/\bcam(?:bridge)?\b/i.test(source)) {
    const number =
      normalizedNumber(CAMBRIDGE_NUMBER.exec(source)?.[1]) ??
      normalizedNumber(CAMBRIDGE_NUMBER.exec(item.title)?.[1])
    return {
      key: "cambridge",
      label: "Cambridge",
      bookLabel: number ? `Cambridge ${number}` : undefined,
      orderIndex: 0,
    }
  }

  if (/\bvol(?:ume)?\b/i.test(source)) {
    const number =
      normalizedNumber(VOLUME_NUMBER.exec(source)?.[1]) ??
      normalizedNumber(VOLUME_NUMBER.exec(item.title)?.[1])
    return {
      key: "vol",
      label: "Vol",
      bookLabel: number ? `Vol ${number}` : undefined,
      orderIndex: 1,
    }
  }

  if (/road\s*to\s*ielts/i.test(source)) {
    return { key: "road_to_ielts", label: "Road to IELTS", orderIndex: 2 }
  }

  if (collectionName) {
    return {
      key: `custom:${collectionName.toLowerCase()}`,
      label: collectionName,
      orderIndex: 50,
    }
  }

  return OTHER_BOOK_GROUP
}

/**
 * Sắp xếp bài luyện tập.
 * Chế độ "curriculum": Test -> orderIndex -> Part -> title.
 */
export function sortPracticeItems<T extends PracticeGroupableItem>(
  items: readonly T[],
  sortMode: PracticeSortMode
): T[] {
  const copy = [...items]

  switch (sortMode) {
    case "curriculum":
      return copy.sort((a, b) => {
        const testA = a.curriculum?.testNumber ?? 9999
        const testB = b.curriculum?.testNumber ?? 9999
        if (testA !== testB) return testA - testB

        const orderA = a.curriculum?.orderIndex ?? 0
        const orderB = b.curriculum?.orderIndex ?? 0
        if (orderA !== orderB) return orderA - orderB

        const partA = a.curriculum?.part ?? 9999
        const partB = b.curriculum?.part ?? 9999
        if (partA !== partB) return partA - partB

        return compareTitles(a, b)
      })
    case "title_asc":
      return copy.sort(compareTitles)
    case "title_desc":
      return copy.sort((a, b) => -compareTitles(a, b))
    case "date_asc":
      return copy.sort((a, b) => compareByDate(a, b, 1))
    case "date_desc":
      return copy.sort((a, b) => compareByDate(a, b, -1))
  }
}

function compareByDate(
  a: PracticeGroupableItem,
  b: PracticeGroupableItem,
  direction: 1 | -1
): number {
  const timeA = toTimestamp(a.createdAt)
  const timeB = toTimestamp(b.createdAt)

  if (timeA === null && timeB === null) return compareTitles(a, b)
  if (timeA === null) return 1
  if (timeB === null) return -1

  return direction * (timeA - timeB) || compareTitles(a, b)
}

function compareGroups(a: PracticeBookGroup, b: PracticeBookGroup): number {
  const orderA = a.orderIndex ?? GROUP_PRIORITY[a.key] ?? 50
  const orderB = b.orderIndex ?? GROUP_PRIORITY[b.key] ?? 50
  if (orderA !== orderB) return orderA - orderB
  return naturalCollator.compare(a.label, b.label)
}

/** Gom bài theo từng nhóm bộ đề, sắp xếp nhóm và các bài bên trong. */
export function groupPracticeItemsByBook<T extends PracticeGroupableItem>(
  items: readonly T[],
  sortMode: PracticeSortMode,
  lookup?: CollectionLookupMap
): Array<PracticeBookSection<T>> {
  const groups = new Map<string, PracticeBookSection<T>>()

  for (const item of items) {
    const group = resolvePracticeBookGroup(item, lookup)
    const existing = groups.get(group.key)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(group.key, { group, items: [item] })
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => compareGroups(a.group, b.group))
    .map((entry) => ({
      group: entry.group,
      items: sortPracticeItems(entry.items, sortMode),
    }))
}

/** Danh sách nhóm + số lượng bài + các quyển con, dùng cho sidebar lọc. */
export function buildPracticeBookFacets<T extends PracticeGroupableItem>(
  items: readonly T[],
  lookup?: CollectionLookupMap
): PracticeBookFacet[] {
  const facets = new Map<
    string,
    { group: PracticeBookGroup; count: number; books: Map<string, number> }
  >()

  for (const item of items) {
    const group = resolvePracticeBookGroup(item, lookup)
    let facet = facets.get(group.key)
    if (!facet) {
      facet = { group, count: 0, books: new Map() }
      facets.set(group.key, facet)
    }

    facet.count += 1
    if (group.bookLabel) {
      facet.books.set(group.bookLabel, (facet.books.get(group.bookLabel) ?? 0) + 1)
    }
  }

  return Array.from(facets.values())
    .sort((a, b) => compareGroups(a.group, b.group))
    .map((facet) => ({
      group: facet.group,
      count: facet.count,
      books: Array.from(facet.books.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => naturalCollator.compare(a.label, b.label)),
    }))
}
