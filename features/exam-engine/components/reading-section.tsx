"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useExamSessionStore } from "@/stores/exam-session.store"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  HighlightControls,
  HighlightLayer,
  SelectableHighlightedText,
} from "@/features/exam-engine/components/highlight-layer"
import { RichText } from "@/features/exam-engine/components/rich-text"
import { RichDocView } from "@/features/rich-text/render"
import { SelectableRichDoc } from "@/features/rich-text/selectable"
import { MediaImages } from "@/features/exam-engine/components/exam-media"
import { GroupRenderer } from "@/features/exam-engine/components/group-renderer"
import type { SectionProps } from "./listening-section"

export function ReadingSection({
  section,
  sectionIndex = 0,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
  selectionDisabled = false,
}: SectionProps) {
  const highlights = useExamSessionStore((s) => s.highlights)
  const setHighlights = useExamSessionStore((s) => s.setHighlights)
  const isMobile = useIsMobile()

  const passageContent = (
    <div className="w-full space-y-4 p-4 sm:space-y-6 sm:p-6 md:px-8 md:py-6 lg:px-10 lg:py-8">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur-xs sm:-mx-6 sm:-mt-6 sm:mb-6 sm:px-6 sm:py-3 md:-mx-8 md:-mt-6 md:mb-6 md:px-8 md:py-3.5 lg:-mx-10 lg:px-10">
        <Badge
          variant="outline"
          className="text-xs sm:text-sm font-semibold text-primary truncate max-w-[160px] sm:max-w-none"
        >
          {section.title}
        </Badge>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">
            {selectionDisabled
              ? "Vẫn có thể bôi đen để highlight / ghi chú · Không thể sao chép"
              : "Bôi đen để highlight / ghi chú"}
          </span>
          <HighlightControls />
        </div>
      </div>
      <MediaImages media={section.media} className="mb-4" />

      <div className="space-y-6 font-serif text-[15px] sm:text-base md:text-[17px] lg:text-[18px] leading-[1.85] whitespace-pre-line text-foreground/95 select-text tracking-normal">
        {section.passageDoc ? (
          <SelectableRichDoc targetId="passage" doc={section.passageDoc} />
        ) : (
          <SelectableHighlightedText
            targetId="passage"
            text={section.passageText ?? ""}
          />
        )}
      </div>
    </div>
  )

  const questionsContent = (
    <div className="w-full space-y-4 p-4 sm:space-y-6 sm:p-6 md:px-8 md:py-6 lg:px-10 lg:py-8">
      <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
          {section.title}
        </h3>
        {section.instructionsDoc ? (
          <RichDocView
            doc={section.instructionsDoc}
            className="text-xs sm:text-sm text-muted-foreground"
          />
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <RichText text={section.instructions} />
          </p>
        )}
      </div>

      <div className="space-y-6 sm:space-y-8">
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
  )

  return (
    <HighlightLayer
      sectionIndex={sectionIndex}
      items={highlights}
      onItemsChange={setHighlights}
      disabled={false}
      className="h-full"
    >
      <ResizablePanelGroup
        key={isMobile ? "vertical" : "horizontal"}
        orientation={isMobile ? "vertical" : "horizontal"}
        className="h-full w-full"
      >
        <ResizablePanel
          defaultSize={50}
          minSize={25}
          className="overflow-y-auto border-b md:border-b-0 md:border-r border-border bg-card"
        >
          {passageContent}
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="touch-none bg-border/80 hover:bg-primary/50 transition-colors aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:after:h-6 aria-[orientation=vertical]:w-2 aria-[orientation=vertical]:after:w-6"
        />

        <ResizablePanel
          defaultSize={50}
          minSize={25}
          className="overflow-y-auto bg-muted/10"
        >
          {questionsContent}
        </ResizablePanel>
      </ResizablePanelGroup>
    </HighlightLayer>
  )
}
