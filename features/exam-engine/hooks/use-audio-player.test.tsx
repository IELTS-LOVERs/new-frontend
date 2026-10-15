import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useExamAudioPlayer } from "./use-audio-player"

/**
 * Minimal HTMLAudioElement stand-in. jsdom does not implement media playback,
 * so we capture the instance the hook creates and drive its events manually.
 */
class FakeAudio {
  static instances: FakeAudio[] = []
  static playImpl: () => Promise<void> = () => Promise.resolve()

  src: string
  preload = ""
  volume = 1
  muted = false
  currentTime = 0
  duration = 0

  play = vi.fn(() => FakeAudio.playImpl())
  pause = vi.fn()
  load = vi.fn()

  private handlers: Record<string, Array<() => void>> = {}

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }

  addEventListener(type: string, cb: () => void) {
    ;(this.handlers[type] ??= []).push(cb)
  }

  removeEventListener(type: string, cb: () => void) {
    this.handlers[type] = (this.handlers[type] ?? []).filter((h) => h !== cb)
  }

  emit(type: string) {
    for (const cb of [...(this.handlers[type] ?? [])]) cb()
  }

  listenerCount(type: string) {
    return (this.handlers[type] ?? []).length
  }
}

describe("useExamAudioPlayer", () => {
  beforeEach(() => {
    FakeAudio.instances = []
    FakeAudio.playImpl = () => Promise.resolve()
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("không tạo audio khi src null và giữ trạng thái mặc định", () => {
    const { result } = renderHook(() => useExamAudioPlayer(null))

    expect(FakeAudio.instances).toHaveLength(0)
    expect(result.current.volume).toBe(0.8)
    expect(result.current.isMuted).toBe(false)
    expect(result.current.started).toBe(false)
    expect(result.current.ended).toBe(false)
    expect(result.current.position).toBe(0)
  })

  it("tạo audio với preload auto và âm lượng 0.8", () => {
    renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))

    expect(FakeAudio.instances).toHaveLength(1)
    const audio = FakeAudio.instances[0]
    expect(audio.src).toBe("https://cdn/audio.mp3")
    expect(audio.preload).toBe("auto")
    expect(audio.volume).toBe(0.8)
  })

  it("cập nhật thời lượng và vị trí phát theo sự kiện của audio", () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]

    act(() => {
      audio.duration = 480
      audio.emit("loadedmetadata")
    })
    expect(result.current.duration).toBe(480)

    act(() => {
      audio.currentTime = 42.5
      audio.emit("timeupdate")
    })
    expect(result.current.position).toBe(42.5)
  })

  it("đánh dấu ended khi audio phát xong", () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]

    act(() => audio.emit("ended"))

    expect(result.current.ended).toBe(true)
  })

  it("play() thủ công đánh dấu started", async () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))

    await act(async () => {
      result.current.play()
    })

    expect(result.current.started).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it("play() không làm gì khi bài nghe đã kết thúc", () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]

    act(() => audio.emit("ended"))
    act(() => {
      result.current.play()
    })

    expect(audio.play).not.toHaveBeenCalled()
  })

  it("setVolume cập nhật state và phần tử audio", () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]

    act(() => result.current.setVolume(0.3))

    expect(result.current.volume).toBe(0.3)
    expect(audio.volume).toBe(0.3)
  })

  it("toggleMute bật/tắt muted trên audio", () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]

    act(() => result.current.toggleMute())
    expect(result.current.isMuted).toBe(true)
    expect(audio.muted).toBe(true)

    act(() => result.current.toggleMute())
    expect(result.current.isMuted).toBe(false)
    expect(audio.muted).toBe(false)
  })

  it("hiển thị lỗi khi audio không tải được và retry xoá lỗi, load lại", () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]

    act(() => audio.emit("error"))
    expect(result.current.error).toBe("Không tải được audio. Vui lòng thử lại.")

    act(() => result.current.retry())
    expect(result.current.error).toBeNull()
    expect(audio.load).toHaveBeenCalled()
  })

  it("autoplay thành công thì tự đánh dấu started", async () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { autoplay: true })
    )

    await waitFor(() => expect(result.current.started).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it("autoplay bị trình duyệt chặn thì báo lỗi hướng dẫn bấm Phát", async () => {
    FakeAudio.playImpl = () => Promise.reject(new Error("NotAllowedError"))

    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { autoplay: true })
    )

    await waitFor(() =>
      expect(result.current.error).toBe(
        "Trình duyệt chặn phát tự động. Bấm nút Phát để bắt đầu."
      )
    )
  })

  it("dọn dẹp: pause và gỡ listener khi unmount", () => {
    const { unmount } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))
    const audio = FakeAudio.instances[0]
    expect(audio.listenerCount("timeupdate")).toBe(1)

    unmount()

    expect(audio.pause).toHaveBeenCalled()
    expect(audio.listenerCount("timeupdate")).toBe(0)
    expect(audio.listenerCount("ended")).toBe(0)
  })
})
