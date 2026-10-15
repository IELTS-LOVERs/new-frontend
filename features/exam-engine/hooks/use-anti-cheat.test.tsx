import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useAntiCheat } from "./use-anti-cheat"
import { recordAntiCheatEventApi } from "@/lib/api/anti-cheat"
import { toast } from "sonner"

vi.mock("@/lib/api/anti-cheat", () => ({
  recordAntiCheatEventApi: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("sonner", () => ({
  toast: { warning: vi.fn() },
}))

const mockRecord = vi.mocked(recordAntiCheatEventApi)

/** Override `document.hidden` (read-only in jsdom) for the current test. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden })
}

/** Override `document.fullscreenElement` for the current test. */
function setFullscreen(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => element,
  })
}

function fireVisibility(hidden: boolean) {
  setHidden(hidden)
  document.dispatchEvent(new Event("visibilitychange"))
}

describe("useAntiCheat", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
    setFullscreen(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("ghi TAB_SWITCH và cảnh báo khi học sinh rời tab", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    act(() => fireVisibility(true))

    expect(mockRecord).toHaveBeenCalledTimes(1)
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: "attempt-1", type: "TAB_SWITCH" })
    )
    expect(toast.warning).toHaveBeenCalledWith(
      "Đã ghi nhận bạn rời phòng thi",
      expect.any(Object)
    )
  })

  it("khử trùng cùng loại sự kiện trong 1 giây", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    act(() => fireVisibility(true))
    act(() => fireVisibility(true))
    expect(mockRecord).toHaveBeenCalledTimes(1)

    // Sau 1s, sự kiện cùng loại được ghi nhận lại.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    act(() => fireVisibility(true))
    expect(mockRecord).toHaveBeenCalledTimes(2)
  })

  it("ghi WINDOW_BLUR sau 1s rời cửa sổ", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    act(() => {
      window.dispatchEvent(new Event("blur"))
    })
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(mockRecord).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WINDOW_BLUR" })
    )
  })

  it("huỷ WINDOW_BLUR nếu học sinh quay lại focus trong vòng 1s", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    act(() => {
      window.dispatchEvent(new Event("blur"))
    })
    act(() => {
      window.dispatchEvent(new Event("focus"))
    })
    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    expect(mockRecord).not.toHaveBeenCalled()
  })

  it("ghi FULLSCREEN_EXIT khi thoát toàn màn hình", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    act(() => {
      setFullscreen(null)
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FULLSCREEN_EXIT" })
    )
  })

  it("chặn copy/paste/cut và ghi nhận từng loại", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    const copy = new Event("copy", { cancelable: true })
    act(() => {
      document.dispatchEvent(copy)
    })
    expect(copy.defaultPrevented).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ type: "COPY" }))

    const paste = new Event("paste", { cancelable: true })
    act(() => {
      document.dispatchEvent(paste)
    })
    expect(paste.defaultPrevented).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ type: "PASTE" }))

    const cut = new Event("cut", { cancelable: true })
    act(() => {
      document.dispatchEvent(cut)
    })
    expect(cut.defaultPrevented).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ type: "CUT" }))
  })

  it("chặn menu chuột phải và ghi CONTEXT_MENU", () => {
    renderHook(() => useAntiCheat("attempt-1"))

    const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
    act(() => {
      document.dispatchEvent(menu)
    })

    expect(menu.defaultPrevented).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CONTEXT_MENU" })
    )
  })

  it("không ghi sự kiện khi chưa có attemptId", () => {
    renderHook(() => useAntiCheat(null))

    act(() => fireVisibility(true))
    act(() => {
      document.dispatchEvent(new Event("copy", { cancelable: true }))
    })

    expect(mockRecord).not.toHaveBeenCalled()
  })

  it("không ghi sự kiện khi bị tắt (enabled = false)", () => {
    renderHook(() => useAntiCheat("attempt-1", false))

    act(() => fireVisibility(true))
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it("nuốt lỗi khi API ghi sự kiện thất bại (không chặn làm bài)", async () => {
    mockRecord.mockRejectedValueOnce(new Error("network down"))
    renderHook(() => useAntiCheat("attempt-1"))

    act(() => fireVisibility(true))

    // Không ném lỗi ra ngoài; promise bị nuốt.
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockRecord).toHaveBeenCalledTimes(1)
  })
})
