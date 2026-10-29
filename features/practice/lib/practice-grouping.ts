import type { IExamCurriculum } from "@/lib/api/types"

/**
 * Phân nhóm & sắp xếp bài luyện tập dùng chung cho trang Giáo viên và Học sinh.
 *
 * Nhóm bộ đề được suy ra từ `curriculum.collectionName` (ưu tiên) hoặc tiêu đề
 * bài (fallback cho dữ liệu cũ chưa điền curriculum).
 */

export interface PracticeGroupableItem {
  title: string
  createdAt?: string | Date | null
  curriculum?: Pick<IExamCurriculum, "collectionName"> | null
}

export interface PracticeBookGroup {
  /** "cambridge" | "vol" | "road_to_ielts" | "other" | "custom:<tên>" */
  key: string
  /** Nhãn hiển thị của nhóm lớn, ví dụ "Cambridge", "Vol", "Bộ đề khác". */
  label: string
  /** Quyển con, ví dụ "Cambridge 8", "Vol 2". */
  bookLabel?: string
}

export type PracticeSortMode =
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

export const OTHER_BOOK_GROUP: PracticeBookGroup = {
  key: "other",
  label: "Bộ đề khác",
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
 *
 * - `Cam 8`, `Cambridge IELTS 18` → nhóm "Cambridge", quyển "Cambridge 8/18".
 * - `Vol 1`, `Volume 2` → nhóm "Vol", quyển "Vol 1/2".
 * - `Road to IELTS` → nhóm "Road to IELTS".
 * - `curriculum.collectionName` khác → nhóm tuỳ chỉnh cùng tên.
 * - Không có thông tin → "Bộ đề khác".
 */
export function resolvePracticeBookGroup(
  item: PracticeGroupableItem
): PracticeBookGroup {
  const collectionName = item.curriculum?.collectionName?.trim()
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
    }
  }

  if (/road\s*to\s*ielts/i.test(source)) {
    return { key: "road_to_ielts", label: "Road to IELTS" }
  }

  if (collectionName) {
    return {
      key: `custom:${collectionName.toLowerCase()}`,
      label: collectionName,
    }
  }

  return OTHER_BOOK_GROUP
}

/**
 * Sắp xếp bài luyện tập. Bài thiếu `createdAt` luôn xuống cuối ở chế độ ngày;
 * chế độ alphabet dùng natural sort để `CAM 8` < `CAM 9` < `CAM 10`.
 */
export function sortPracticeItems<T extends PracticeGroupableItem>(
  items: readonly T[],
  sortMode: PracticeSortMode
): T[] {
  const copy = [...items]

  switch (sortMode) {
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
  const priorityA = GROUP_PRIORITY[a.key] ?? 50
  const priorityB = GROUP_PRIORITY[b.key] ?? 50
  if (priorityA !== priorityB) return priorityA - priorityB
  return naturalCollator.compare(a.label, b.label)
}

/** Gom bài theo từng nhóm bộ đề, sắp xếp nhóm và các bài bên trong. */
export function groupPracticeItemsByBook<T extends PracticeGroupableItem>(
  items: readonly T[],
  sortMode: PracticeSortMode
): Array<PracticeBookSection<T>> {
  const groups = new Map<string, PracticeBookSection<T>>()

  for (const item of items) {
    const group = resolvePracticeBookGroup(item)
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
  items: readonly T[]
): PracticeBookFacet[] {
  const facets = new Map<
    string,
    { group: PracticeBookGroup; count: number; books: Map<string, number> }
  >()

  for (const item of items) {
    const group = resolvePracticeBookGroup(item)
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
