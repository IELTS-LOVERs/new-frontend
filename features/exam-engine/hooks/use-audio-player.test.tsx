import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { resetExamAudioMemory, useExamAudioPlayer } from "./use-audio-player"

/**
 * Minimal HTMLAudioElement stand-in. jsdom does not implement media playback,
 * so we capture the instance the hook creates and drive its events manually.
 */
class FakeAudio {
  static instances: FakeAudio[] = []
  static playImpl: () => Promise<void> = () => Promise.resolve()
  /** Bật để mô phỏng iOS: setter `volume` bị bỏ qua, đọc lại luôn bằng 1. */
  static volumeLocked = false

  src: string
  preload = ""
  private _volume = 1
  muted = false
  currentTime = 0
  duration = 0
  ended = false
  paused = true
  playbackRate = 1
  preservesPitch = true

  get volume() {
    return FakeAudio.volumeLocked ? 1 : this._volume
  }

  set volume(value: number) {
    if (!FakeAudio.volumeLocked) this._volume = value
  }

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
    FakeAudio.volumeLocked = false
    FakeAudio.playImpl = () => Promise.resolve()
    resetExamAudioMemory()
    window.localStorage.clear()
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
        "Trình duyệt chặn phát tự động. Bấm “Thử lại” để bắt đầu nghe."
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

describe("useExamAudioPlayer — chế độ luyện tập", () => {
  beforeEach(() => {
    FakeAudio.instances = []
    FakeAudio.volumeLocked = false
    FakeAudio.playImpl = () => Promise.resolve()
    resetExamAudioMemory()
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("play() sau khi hết bài sẽ nghe lại từ đầu", async () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )
    const audio = FakeAudio.instances[0]

    act(() => {
      audio.ended = true
      audio.emit("ended")
    })

    await act(async () => {
      result.current.play()
    })

    expect(audio.currentTime).toBe(0)
    expect(audio.play).toHaveBeenCalled()
    expect(result.current.ended).toBe(false)
  })

  it("togglePlay phát khi đang dừng và tạm dừng khi đang phát", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )
    const audio = FakeAudio.instances[0]

    act(() => {
      audio.paused = false
      audio.emit("play")
    })
    expect(result.current.isPlaying).toBe(true)

    act(() => result.current.togglePlay())
    expect(audio.pause).toHaveBeenCalled()
  })

  it("seek đổi currentTime và kẹp trong khoảng 0..duration", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )
    const audio = FakeAudio.instances[0]

    act(() => {
      audio.duration = 400
      audio.emit("loadedmetadata")
    })

    act(() => result.current.seek(120))
    expect(audio.currentTime).toBe(120)

    act(() => result.current.seek(-50))
    expect(audio.currentTime).toBe(0)

    act(() => result.current.seek(9999))
    expect(audio.currentTime).toBe(400)
  })
})

describe("useExamAudioPlayer — chế độ thi", () => {
  beforeEach(() => {
    FakeAudio.instances = []
    FakeAudio.volumeLocked = false
    FakeAudio.playImpl = () => Promise.resolve()
    resetExamAudioMemory()
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("không cho tua và không cho phát/dừng bằng tay", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam" })
    )
    const audio = FakeAudio.instances[0]

    act(() => {
      audio.duration = 400
      audio.currentTime = 100
      audio.emit("loadedmetadata")
    })

    act(() => result.current.seek(300))
    expect(audio.currentTime).toBe(100)

    act(() => result.current.togglePlay())
    expect(audio.play).not.toHaveBeenCalled()
    expect(audio.pause).not.toHaveBeenCalled()
  })

  it("vẫn tự phát khi bật autoplay", async () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam", autoplay: true })
    )
    const audio = FakeAudio.instances[0]

    await waitFor(() => expect(result.current.started).toBe(true))
    expect(audio.play).toHaveBeenCalled()
  })

  it("nghe dở tới đâu thì lần vào sau tiếp tục đúng chỗ đó (không phát lại từ đầu)", () => {
    const { unmount } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam" })
    )
    const first = FakeAudio.instances[0]

    act(() => {
      first.duration = 300
      first.currentTime = 120
      first.emit("loadedmetadata")
    })

    unmount()

    renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam" }))
    const second = FakeAudio.instances[1]

    act(() => {
      second.duration = 300
      second.emit("loadedmetadata")
    })

    expect(second.currentTime).toBe(120)
  })

  it("bài đã nghe hết thì không autoplay lại khi quay lại part", () => {
    const { unmount } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam" })
    )
    const first = FakeAudio.instances[0]

    act(() => {
      first.duration = 300
      first.emit("loadedmetadata")
      first.emit("ended")
    })

    unmount()

    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam", autoplay: true })
    )
    const second = FakeAudio.instances[1]

    act(() => {
      second.duration = 300
      second.emit("loadedmetadata")
    })

    expect(second.play).not.toHaveBeenCalled()
    expect(result.current.ended).toBe(true)
  })
})

