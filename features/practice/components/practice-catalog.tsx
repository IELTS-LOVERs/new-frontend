"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  HeadphonesIcon,
  Book02Icon,
  PlayIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  FilterIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PracticeCatalogItem, SkillType } from "@/lib/api/types"

interface PracticeCatalogProps {
  items: PracticeCatalogItem[]
  isLoading?: boolean
  selectedSkill?: string
  onSkillChange: (skill: string) => void
  selectedCollection?: string
  onCollectionChange: (collection: string) => void
  search: string
  onSearchChange: (search: string) => void
}

export function PracticeCatalog({
  items,
  isLoading,
  selectedSkill = "all",
  onSkillChange,
  selectedCollection = "all",
  onCollectionChange,
  search,
  onSearchChange,
}: PracticeCatalogProps) {
  // Extract unique collections
  const collections = React.useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.curriculum?.collectionName) {
        set.add(item.curriculum.collectionName)
      }
    })
    return Array.from(set).sort()
  }, [items])

  // Group items by collection -> testNumber
  const grouped = React.useMemo(() => {
    const map = new Map<string, Map<number, PracticeCatalogItem[]>>()

    for (const item of items) {
      const colName = item.curriculum?.collectionName || "Bộ đề tự do"
      const testNum = item.curriculum?.testNumber ?? 1

      if (!map.has(colName)) {
        map.set(colName, new Map())
      }
      const testMap = map.get(colName)!
      if (!testMap.has(testNum)) {
        testMap.set(testNum, [])
      }
      testMap.get(testNum)!.push(item)
    }

    return map
  }, [items])

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex-1 relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên bài hoặc lộ trình..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Skill Filter */}
          <Select value={selectedSkill} onValueChange={onSkillChange}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Kỹ năng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Tất cả kỹ năng
              </SelectItem>
              <SelectItem value="listening" className="text-xs">
                Listening (Nghe)
              </SelectItem>
              <SelectItem value="reading" className="text-xs">
                Reading (Đọc)
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Collection Filter */}
          {collections.length > 0 && (
            <Select value={selectedCollection} onValueChange={onCollectionChange}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Bộ giáo trình" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Tất cả bộ đề
                </SelectItem>
                {collections.map((col) => (
                  <SelectItem key={col} value={col} className="text-xs">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Catalog Grouped List */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          Đang tải danh mục bài luyện tập...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Không tìm thấy bài luyện tập phù hợp</p>
          <p className="text-xs text-muted-foreground">
            Thử thay đổi kỹ năng hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([collectionName, testMap]) => (
            <div key={collectionName} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {collectionName}
                </h3>
                <Badge variant="outline" className="text-[11px] font-medium">
                  {Array.from(testMap.values()).reduce((sum, list) => sum + list.length, 0)} bài
                </Badge>
              </div>

              {Array.from(testMap.entries()).map(([testNum, testItems]) => (
                <Card key={testNum} className="border-border bg-card overflow-hidden">
                  <CardHeader className="py-3 px-4 sm:px-5 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Test {testNum}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-border/60">
                    {testItems.map((item) => {
                      const isListening = item.skills.includes("listening")
                      const status = item.progress.status

                      return (
                        <div
                          key={item.examId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-5 gap-3 hover:bg-muted/20 transition-colors"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold gap-1",
                                  isListening
                                    ? "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/5"
                                    : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                                )}
                              >
                                <HugeiconsIcon
                                  icon={isListening ? HeadphonesIcon : Book02Icon}
                                  size={12}
                                />
                                <span>{isListening ? "Listening" : "Reading"}</span>
                              </Badge>

                              {item.curriculum?.part && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {isListening
                                    ? `Part ${item.curriculum.part}`
                                    : `Passage ${item.curriculum.part}`}
                                </span>
                              )}

                              <h4 className="font-heading text-sm font-semibold text-foreground truncate">
                                {item.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{item.questionCount} câu hỏi</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <HugeiconsIcon icon={Clock01Icon} size={12} />
                                <span>{item.durationMinutes} phút</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress & Actions */}
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            {status === "completed" && (
                              <div className="text-right">
                                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {item.progress.rawScore !== undefined
                                    ? `${item.progress.rawScore}/${item.progress.totalPoints ?? item.totalPoints ?? item.questionCount} (${item.progress.percentage ?? 0}%)`
                                    : "Đã hoàn thành"}
                                </div>
                                {item.progress.lastSubmittedAt && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Nộp: {new Date(item.progress.lastSubmittedAt).toLocaleDateString("vi-VN")}
                                  </div>
                                )}
                              </div>
                            )}

                            {status === "not_started" && (
                              <Button asChild size="sm" className="gap-1.5 text-xs font-medium">
                                <Link href={`/exam/start/practice/${item.examId}`}>
                                  <HugeiconsIcon icon={PlayIcon} size={13} />
                                  <span>Làm bài ngay</span>
                                </Link>
                              </Button>
                            )}

                            {status === "in_progress" && (
                              <Button
                                asChild
                                size="sm"
                                variant="default"
                                className="gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <Link
                                  href={
                                    item.progress.attemptId
                                      ? `/exam/${item.progress.attemptId}`
                                      : `/exam/start/practice/${item.examId}`
                                  }
                                >
                                  <HugeiconsIcon icon={PlayIcon} size={13} />
                                  <span>Tiếp tục</span>
                                </Link>
                              </Button>
                            )}

                            {status === "completed" && item.progress.attemptId && (
                              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs font-medium">
                                <Link href={`/student/results/${item.progress.attemptId}`}>
                                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                                  <span>Xem lại & học từ vựng</span>
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
