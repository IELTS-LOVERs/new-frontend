import { describe, expect, it } from "vitest"
import {
  computeTargetSize,
  isCompressibleImage,
  shouldUseCompressed,
} from "./compress-image"

describe("computeTargetSize", () => {
  it("giữ nguyên ảnh nhỏ hơn giới hạn", () => {
    expect(computeTargetSize(1200, 800, 2048)).toEqual({
      width: 1200,
      height: 800,
      scale: 1,
    })
  })

  it("thu ảnh ngang theo cạnh dài, giữ tỉ lệ", () => {
    expect(computeTargetSize(4000, 2000, 2048)).toEqual({
      width: 2048,
      height: 1024,
      scale: 2048 / 4000,
    })
  })

  it("thu ảnh dọc theo cạnh dài, giữ tỉ lệ", () => {
    expect(computeTargetSize(1500, 3000, 2048)).toEqual({
      width: 1024,
      height: 2048,
      scale: 2048 / 3000,
    })
  })

  it("không trả về kích thước 0", () => {
    const result = computeTargetSize(10000, 1, 100)
    expect(result.width).toBe(100)
    expect(result.height).toBe(1)
  })
})

describe("shouldUseCompressed", () => {
  it("chỉ dùng bản nén khi nhỏ hơn file gốc", () => {
    expect(shouldUseCompressed(1_000, 900)).toBe(true)
    expect(shouldUseCompressed(1_000, 1_000)).toBe(false)
    expect(shouldUseCompressed(1_000, 1_200)).toBe(false)
    expect(shouldUseCompressed(1_000, 0)).toBe(false)
  })
})

describe("isCompressibleImage", () => {
  it("nhận JPEG/PNG theo mime hoặc phần mở rộng", () => {
    expect(isCompressibleImage("image/jpeg")).toBe(true)
    expect(isCompressibleImage("image/png")).toBe(true)
    expect(isCompressibleImage("", "photo.JPG")).toBe(true)
    expect(isCompressibleImage("", "scan.png")).toBe(true)
  })

  it("bỏ qua các định dạng khác", () => {
    expect(isCompressibleImage("audio/mpeg", "track.mp3")).toBe(false)
    expect(isCompressibleImage("image/gif", "anim.gif")).toBe(false)
  })
})