describe("useExamAudioPlayer — âm lượng trên thiết bị không hỗ trợ (iOS)", () => {
  beforeEach(() => {
    FakeAudio.instances = []
    FakeAudio.volumeLocked = false
    FakeAudio.playImpl = () => Promise.resolve()
    resetExamAudioMemory()
    // Mô phỏng iOS Safari: gán volume xong đọc lại vẫn là 1.
    FakeAudio.volumeLocked = true
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio)
  })

  afterEach(() => {
    FakeAudio.volumeLocked = false
    vi.unstubAllGlobals()
  })

  it("phát hiện setter volume bị bỏ qua và không ghi đè state", async () => {
    const { result } = renderHook(() => useExamAudioPlayer("https://cdn/audio.mp3"))

    // Hook probe lúc tạo audio (cập nhật qua microtask) → nhận ra không đổi được.
    await waitFor(() => expect(result.current.volumeControlSupported).toBe(false))

    act(() => result.current.setVolume(0.2))
    expect(result.current.volume).toBe(1)
  })
})

describe("useExamAudioPlayer — tốc độ phát (chỉ luyện tập)", () => {
  beforeEach(() => {
    FakeAudio.instances = []
    FakeAudio.volumeLocked = false
    FakeAudio.playImpl = () => Promise.resolve()
    resetExamAudioMemory()
    window.localStorage.clear()
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("mặc định 1× và giữ nguyên giọng đọc", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )
    const audio = FakeAudio.instances[0]

    expect(result.current.rate).toBe(1)
    expect(audio.playbackRate).toBe(1)
    expect(audio.preservesPitch).toBe(true)
  })

  it("setRate đổi tốc độ của phần tử audio và nhớ cho lần sau", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )
    const audio = FakeAudio.instances[0]

    act(() => result.current.setRate(0.75))

    expect(result.current.rate).toBe(0.75)
    expect(audio.playbackRate).toBe(0.75)
    expect(window.localStorage.getItem("ielts:audio-rate")).toBe("0.75")
  })

  it("khôi phục tốc độ đã lưu từ lần trước", () => {
    window.localStorage.setItem("ielts:audio-rate", "1.25")

    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )

    expect(result.current.rate).toBe(1.25)
    expect(FakeAudio.instances[0].playbackRate).toBe(1.25)
  })

  it("áp lại tốc độ đã chọn khi chuyển sang part khác", () => {
    const { result, rerender } = renderHook(
      ({ src }: { src: string }) =>
        useExamAudioPlayer(src, { mode: "practice" }),
      { initialProps: { src: "https://cdn/part-1.mp3" } }
    )

    act(() => result.current.setRate(1.5))
    rerender({ src: "https://cdn/part-2.mp3" })

    expect(FakeAudio.instances[1].playbackRate).toBe(1.5)
    expect(result.current.rate).toBe(1.5)
  })

  it("chế độ thi bỏ qua setRate và luôn phát 1×", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "exam" })
    )
    const audio = FakeAudio.instances[0]

    act(() => result.current.setRate(0.5))

    expect(result.current.rate).toBe(1)
    expect(audio.playbackRate).toBe(1)
  })

  it("kẹp tốc độ ngoài khoảng cho phép", () => {
    const { result } = renderHook(() =>
      useExamAudioPlayer("https://cdn/audio.mp3", { mode: "practice" })
    )

    act(() => result.current.setRate(0.1))
    expect(result.current.rate).toBe(0.5)

    act(() => result.current.setRate(9))
    expect(result.current.rate).toBe(2)
  })
})
