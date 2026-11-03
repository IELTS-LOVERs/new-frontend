"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons"
import {
  PLAYBACK_RATES,
  useExamAudioPlayer,
  type ExamAudioMode,
} from "@/features/exam-engine/hooks/use-audio-player"
import { formatDuration } from "@/lib/format"
import { RichText } from "@/features/exam-engine/components/rich-text"
import { MediaImages } from "@/features/exam-engine/components/exam-media"
import { GroupRenderer } from "@/features/exam-engine/components/group-renderer"
import type { CandidateSection } from "@/lib/api/types"

export interface SectionProps {
  section: CandidateSection
  sectionIndex?: number
  answers: Record<string, { value: string; updatedAt: number; dirty: boolean }>
  flagged: Record<string, true>
  onAnswer: (questionId: string, value: string) => void
  onToggleFlag: (questionId: string) => void
  uiTheme?: "white" | "cream"
  selectionDisabled?: boolean
  /** `practice` cho phép phát/dừng/tua; `exam` chỉ nghe 1 lần như thi thật. */
  audioMode?: ExamAudioMode
  /** Phạm vi nhớ vị trí audio (attemptId) — tránh lẫn giữa các lượt thi. */
  audioScope?: string
}

export function ListeningSection({
  section,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  uiTheme,
  audioMode = "exam",
  audioScope,
}: SectionProps) {
  const audioMedia = section.media?.find((m) => m.type === "audio")
  const isPractice = audioMode === "practice"
  const audio = useExamAudioPlayer(audioMedia?.url ?? null, {
    mode: audioMode,
    // Thi máy: audio tự chạy. Luyện tập: học sinh tự bấm phát.
    autoplay: !isPractice,
    // Cùng một file audio chỉ phát 1 lần trong một lượt thi.
    scope: audioScope,
  })

  const progressPercent =
    audio.duration > 0 ? (audio.position / audio.duration) * 100 : 0

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Sticky audio player */}
      {audioMedia?.url && (
        <div
          className={cn(
            "sticky top-0 z-20 flex flex-col gap-2 border-b px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-8 sm:py-3",
            uiTheme === "cream"
              ? "border-[#E8E4DD] bg-[#FAF8F5]/95"
              : "border-border bg-card/95"
          )}
        >
          {/* Điều khiển (chỉ có ở chế độ luyện tập) + tiến trình */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {isPractice && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={audio.togglePlay}
                  disabled={audio.error !== null}
                  aria-label={audio.isPlaying ? "Tạm dừng" : "Phát"}
                  title={audio.isPlaying ? "Tạm dừng" : "Phát"}
                  className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <HugeiconsIcon
                    icon={audio.isPlaying ? PauseIcon : PlayIcon}
                    size={18}
                  />
                </button>

                {/* Tốc độ phát: chỉ luyện tập (thi thật luôn 1×). */}
                <label className="shrink-0">
                  <span className="sr-only">Tốc độ phát</span>
                  <select
                    value={String(audio.rate)}
                    onChange={(e) => audio.setRate(Number(e.target.value))}
                    disabled={audio.error !== null}
                    title="Tốc độ phát"
                    className={cn(
                      "h-7 cursor-pointer rounded-md border border-border bg-surface px-1 font-mono text-[11px] font-semibold outline-hidden transition-colors hover:border-primary/60 focus:border-focus focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-40",
                      audio.rate === 1
                        ? "text-muted-foreground"
                        : "border-primary/50 text-primary"
                    )}
                  >
                    {PLAYBACK_RATES.map((value) => (
                      <option key={value} value={value}>
                        {value}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      audio.error
                        ? "bg-destructive"
                        : audio.isPlaying
                          ? "animate-pulse bg-emerald-500"
                          : "bg-muted-foreground/40"
                    )}
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {audioMedia.originalName || `${section.title} audio`}
                  </span>
                </span>
                <span className="shrink-0">
                  {formatDuration(Math.floor(audio.position))} /{" "}
                  {formatDuration(Math.floor(audio.duration))}
                </span>
              </div>

              {isPractice ? (
                <input
                  type="range"
                  min={0}
                  max={audio.duration > 0 ? audio.duration : 0}
                  step={0.1}
                  value={Math.min(audio.position, audio.duration || 0)}
                  onChange={(e) => audio.seek(Number(e.target.value))}
                  disabled={audio.duration <= 0 || audio.error !== null}
                  aria-label="Tua audio"
                  className="h-6 w-full cursor-pointer touch-none accent-primary disabled:cursor-not-allowed"
                />
              ) : (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Âm lượng (ẩn trên thiết bị cảm ứng) */}
          <div className="flex shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground empty:hidden sm:gap-3 sm:pl-4">
            {audio.error && (
              <Button
                variant="outline"
                size="sm"
                onClick={audio.retry}
                className="h-7 text-xs"
              >
                Thử lại
              </Button>
            )}

            <div className="hidden items-center gap-1.5 [@media(pointer:fine)]:flex">
              <button
                type="button"
                onClick={audio.toggleMute}
                aria-label={audio.isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                title={audio.isMuted ? "Bật âm thanh" : "Tắt tiếng"}
                className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={
                    audio.isMuted || !audio.volumeControlSupported
                      ? VolumeOffIcon
                      : VolumeHighIcon
                  }
                  size={16}
                  className={audio.isMuted ? "text-destructive" : ""}
                />
              </button>

              {audio.volumeControlSupported ? (
                <>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={audio.isMuted ? 0 : Math.round(audio.volume * 100)}
                    onChange={(e) =>
                      audio.setVolume(Number(e.target.value) / 100)
                    }
                    aria-label="Điều chỉnh âm lượng"
                    title="Điều chỉnh âm lượng"
                    className="h-6 w-24 cursor-pointer touch-none accent-primary sm:w-28"
                  />
                  <span className="w-9 shrink-0 text-right font-mono text-xs">
                    {audio.isMuted ? "0%" : `${Math.round(audio.volume * 100)}%`}
                  </span>
                </>
              ) : (
                <span className="text-[11px] leading-tight text-muted-foreground">
                  Dùng phím âm lượng
                  <br className="sm:hidden" /> của thiết bị
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6 md:p-8">
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
            {section.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <RichText text={section.instructions} />
          </p>
        </div>

        <MediaImages media={section.media} />

        <div className="space-y-8">
          {(section.questionGroups ?? []).map((group) => (
            <GroupRenderer
              key={group.id}
              group={group}
              answers={answers}
              flagged={flagged}
              onAnswer={onAnswer}
              onToggleFlag={onToggleFlag}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
