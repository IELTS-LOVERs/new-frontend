"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  RefreshIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { useQuestionsQuery } from "@/hooks/use-questions"
import { QUESTION_GROUP_TYPE_LABEL, SKILL_LABEL } from "@/lib/format"
import type { BankQuestionGroup, CandidateSection } from "@/lib/api/types"

export function BankGroupSheet({
  open,
  onOpenChange,
  section,
  onAddGroups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  section?: CandidateSection
  onAddGroups: (groups: BankQuestionGroup[]) => void
}) {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelected([])
      setQuery("")
    }
    onOpenChange(next)
  }

  const bankQuery = useQuestionsQuery(
    {
      skill: section?.skill,
      part: section?.part,
      scope: "all",
      search: query || undefined,
      limit: 50,
    },
    open && !!section
  )

  const candidates: BankQuestionGroup[] = bankQuery.data?.items ?? []

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleAdd = () => {
    const selectedGroups = candidates.filter((g) => selected.includes(g.id))
    onAddGroups(selectedGroups)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold">Thêm nhóm câu hỏi từ ngân hàng</SheetTitle>
          <SheetDescription className="text-xs">
            Đã lọc theo {section && SKILL_LABEL[section.skill]} · Part {section?.part}. Nhóm được chèn dưới dạng bản sao và đánh số lại.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nhóm câu hỏi..."
              className="h-9 pl-9 text-sm"
            />
          </div>
          <ScrollArea className="min-h-48 flex-1">
            <div className="space-y-2 pr-2">
              {bankQuery.isLoading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : bankQuery.isError ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <p className="text-xs text-muted-foreground">
                    {bankQuery.error instanceof ApiError
                      ? bankQuery.error.message
                      : "Không tải được ngân hàng câu hỏi."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => bankQuery.refetch()}
                  >
                    <HugeiconsIcon icon={RefreshIcon} size={13} /> Thử lại
                  </Button>
                </div>
              ) : candidates.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Không tìm thấy nhóm câu hỏi phù hợp với phần này.
                </p>
              ) : (
                candidates.map((g) => {
                  const checked = selected.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggle(g.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}
                      >
                        {checked && <HugeiconsIcon icon={Tick02Icon} size={11} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {QUESTION_GROUP_TYPE_LABEL[g.groupType] || g.groupType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {g.questions.length} câu · Part {g.part}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium text-foreground">
                          {g.instructions || g.questions[0]?.prompt || "—"}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Đã chọn {selected.length} nhóm</span>
            <Button
              disabled={selected.length === 0}
              onClick={handleAdd}
              className="font-semibold"
            >
              Thêm {selected.length > 0 ? `${selected.length} ` : ""}nhóm
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
