"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

export interface MCOption {
  id: string
  text: string
}

export interface PoolItem {
  id: string
  text: string
}

export interface LabelItem {
  id: string
  label: string
}

interface MCOptionsConfigProps {
  options: MCOption[]
  isMultiple: boolean
  maxSelections: number
  questionCount: number
  examReadonly: boolean
  onAddOption: () => void
  onRemoveOption: (id: string) => void
  onUpdateOptionText: (index: number, text: string) => void
  onUpdateMaxSelections: (val: number) => void
  onEnsureQuestionCount?: (count: number) => void
}

export function MCOptionsConfig({
  options,
  isMultiple,
  maxSelections,
  questionCount,
  examReadonly,
  onAddOption,
  onRemoveOption,
  onUpdateOptionText,
  onUpdateMaxSelections,
  onEnsureQuestionCount,
}: MCOptionsConfigProps) {
  const multiSelectCount = isMultiple ? Math.max(2, maxSelections || 2) : 0

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">
          Danh sách lựa chọn (Options)
        </Label>
        {isMultiple && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Số đáp án được chọn:</span>
            <Input
              type="number"
              min={2}
              max={options.length || 5}
              value={maxSelections ?? 2}
              disabled={examReadonly}
              onChange={(e) => onUpdateMaxSelections(Number(e.target.value) || 2)}
              className="h-6 w-14 text-center font-mono text-xs"
            />
          </div>
        )}
      </div>

      {isMultiple && onEnsureQuestionCount && questionCount !== multiSelectCount && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          <span>
            Mỗi đáp án đúng là một câu hỏi: cần {multiSelectCount} câu, hiện có {questionCount}.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={examReadonly}
            onClick={() => onEnsureQuestionCount(multiSelectCount)}
            className="h-6 shrink-0 border-amber-500/40 px-2 text-[11px]"
          >
            {questionCount < multiSelectCount
              ? `Tạo đủ ${multiSelectCount} câu`
              : `Bớt còn ${multiSelectCount} câu`}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {options.map((opt, oIdx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
              {opt.id}
            </span>
            <Input
              value={opt.text}
              disabled={examReadonly}
              onChange={(e) => onUpdateOptionText(oIdx, e.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder={`Nội dung lựa chọn ${opt.id}...`}
            />
            {!examReadonly && options.length > 2 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveOption(opt.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!examReadonly && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddOption}
          className="h-7 gap-1 text-xs"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm lựa chọn{" "}
          {String.fromCharCode(65 + options.length)}
        </Button>
      )}
    </div>
  )
}

interface HeadingsPoolConfigProps {
  headingsPool: PoolItem[]
  examReadonly: boolean
  onAddHeading: () => void
  onRemoveHeading: (index: number) => void
  onUpdateHeadingText: (index: number, text: string) => void
}

export function HeadingsPoolConfig({
  headingsPool,
  examReadonly,
  onAddHeading,
  onRemoveHeading,
  onUpdateHeadingText,
}: HeadingsPoolConfigProps) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold text-foreground">
            Danh sách tiêu đề (List of Headings)
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Tạo danh sách các tiêu đề (số La Mã i, ii, iii...)
          </p>
        </div>
        {!examReadonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddHeading}
            className="h-7 gap-1 text-xs"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm Heading
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {headingsPool.map((h, hIdx) => (
          <div key={h.id} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-center font-mono text-xs font-bold text-primary">
              {h.id}
            </span>
            <Input
              value={h.text}
              disabled={examReadonly}
              onChange={(e) => onUpdateHeadingText(hIdx, e.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder={`Tiêu đề ${h.id}...`}
            />
            {!examReadonly && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveHeading(hIdx)}
                className="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ParagraphLabelsConfigProps {
  paragraphLabels: string[]
  allowReuse: boolean
  examReadonly: boolean
  onAddParagraph: () => void
  onRemoveParagraph: (index: number) => void
  onToggleAllowReuse: (allowed: boolean) => void
}

export function ParagraphLabelsConfig({
  paragraphLabels,
  allowReuse,
  examReadonly,
  onAddParagraph,
  onRemoveParagraph,
  onToggleAllowReuse,
}: ParagraphLabelsConfigProps) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">
          Các đoạn văn (Paragraphs)
        </Label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs select-none">
          <input
            type="checkbox"
            checked={allowReuse}
            disabled={examReadonly}
            onChange={(e) => onToggleAllowReuse(e.target.checked)}
            className="rounded border-border accent-primary"
          />
          <span className="text-muted-foreground">
            Cho phép dùng lại ký tự (NB: allow reuse)
          </span>
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {paragraphLabels.map((p, pIdx) => (
          <div
            key={p}
            className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-bold"
          >
            <span>{p}</span>
            {!examReadonly && paragraphLabels.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveParagraph(pIdx)}
                className="ml-0.5 text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!examReadonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddParagraph}
            className="h-7 text-xs"
          >
            + Đoạn {String.fromCharCode(65 + paragraphLabels.length)}
          </Button>
        )}
      </div>
    </div>
  )
}

interface FeaturesPoolConfigProps {
  featuresPool: PoolItem[]
  allowReuse: boolean
  examReadonly: boolean
  onAddFeature: () => void
  onRemoveFeature: (index: number) => void
  onUpdateFeatureText: (index: number, text: string) => void
  onToggleAllowReuse: (allowed: boolean) => void
}

export function FeaturesPoolConfig({
  featuresPool,
  allowReuse,
  examReadonly,
  onAddFeature,
  onRemoveFeature,
  onUpdateFeatureText,
  onToggleAllowReuse,
}: FeaturesFeaturesProps = {} as never) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold text-foreground">
            Danh sách đối tượng / đặc điểm (Features Pool)
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Ví dụ: Các nhà khoa học, thuyết, tổ chức...
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs select-none">
            <input
              type="checkbox"
              checked={allowReuse}
              disabled={examReadonly}
              onChange={(e) => onToggleAllowReuse(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span className="text-muted-foreground">Cho phép dùng lại</span>
          </label>
          {!examReadonly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFeature}
              className="h-7 gap-1 text-xs"
            >
              <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm đối tượng
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {featuresPool.map((f, fIdx) => (
          <div key={f.id} className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
              {f.id}
            </span>
            <Input
              value={f.text}
              disabled={examReadonly}
              onChange={(e) => onUpdateFeatureText(fIdx, e.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder="Tên người hoặc đặc điểm..."
            />
            {!examReadonly && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveFeature(fIdx)}
                className="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
type FeaturesFeaturesProps = FeaturesPoolConfigProps

interface EndingsPoolConfigProps {
  endingsPool: PoolItem[]
  examReadonly: boolean
  onAddEnding: () => void
  onRemoveEnding: (index: number) => void
  onUpdateEndingText: (index: number, text: string) => void
}

export function EndingsPoolConfig({
  endingsPool,
  examReadonly,
  onAddEnding,
  onRemoveEnding,
  onUpdateEndingText,
}: EndingsPoolConfigProps) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold text-foreground">
            Danh sách phần kết câu (Sentence Endings)
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Các phần kết câu A, B, C... để ghép với vế đầu câu.
          </p>
        </div>
        {!examReadonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddEnding}
            className="h-7 gap-1 text-xs"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} /> Thêm kết câu
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {endingsPool.map((e, eIdx) => (
          <div key={e.id} className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
              {e.id}
            </span>
            <Input
              value={e.text}
              disabled={examReadonly}
              onChange={(evt) => onUpdateEndingText(eIdx, evt.target.value)}
              className="h-8 flex-1 text-xs"
              placeholder="Nội dung kết thúc câu..."
            />
            {!examReadonly && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveEnding(eIdx)}
                className="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface OptionsPoolConfigProps {
  optionsPool: PoolItem[]
  allowChangeAnswer: boolean
  examReadonly: boolean
  onAddOptionsPoolItem: () => void
  onRemoveOptionsPoolItem: (index: number) => void
  onUpdateOptionsPoolItemText: (index: number, text: string) => void
  onToggleAllowChangeAnswer: (allowed: boolean) => void
}

export function OptionsPoolConfig({
  optionsPool,
  allowChangeAnswer,
  examReadonly,
  onAddOptionsPoolItem,
  onRemoveOptionsPoolItem,
  onUpdateOptionsPoolItemText,
  onToggleAllowChangeAnswer,
}: OptionsPoolConfigProps) {
  return (
    <div className="space-y-2 border-t border-border pt-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">
          Ngân hàng từ khóa (Word Bank / Options Pool)
        </Label>
        {!examReadonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddOptionsPoolItem}
            className="h-6 gap-1 text-xs"
          >
            <HugeiconsIcon icon={Add01Icon} size={11} /> Thêm từ
          </Button>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs select-none">
        <input
          type="checkbox"
          checked={allowChangeAnswer}
          disabled={examReadonly}
          onChange={(e) => onToggleAllowChangeAnswer(e.target.checked)}
          className="mt-0.5 rounded border-border accent-primary"
        />
        <span>
          <span className="font-medium text-foreground">Cho phép chọn lại đáp án</span>
          <span className="block text-[11px] text-muted-foreground">
            Khi tắt, học sinh chỉ chọn được một lần cho mỗi ô.
          </span>
        </span>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {optionsPool.map((opt, oIdx) => (
          <div key={opt.id} className="flex items-center gap-1.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-bold text-primary">
              {opt.id}
            </span>
            <Input
              value={opt.text}
              disabled={examReadonly}
              onChange={(e) => onUpdateOptionsPoolItemText(oIdx, e.target.value)}
              className="h-7 flex-1 text-xs"
              placeholder="Từ / cụm từ..."
            />
            {!examReadonly && (
              <button
                type="button"
                onClick={() => onRemoveOptionsPoolItem(oIdx)}
                className="text-sm text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface LabellingLabelsConfigProps {
  labels: LabelItem[]
  examReadonly: boolean
  onAddLabel: () => void
  onRemoveLabel: (index: number) => void
  onUpdateLabelText: (index: number, label: string) => void
}

export function LabellingLabelsConfig({
  labels,
  examReadonly,
  onAddLabel,
  onRemoveLabel,
  onUpdateLabelText,
}: LabellingLabelsConfigProps) {
  return (
    <div className="space-y-2 border-t border-border pt-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Danh sách nhãn (Labels)</Label>
        {!examReadonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddLabel}
            className="h-6 gap-1 text-xs"
          >
            <HugeiconsIcon icon={Add01Icon} size={11} /> Thêm nhãn
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {labels.map((l, lIdx) => (
          <div
            key={l.id}
            className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs"
          >
            <span className="font-bold text-primary">{l.id}</span>
            <Input
              value={l.label}
              disabled={examReadonly}
              onChange={(e) => onUpdateLabelText(lIdx, e.target.value)}
              className="h-6 w-24 text-xs"
              placeholder="Tên vị trí..."
            />
            {!examReadonly && (
              <button
                type="button"
                onClick={() => onRemoveLabel(lIdx)}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
