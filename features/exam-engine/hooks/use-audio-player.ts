"use client"

import * as React from "react"

/**
 * Chế độ phát audio bài Listening:
 *  - `practice`: luyện tập — thí sinh tự phát/dừng, tua 10 giây, kéo thanh tiến
 *    trình để nghe lại đoạn bất kỳ.
 *  - `exam`: thi — audio tự phát 1 lần, KHÔNG phát/dừng/tua được, chỉ chỉnh âm
 *    lượng (giống thi máy IELTS thật).
 */
export type ExamAudioMode = "practice" | "exam"

export interface ExamAudioPlayerOptions {
  mode?: ExamAudioMode
  /** Chỉ dùng cho chế độ `exam` (thi máy: audio tự chạy khi vào phần nghe). */
  autoplay?: boolean
  initialVolume?: number
  /**
   * Phạm vi nhớ vị trí phát (thường là attemptId). Bắt buộc khi dùng chế độ
   * `exam` để lượt thi mới không "thừa hưởng" vị trí của lượt thi trước.
   */
  scope?: string
}

const DEFAULT_VOLUME = 0.8

/**
 * Tốc độ phát cho phép ở chế độ luyện tập. Thi thật luôn 1× (giống phòng thi
 * máy), nên chế độ `exam` bỏ qua hoàn toàn các giá trị này.
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const RATE_STORAGE_KEY = "ielts:audio-rate"

/** Nhớ tốc độ đã chọn giữa các lần vào (đổi part, tải lại trang). */
function readStoredRate(): number {
  if (typeof window === "undefined") return 1
  try {
    const parsed = Number(window.localStorage.getItem(RATE_STORAGE_KEY))
    return (PLAYBACK_RATES as readonly number[]).includes(parsed) ? parsed : 1
  } catch {
    return 1
  }
}

interface PlaybackMemory {
  position: number
  ended: boolean
}

/**
 * Vị trí phát của audio theo từng `src` ở CHẾ ĐỘ THI.
 *
 * Không có bộ nhớ này, học sinh chỉ cần chuyển sang part khác rồi quay lại là
 * audio phát lại từ đầu — tức vẫn "nghe lại" được dù không có nút tua. Nhớ vị
 * trí giúp mỗi file audio chỉ phát đúng 1 lần như thi thật.
 */
const examPlaybackMemory = new Map<string, PlaybackMemory>()

/** Dùng cho test / khi bắt đầu attempt mới. */
export function resetExamAudioMemory(): void {
  examPlaybackMemory.clear()
}

