import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useClipboardGuard } from "./use-clipboard-guard"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: { warning: vi.fn() },
}))

const mockWarning = vi.mocked(toast.warning)

function fireClipboard(type: "copy" | "cut" | "paste") {
  const event = new Event(type, { cancelable: true })
  act(() => {
    document.dispatchEvent(event)
  })
  return event
}

describe("useClipboardGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("chặn copy/cut/paste khi được bật", () => {
    renderHook(() => useClipboardGuard(true))

    expect(fireClipboard("copy").defaultPrevented).toBe(true)
    expect(fireClipboard("cut").defaultPrevented).toBe(true)
    expect(fireClipboard("paste").defaultPrevented).toBe(true)
  })

  it("không chặn khi bị tắt", () => {
    renderHook(() => useClipboardGuard(false))

    expect(fireClipboard("copy").defaultPrevented).toBe(false)
    expect(fireClipboard("cut").defaultPrevented).toBe(false)
    expect(fireClipboard("paste").defaultPrevented).toBe(false)
    expect(mockWarning).not.toHaveBeenCalled()
  })

  it("báo cho callback hành động bị chặn", () => {
    const onBlocked = vi.fn()
    renderHook(() => useClipboardGuard(true, onBlocked))

    fireClipboard("copy")
    fireClipboard("cut")
    fireClipboard("paste")

    expect(onBlocked.mock.calls.map(([action]) => action)).toEqual([
      "COPY",
      "CUT",
      "PASTE",
    ])
  })

  it("throttle toast trong 2 giây", () => {
    vi.useFakeTimers()
    renderHook(() => useClipboardGuard(true))

    fireClipboard("copy")
    fireClipboard("copy")
    expect(mockWarning).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    fireClipboard("copy")
    expect(mockWarning).toHaveBeenCalledTimes(2)
  })

  it("gỡ listener khi unmount", () => {
    const { unmount } = renderHook(() => useClipboardGuard(true))
    unmount()

    expect(fireClipboard("copy").defaultPrevented).toBe(false)
  })
})
