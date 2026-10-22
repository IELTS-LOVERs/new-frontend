"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { BandConversion, BandThreshold } from "@/lib/api/types"

type SkillTab = "listening" | "reading"

export interface BandConversionDefaults {
  listening: BandThreshold[]
  readingAcademic: BandThreshold[]
  readingGeneral: BandThreshold[]
}

interface BandConversionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: BandConversion
  defaults?: BandConversionDefaults
  onSave: (listening: BandThreshold[], reading: BandThreshold[]) => void
}

function cloneThresholds(items?: BandThreshold[]): BandThreshold[] {
  return (items ?? []).map((item) => ({ ...item }))
}

function defaultForSkill(
  defaults: BandConversionDefaults | undefined,
  readingType: "academic" | "general"
) {
  return {
    listening: cloneThresholds(defaults?.listening),
    reading: cloneThresholds(
      readingType === "general" ? defaults?.readingGeneral : defaults?.readingAcademic
    ),
  }
}

function validate(rows: BandThreshold[]): string | null {
  if (rows.length === 0) return "Cần ít nhất một mốc."
  if (!rows.some((row) => row.minRaw === 0)) return "Phải có mốc minRaw = 0."
  const seen = new Set<number>()
  for (const row of rows) {
    if (!Number.isInteger(row.minRaw) || row.minRaw < 0 || row.minRaw > 40) {
      return "minRaw phải là số nguyên 0–40."
    }
    if (seen.has(row.minRaw)) return `minRaw ${row.minRaw} bị trùng.`
    seen.add(row.minRaw)
    if (
      !Number.isFinite(row.band) ||
      row.band < 0 ||
      row.band > 9 ||
      Math.round(row.band * 2) / 2 !== row.band
    ) {
      return "Band phải nằm trong 0–9 và theo bước 0.5."
    }
  }
  const sorted = [...rows].sort((a, b) => a.minRaw - b.minRaw)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].band < sorted[i - 1].band) {
      return "Band phải tăng dần khi minRaw tăng."
    }
  }
  return null
}

export function BandConversionDialog({
  open,
  onOpenChange,
  value,
  defaults,
  onSave,
}: BandConversionDialogProps) {
  const readingType = value?.readingType ?? "academic"
  const fallback = defaultForSkill(defaults, readingType)
  const [tab, setTab] = React.useState<SkillTab>("listening")
  const [listening, setListening] = React.useState<BandThreshold[]>(
    cloneThresholds(value?.listeningThresholds ?? fallback.listening)
  )
  const [reading, setReading] = React.useState<BandThreshold[]>(
    cloneThresholds(value?.readingThresholds ?? fallback.reading)
  )
  const [error, setError] = React.useState<string | null>(null)
  const [wasOpen, setWasOpen] = React.useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const nextFallback = defaultForSkill(defaults, readingType)
      setListening(
        cloneThresholds(value?.listeningThresholds ?? nextFallback.listening)
      )
      setReading(cloneThresholds(value?.readingThresholds ?? nextFallback.reading))
      setTab("listening")
      setError(null)
    }
  }

  const rows = tab === "listening" ? listening : reading
  const setRows = tab === "listening" ? setListening : setReading

  const updateRow = (index: number, patch: Partial<BandThreshold>) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    )
  }

  const addRow = () => {
    setRows((current) => [...current, { minRaw: 0, band: 2 }])
  }

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  const resetToAuto = () => {
    setListening(cloneThresholds(defaults?.listening))
    setReading(
      cloneThresholds(
        readingType === "general"
          ? defaults?.readingGeneral
          : defaults?.readingAcademic
      )
    )
    setError(null)
  }

  const handleSave = () => {
    const listeningIssue = validate(listening)
    const readingIssue = validate(reading)
    const issue = listeningIssue ?? readingIssue
    if (issue) {
      setError(issue)
      return
    }
    onSave(
      [...listening].sort((a, b) => a.minRaw - b.minRaw),
      [...reading].sort((a, b) => a.minRaw - b.minRaw)
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] flex-col gap-4 overflow-hidden sm:max-w-3xl"
        style={{ display: "flex" }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Bảng quy đổi band tùy chỉnh</DialogTitle>
          <DialogDescription>
            Mỗi dòng là mốc điểm raw tối thiểu để đạt band tương ứng. App sẽ lấy
            mốc cao nhất mà điểm raw đạt được.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "listening" ? "default" : "outline"}
            onClick={() => setTab("listening")}
          >
            Listening
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "reading" ? "default" : "outline"}
            onClick={() => setTab("reading")}
          >
            Reading
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={resetToAuto}
            disabled={!defaults}
          >
            Khởi tạo từ bảng tự động
          </Button>
        </div>

        <div className="min-h-0 flex-auto overflow-y-auto rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_1fr_40px] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Band</span>
            <span>Điểm raw tối thiểu</span>
            <span />
          </div>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Chưa có mốc quy đổi. Bấm “Khởi tạo từ bảng tự động” hoặc thêm mốc.
            </p>
          ) : (
            rows.map((row, index) => (
              <div
                key={`${tab}-${index}`}
                className="grid grid-cols-[1fr_1fr_40px] items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0"
              >
                <Input
                  type="number"
                  min={0}
                  max={9}
                  step={0.5}
                  value={row.band}
                  onChange={(e) =>
                    updateRow(index, { band: Number(e.target.value) })
                  }
                  className="h-8 font-mono text-sm"
                />
                <Input
                  type="number"
                  min={0}
                  max={40}
                  step={1}
                  value={row.minRaw}
                  onChange={(e) =>
                    updateRow(index, { minRaw: Number(e.target.value) })
                  }
                  className="h-8 font-mono text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(index)}
                  aria-label="Xóa mốc"
                >
                  ×
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            + Thêm mốc
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Bảng cần có mốc minRaw = 0 và band tăng dần.
          </p>
        </div>

        {error && (
          <p className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="shrink-0 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" onClick={handleSave}>
            Lưu bảng quy đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
