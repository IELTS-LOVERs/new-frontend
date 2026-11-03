"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Alert02Icon,
  Copy01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { BuilderExam, BuilderSection, SkillType } from "@/lib/api/types"

export interface ExamBuilderSidebarProps {
  exam: BuilderExam
  examReadonly: boolean
  activeIndex: number
  setActiveIndex: (index: number) => void
  onRenumberAll: () => void
  onAddSection: (skill: SkillType) => void
  onDuplicateSection: (index: number) => void
  onRequestRemoveSection: (index: number) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDropSection: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  dropTarget: { index: number; position: "top" | "bottom" } | null
  dragIndex: number | null
  grouped: Array<{
    skill: SkillType
    sections: Array<{ section: BuilderSection; index: number }>
  }>
  skillIcon: Record<SkillType, React.ComponentProps<typeof HugeiconsIcon>["icon"]>
  skillLabel: Record<SkillType, string>
  maxParts: Record<SkillType, number>
  skillOrder: SkillType[]
}

export function ExamBuilderSidebar({
  exam,
  examReadonly,
  activeIndex,
  setActiveIndex,
  onRenumberAll,
  onAddSection,
  onDuplicateSection,
  onRequestRemoveSection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDropSection,
  dropTarget,
  dragIndex,
  grouped,
  skillIcon,
  skillLabel,
  maxParts,
  skillOrder,
}: ExamBuilderSidebarProps) {
  return (
    <Card className="h-fit border-border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border pb-3">
        <CardTitle className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Cấu trúc đề
        </CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={examReadonly}
              onClick={onRenumberAll}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={RefreshIcon} size={13} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Đánh số lại câu hỏi</TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="space-y-4 p-3">
        {grouped.map((group) => (
          <div key={group.skill} className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-foreground">
              <HugeiconsIcon icon={skillIcon[group.skill]} size={14} className="text-primary" />
              {skillLabel[group.skill]}
            </div>
            {group.sections.map(({ section, index }) => {
              const groups = section.questionGroups ?? []
              const count = groups.reduce((acc, g) => acc + g.questions.length, 0)
              const missing =
                (section.skill === "listening" &&
                  !((section.media ?? []).length > 0 || (section.mediaIds?.length ?? 0) > 0)) ||
                (section.skill === "reading" && !section.passageText?.trim())
              const atMaxParts =
                exam.sections.filter((s) => s.skill === section.skill).length >=
                maxParts[section.skill]
              const isDropTarget =
                dropTarget?.index === index && dragIndex !== null && dragIndex !== index
              const isDragging = dragIndex === index
              return (
                <div key={section.id ?? `${section.skill}-${index}`} className="relative">
                  {isDropTarget && dropTarget?.position === "top" && (
                    <span className="pointer-events-none absolute -top-1 right-1 left-1 z-10 h-0.5 rounded-full bg-primary" />
                  )}
                  <div
                    draggable={!examReadonly}
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragEnd={onDragEnd}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragLeave={(e) => onDragLeave(e, index)}
                    onDrop={(e) => onDropSection(e, index)}
                    className={cn(
                      "group flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 transition-colors",
                      activeIndex === index
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted",
                      !examReadonly && "cursor-grab active:cursor-grabbing",
                      isDragging && "opacity-40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className="flex flex-1 items-center justify-between gap-2 text-left text-xs truncate"
                    >
                      <span className="truncate">
                        {section.skill === "reading"
                          ? `Passage ${section.part}`
                          : section.skill === "writing"
                            ? `Task ${section.part}`
                            : `Part ${section.part}`}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {count > 0 && <span className="font-mono text-[10px]">({count})</span>}
                        {(count === 0 || missing) && (
                          <HugeiconsIcon icon={Alert02Icon} size={12} className="text-amber-600" />
                        )}
                      </span>
                    </button>
                    {!examReadonly && (
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <span
                          aria-hidden
                          title="Kéo để đổi thứ tự"
                          className="flex h-5 w-5 items-center justify-center text-muted-foreground/60"
                        >
                          <HugeiconsIcon icon={DragDropVerticalIcon} size={13} />
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={atMaxParts}
                          onClick={(e) => {
                            e.stopPropagation()
                            onDuplicateSection(index)
                          }}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          title={
                            atMaxParts
                              ? `${skillLabel[section.skill]} đã đủ ${maxParts[section.skill]} phần`
                              : "Nhân bản phần này"
                          }
                        >
                          <HugeiconsIcon icon={Copy01Icon} size={11} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRequestRemoveSection(index)
                          }}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          title="Xoá phần này"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={11} />
                        </Button>
                      </div>
                    )}
                  </div>
                  {isDropTarget && dropTarget?.position === "bottom" && (
                    <span className="pointer-events-none absolute -bottom-1 right-1 left-1 z-10 h-0.5 rounded-full bg-primary" />
                  )}
                </div>
              )
            })}
          </div>
        ))}

        <Separator />
        <div className="space-y-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Thêm phần
          </p>
          {skillOrder.map((skill) => {
            const atMax = (exam.sections.filter((s) => s.skill === skill).length ?? 0) >= maxParts[skill]
            return (
              <Button
                key={skill}
                variant="ghost"
                size="sm"
                disabled={examReadonly || atMax}
                title={atMax ? `${skillLabel[skill]} đã đủ ${maxParts[skill]} phần` : undefined}
                onClick={() => onAddSection(skill)}
                className="w-full justify-start gap-2 text-xs"
              >
                <HugeiconsIcon icon={Add01Icon} size={13} />
                {skillLabel[skill]}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
