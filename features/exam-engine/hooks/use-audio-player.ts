"use client"

import * as React from "react"

/**
 * Audio player cho phòng thi Listening.
 * Chuẩn thi máy IELTS: phát 1 lần, không tạm dừng, không tua. Chỉ chỉnh âm lượng.
 */
export function useExamAudioPlayer(src: string | null, options?: { autoplay?: boolean }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [position, setPosition] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolumeState] = React.useState(0.8)
  const [isMuted, setIsMuted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ended, setEnded] = React.useState(false)
  const [started, setStarted] = React.useState(false)

  React.useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio
    audio.preload = "auto"
    audio.volume = 0.8

    const onTime = () => setPosition(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => setEnded(true)
    const onError = () => setError("Không tải được audio. Vui lòng thử lại.")

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("ended", onEnd)
    audio.addEventListener("error", onError)

    if (options?.autoplay) {
      audio
        .play()
        .then(() => setStarted(true))
        .catch(() => setError("Trình duyệt chặn phát tự động. Bấm nút Phát để bắt đầu."))
    }

    return () => {
      audio.pause()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("ended", onEnd)
      audio.removeEventListener("error", onError)
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const play = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio || ended) return
    audio.play().then(() => setStarted(true)).catch(() => setError("Không phát được audio."))
  }, [ended])

  const setVolume = React.useCallback((v: number) => {
    const audio = audioRef.current
    setVolumeState(v)
    if (audio) audio.volume = v
  }, [])

  const toggleMute = React.useCallback(() => {
    const audio = audioRef.current
    setIsMuted((m) => {
      const next = !m
      if (audio) audio.muted = next
      return next
    })
  }, [])

  const retry = React.useCallback(() => {
    setError(null)
    const audio = audioRef.current
    if (audio) {
      audio.load()
      if (started) audio.play().catch(() => setError("Không phát được audio."))
    }
  }, [started])

  return {
    position,
    duration,
    volume,
    isMuted,
    error,
    ended,
    started,
    play,
    setVolume,
    toggleMute,
    retry,
  }
}