export function useExamAudioPlayer(
  src: string | null,
  options?: ExamAudioPlayerOptions
) {
  const mode: ExamAudioMode = options?.mode ?? "exam"
  const isPractice = mode === "practice"

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [position, setPosition] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolumeState] = React.useState(DEFAULT_VOLUME)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ended, setEnded] = React.useState(false)
  const [started, setStarted] = React.useState(false)
  /**
   * iOS Safari ignores `audio.volume` (âm lượng do phần cứng quyết định). Ta
   * dò một lần lúc tạo audio để UI ẩn thanh âm lượng thay vì hiện một thanh
   * kéo "chết" — đây chính là lỗi thanh âm lượng không hoạt động trên điện thoại.
   */
  const [volumeControlSupported, setVolumeControlSupported] = React.useState(true)
  /**
   * Chỉ chế độ luyện tập mới được đổi tốc độ; thi thật luôn 1×. Khởi tạo 1× rồi
   * đọc lựa chọn đã lưu trong effect (localStorage không có lúc SSR → tránh
   * lệch hydration).
   */
  const [rate, setRateState] = React.useState(1)
  /** Giữ tốc độ hiện tại để áp lại khi phần tử audio được tạo lại (đổi part). */
  const rateRef = React.useRef(1)

  const initialVolume = options?.initialVolume ?? DEFAULT_VOLUME
  const autoplay = options?.autoplay ?? false

  React.useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio
    audio.preload = "auto"
    audio.volume = initialVolume
    // Giữ giọng đọc tự nhiên khi nghe chậm/tua nhanh (mặc định của trình duyệt
    // là true, nhưng đặt tường minh để không bị đổi giọng trên một số bản cũ).
    audio.preservesPitch = true
    if (isPractice) {
      // Lựa chọn đã lưu (nếu có) được áp lại mỗi khi phần tử audio được tạo.
      // `rateRef` thắng khi storage bị chặn (chế độ riêng tư) để tốc độ không
      // tự nhảy về 1× lúc chuyển part.
      const storedRate = rateRef.current !== 1 ? rateRef.current : readStoredRate()
      rateRef.current = storedRate
      audio.playbackRate = storedRate
      if (storedRate !== 1) setRateState(storedRate)
    }

    let cancelled = false
    // Chế độ thi: khôi phục đúng chỗ đã nghe dở (nếu có) thay vì phát lại.
    // Key gồm `scope` (attemptId) để lượt thi mới không dùng lại vị trí cũ.
    const memoryKey = `${options?.scope ?? "global"}:${src}`
    const remembered = isPractice ? undefined : examPlaybackMemory.get(memoryKey)
    let restored = false
    let endedFlag = false

    // iOS bỏ qua setter của `volume` → giá trị đọc lại vẫn là 1. Chỉ cần cập
    // nhật state trong trường hợp KHÔNG hỗ trợ (trường hợp bình thường đã khớp
    // initial state); defer qua microtask để không setState đồng bộ trong effect.
    const volumeSupported = Math.abs(audio.volume - initialVolume) < 0.01
    if (!volumeSupported) {
      queueMicrotask(() => {
        if (cancelled) return
        setVolumeControlSupported(false)
        setVolumeState(audio.volume)
      })
    }

    const onTime = () => setPosition(audio.currentTime)
    const startPlayback = () => {
      audio
        .play()
        .then(() => setStarted(true))
        .catch(() =>
          setError(
            "Trình duyệt chặn phát tự động. Bấm “Thử lại” để bắt đầu nghe."
          )
        )
    }
    // Khi có vị trí cũ, phải chờ metadata để seek xong mới phát (nếu không sẽ
    // nghe vọng lại vài giây đầu rồi mới nhảy về đúng chỗ).
    let pendingAutoplay = autoplay && !remembered?.ended && remembered !== undefined

    const onMeta = () => {
      const total = Number.isFinite(audio.duration) ? audio.duration : 0
      setDuration(total)

      if (!restored && remembered) {
        restored = true
        if (remembered.ended && total > 0) {
          // Đã nghe hết bài này ở lần vào trước → không phát lại.
          audio.currentTime = total
          endedFlag = true
          setEnded(true)
          setPosition(total)
        } else if (remembered.position > 0) {
          audio.currentTime = Math.min(remembered.position, total || remembered.position)
          setPosition(audio.currentTime)
        }
      }

      if (pendingAutoplay) {
        pendingAutoplay = false
        startPlayback()
      }
    }
    const onEnd = () => {
      endedFlag = true
      setEnded(true)
      setIsPlaying(false)
    }
    const onError = () => setError("Không tải được audio. Vui lòng thử lại.")
    const onPlay = () => {
      setIsPlaying(true)
      setStarted(true)
    }
    const onPause = () => setIsPlaying(false)
    const onVolume = () => {
      setVolumeState(audio.volume)
      setIsMuted(audio.muted)
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("durationchange", onMeta)
    audio.addEventListener("ended", onEnd)
    audio.addEventListener("error", onError)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("volumechange", onVolume)

    if (autoplay && !remembered?.ended && remembered === undefined) {
      startPlayback()
    }

    return () => {
      cancelled = true
      // Lưu vị trí cho lần mount sau (chỉ chế độ thi).
      if (!isPractice) {
        examPlaybackMemory.set(memoryKey, {
          position: audio.currentTime,
          ended: endedFlag || audio.ended,
        })
      }
      audio.pause()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("durationchange", onMeta)
      audio.removeEventListener("ended", onEnd)
      audio.removeEventListener("error", onError)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("volumechange", onVolume)
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  /** Phát từ đầu tới hết; ở chế độ thi thì sau khi hết bài không phát lại được. */
  const play = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.ended || ended) {
      if (!isPractice) return
      audio.currentTime = 0
      setPosition(0)
      setEnded(false)
    }
    audio
      .play()
      .then(() => setStarted(true))
      .catch(() => setError("Không phát được audio."))
  }, [ended, isPractice])

  /** Nút phát/dừng — chỉ tồn tại ở chế độ luyện tập. */
  const togglePlay = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio || !isPractice) return
    if (audio.paused) {
      play()
    } else {
      audio.pause()
    }
  }, [isPractice, play])

  /** Tua tới một mốc thời gian — chế độ thi bỏ qua hoàn toàn. */
  const seek = React.useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio || !isPractice) return
      const max = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : Math.max(0, seconds)
      const next = Math.min(Math.max(seconds, 0), max)
      audio.currentTime = next
      setPosition(next)
      if (next < max) setEnded(false)
    },
    [isPractice]
  )

  const setVolume = React.useCallback((v: number) => {
    const clamped = Math.min(Math.max(v, 0), 1)
    const audio = audioRef.current
    // Thiết bị không cho chỉnh âm lượng bằng phần mềm (iOS): giữ nguyên state
    // thật của audio, UI sẽ hiển thị hướng dẫn thay vì thanh kéo vô dụng.
    if (audio && Math.abs(audio.volume - clamped) > 0.001) {
      audio.volume = clamped
      if (Math.abs(audio.volume - clamped) > 0.001) return
    }
    setVolumeState(clamped)
    // Kéo thanh âm lượng khi đang tắt tiếng thì bật lại tiếng luôn.
    if (clamped > 0 && audio?.muted) {
      audio.muted = false
      setIsMuted(false)
    }
  }, [])

  const toggleMute = React.useCallback(() => {
    const audio = audioRef.current
    setIsMuted((m) => {
      const next = !m
      if (audio) audio.muted = next
      return next
    })
  }, [])

  /**
   * Đổi tốc độ phát (chỉ luyện tập). Nhớ lựa chọn cho lần vào sau để học sinh
   * không phải chỉnh lại khi chuyển part.
   */
  const setRate = React.useCallback(
    (value: number) => {
      if (!isPractice) return
      const audio = audioRef.current
      const clamped = Math.min(
        Math.max(value, PLAYBACK_RATES[0]),
        PLAYBACK_RATES[PLAYBACK_RATES.length - 1]
      )

      rateRef.current = clamped
      setRateState(clamped)
      if (audio) audio.playbackRate = clamped
      try {
        window.localStorage.setItem(RATE_STORAGE_KEY, String(clamped))
      } catch {
        // Chế độ riêng tư / chặn storage: bỏ qua, chỉ mất phần ghi nhớ.
      }
    },
    [isPractice]
  )

  const retry = React.useCallback(() => {
    setError(null)
    const audio = audioRef.current
    if (!audio) return
    audio.load()
    // Lần bấm này là user gesture nên trình duyệt cho phép play.
    audio
      .play()
      .then(() => setStarted(true))
      .catch(() => setError("Không phát được audio."))
  }, [])

  return {
    position,
    duration,
    volume,
    isMuted,
    isPlaying,
    volumeControlSupported,
    rate,
    error,
    ended,
    started,
    isPractice,
    play,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setRate,
    retry,
  }
}
