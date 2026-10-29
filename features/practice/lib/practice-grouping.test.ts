import { describe, expect, it } from "vitest"

import {
  buildPracticeBookFacets,
  groupPracticeItemsByBook,
  resolvePracticeBookGroup,
  sortPracticeItems,
  type PracticeGroupableItem,
} from "./practice-grouping"

function item(
  title: string,
  collectionName?: string,
  createdAt?: string
): PracticeGroupableItem {
  return {
    title,
    curriculum: collectionName ? { collectionName } : undefined,
    createdAt,
  }
}

describe("resolvePracticeBookGroup", () => {
  it("nhận diện nhóm Cambridge từ các cách đặt tên phổ biến", () => {
    expect(resolvePracticeBookGroup(item("Cam 18 - T1 - P1", "Cam 18"))).toMatchObject({
      key: "cambridge",
      label: "Cambridge",
      bookLabel: "Cambridge 18",
    })

    expect(resolvePracticeBookGroup(item("CAM 9 - Test 2", "CAM 9"))).toMatchObject({
      key: "cambridge",
      bookLabel: "Cambridge 9",
    })

    expect(
      resolvePracticeBookGroup(item("Cambridge IELTS 18 - Test 1", "Cambridge IELTS 18"))
    ).toMatchObject({
      key: "cambridge",
      bookLabel: "Cambridge 18",
    })
  })

  it("lấy số quyển từ title nếu collectionName chỉ ghi Cambridge hoặc Vol chung chung", () => {
    const camGroup = resolvePracticeBookGroup(
      item("CAM 9 TEST 1 READING PASSAGE 1", "Cambridge")
    )
    expect(camGroup).toMatchObject({
      key: "cambridge",
      label: "Cambridge",
      bookLabel: "Cambridge 9",
    })

    const volGroup = resolvePracticeBookGroup(
      item("VOL 3 TEST 2 LISTENING PART 1", "Vol")
    )
    expect(volGroup).toMatchObject({
      key: "vol",
      label: "Vol",
      bookLabel: "Vol 3",
    })
  })

  it("nhóm Cambridge không có số quyển ở cả collectionName và title thì không có bookLabel", () => {
    const group = resolvePracticeBookGroup(item("Cambridge Reading", "Cambridge"))
    expect(group.key).toBe("cambridge")
    expect(group.label).toBe("Cambridge")
    expect(group.bookLabel).toBeUndefined()
  })

  it("nhận diện nhóm Vol / Volume", () => {
    expect(resolvePracticeBookGroup(item("Vol 1 - Test 1", "Vol 1"))).toMatchObject({
      key: "vol",
      label: "Vol",
      bookLabel: "Vol 1",
    })

    expect(resolvePracticeBookGroup(item("Volume 2", "Volume 2"))).toMatchObject({
      key: "vol",
      bookLabel: "Vol 2",
    })
  })

  it("nhận diện Road to IELTS", () => {
    expect(
      resolvePracticeBookGroup(item("Road to IELTS 2024", "Road to IELTS"))
    ).toMatchObject({
      key: "road_to_ielts",
      label: "Road to IELTS",
    })
  })

  it("tạo nhóm tuỳ chỉnh theo tên giáo viên nhập", () => {
    const group = resolvePracticeBookGroup(item("Actual Test 1", "Actual Test"))
    expect(group).toMatchObject({
      key: "custom:actual test",
      label: "Actual Test",
    })
    expect(group.bookLabel).toBeUndefined()
  })

  it("fallback sang tiêu đề khi bài cũ chưa có curriculum", () => {
    expect(resolvePracticeBookGroup(item("Cam 8 - Test 3 - Passage 2"))).toMatchObject({
      key: "cambridge",
      bookLabel: "Cambridge 8",
    })
  })

  it("ưu tiên curriculum.collectionName hơn tiêu đề", () => {
    const group = resolvePracticeBookGroup(item("Cam 8 - Test 1", "Actual Test"))
    expect(group.key).toBe("custom:actual test")
  })

  it("bài chưa phân nhóm rơi vào Chưa phân nhóm", () => {
    expect(resolvePracticeBookGroup(item("Reading Practice 1"))).toMatchObject({
      key: "other",
      label: "Chưa phân nhóm",
    })
  })
})

describe("sortPracticeItems", () => {
  it("sắp xếp alphabet A → Z với natural numeric sort", () => {
    const items = [item("CAM 10"), item("CAM 8"), item("CAM 9")]
    expect(sortPracticeItems(items, "title_asc").map((i) => i.title)).toEqual([
      "CAM 8",
      "CAM 9",
      "CAM 10",
    ])
  })

  it("sắp xếp alphabet Z → A", () => {
    const items = [item("CAM 8"), item("CAM 10"), item("CAM 9")]
    expect(sortPracticeItems(items, "title_desc").map((i) => i.title)).toEqual([
      "CAM 10",
      "CAM 9",
      "CAM 8",
    ])
  })

  it("sắp xếp ngày đăng mới nhất trước, bài thiếu ngày xuống cuối", () => {
    const items = [
      item("A", undefined, "2026-01-01T00:00:00Z"),
      item("B", undefined, "2026-03-01T00:00:00Z"),
      item("C"),
      item("D", undefined, "2026-02-01T00:00:00Z"),
    ]
    expect(sortPracticeItems(items, "date_desc").map((i) => i.title)).toEqual([
      "B",
      "D",
      "A",
      "C",
    ])
  })

  it("sắp xếp ngày đăng cũ nhất trước, bài thiếu ngày xuống cuối", () => {
    const items = [
      item("A", undefined, "2026-01-01T00:00:00Z"),
      item("B", undefined, "2026-03-01T00:00:00Z"),
      item("C"),
      item("D", undefined, "2026-02-01T00:00:00Z"),
    ]
    expect(sortPracticeItems(items, "date_asc").map((i) => i.title)).toEqual([
      "A",
      "D",
      "B",
      "C",
    ])
  })

  it("không thay đổi mảng gốc", () => {
    const items = [item("CAM 10"), item("CAM 8")]
    const sorted = sortPracticeItems(items, "title_asc")
    expect(items.map((i) => i.title)).toEqual(["CAM 10", "CAM 8"])
    expect(sorted).not.toBe(items)
  })
})

describe("groupPracticeItemsByBook", () => {
  it("gom theo nhóm và xếp Cambridge → Vol → Road to IELTS → tuỳ chỉnh → khác", () => {
    const items = [
      item("Reading Practice", undefined, "2026-01-01T00:00:00Z"),
      item("Actual Test 1", "Actual Test", "2026-01-01T00:00:00Z"),
      item("Road to IELTS 1", "Road to IELTS", "2026-01-01T00:00:00Z"),
      item("Vol 1", "Vol 1", "2026-01-01T00:00:00Z"),
      item("Cam 8", "Cam 8", "2026-01-01T00:00:00Z"),
    ]

    expect(groupPracticeItemsByBook(items, "title_asc").map((entry) => entry.group.label)).toEqual([
      "Cambridge",
      "Vol",
      "Road to IELTS",
      "Actual Test",
      "Chưa phân nhóm",
    ])
  })

  it("sắp xếp các bài bên trong mỗi nhóm", () => {
    const items = [
      item("Cam 10", "Cam 10", "2026-01-01T00:00:00Z"),
      item("Cam 8", "Cam 8", "2026-01-01T00:00:00Z"),
      item("Cam 9", "Cam 9", "2026-01-01T00:00:00Z"),
    ]

    const groups = groupPracticeItemsByBook(items, "title_asc")
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((i) => i.title)).toEqual(["Cam 8", "Cam 9", "Cam 10"])
  })
})

describe("buildPracticeBookFacets", () => {
  it("đếm số bài theo nhóm và theo từng quyển con", () => {
    const items = [
      item("Cam 8 - T1", "Cam 8"),
      item("Cam 8 - T2", "Cam 8"),
      item("Cam 9 - T1", "Cam 9"),
      item("Vol 1 - T1", "Vol 1"),
    ]

    const facets = buildPracticeBookFacets(items)
    const cambridge = facets.find((facet) => facet.group.key === "cambridge")
    expect(cambridge?.count).toBe(3)
    expect(cambridge?.books).toEqual([
      { label: "Cambridge 8", count: 2 },
      { label: "Cambridge 9", count: 1 },
    ])

    const vol = facets.find((facet) => facet.group.key === "vol")
    expect(vol?.count).toBe(1)
    expect(vol?.books).toEqual([{ label: "Vol 1", count: 1 }])
  })
})
