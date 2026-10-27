"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Book02Icon,
  HeadphonesIcon,
  PencilEdit02Icon,
  Search01Icon,
  Clock01Icon,
  PlayIcon,
  CheckmarkCircle02Icon,
  SparklesIcon,
  FilterIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { usePracticeCatalogQuery } from "@/hooks/use-practice"
import type { PracticeCatalogItem } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// Topic stock images for IELTS reading & listening passages
const TOPIC_COVERS = [
  "https://images.unsplash.com/photo-1520763185298-1b434c919102?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
]

function getExamCoverUrl(
  examId: string,
  title: string,
  index: number,
  customBannerUrl?: string | null
): string {
  if (customBannerUrl && customBannerUrl.trim()) {
    return customBannerUrl.trim()
  }
  let hash = 0
  const str = examId || title
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const pos = Math.abs(hash + index) % TOPIC_COVERS.length
  return TOPIC_COVERS[pos]
}

function getExamPartInfo(
  item: PracticeCatalogItem,
  skill: "reading" | "listening" | "writing"
) {
  if (skill === "writing") {
    const tasks = Array.from(
      new Set(
        (item.sections ?? []).filter((s) => s.skill === "writing").map((s) => s.part)
      )
    ).sort((a, b) => a - b)
    const isFull = tasks.length > 1
    return {
      parts: tasks,
      isMultiPart: isFull,
      isFull,
      badgeLabel:
        tasks.length === 0
          ? "Writing Practice"
          : isFull
            ? "Full Writing (Task 1 + 2)"
            : `Task ${tasks[0]}`,
    }
  }

  const skillSections = (item.sections ?? []).filter((s) => s.skill === skill)
  const partsFromSections = skillSections.map((s) => s.part)
  const allParts = Array.from(
    new Set([
      ...(item.curriculum?.part ? [item.curriculum.part] : []),
      ...(item.parts ?? []),
      ...partsFromSections,
    ])
  ).sort((a, b) => a - b)

  // Title fallback if part not specified in metadata
  if (allParts.length === 0) {
    const t = item.title.toLowerCase()
    if (skill === "reading") {
      if (t.includes("passage 1") || t.includes("part 1")) allParts.push(1)
      else if (t.includes("passage 2") || t.includes("part 2")) allParts.push(2)
      else if (t.includes("passage 3") || t.includes("part 3")) allParts.push(3)
    } else if (skill === "listening") {
      if (t.includes("part 1") || t.includes("section 1")) allParts.push(1)
      else if (t.includes("part 2") || t.includes("section 2")) allParts.push(2)
      else if (t.includes("part 3") || t.includes("section 3")) allParts.push(3)
      else if (t.includes("part 4") || t.includes("section 4")) allParts.push(4)
    }
  }

  const isMultiPart = allParts.length > 1
  const isFull =
    (skill === "reading" && allParts.length >= 3) ||
    (skill === "listening" && allParts.length >= 4)

  let badgeLabel = ""
  if (isFull) {
    badgeLabel = skill === "reading" ? "Full Test (3 Passages)" : "Full Test (4 Parts)"
  } else if (isMultiPart) {
    const prefix = skill === "reading" ? "Passage" : "Part"
    badgeLabel = `${prefix} ${allParts.join(", ")}`
  } else if (allParts.length === 1) {
    const prefix = skill === "reading" ? "Passage" : "Part"
    badgeLabel = `${prefix} ${allParts[0]}`
  } else {
    badgeLabel = skill === "reading" ? "Reading Practice" : "Listening Practice"
  }

  return {
    parts: allParts,
    isMultiPart,
    isFull,
    badgeLabel,
  }
}

function formatQuestionTypeLabel(type: string): string {
  switch (type) {
    case "multiple_choice_single":
      return "Multiple Choice"
    case "multiple_choice_multiple":
      return "Multiple Choice (Many Answers)"
    case "true_false_not_given":
      return "True - False - Not Given"
    case "yes_no_not_given":
      return "Yes - No - Not Given"
    case "matching_headings":
      return "Matching Headings"
    case "matching_information":
      return "Matching Information"
    case "matching_features":
      return "Matching Features"
    case "matching_sentence_endings":
      return "Matching Sentence Endings"
    case "sentence_completion":
    case "note_completion":
    case "table_completion":
    case "summary_completion":
    case "summary_completion_options":
    case "form_completion":
    case "flow_chart_completion":
      return "Gap Filling"
    case "writing_task_1":
      return "Writing Task 1"
    case "writing_task_2":
      return "Writing Task 2"
    default:
      return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

type PracticeSkill = "reading" | "listening" | "writing"

export default function StudentPracticePage() {
  // Active Skill: reading | listening | writing
  const [activeSkill, setActiveSkill] = React.useState<PracticeSkill>("reading")

  // Practice Mode: single (Bài lẻ) | full (Full đề) | dictation
  const [practiceMode, setPracticeMode] = React.useState<"single" | "full" | "dictation">("single")

  // Sub part/passage filter: 0 = all, 1 = P1, 2 = P2, 3 = P3, 4 = P4
  const [subPart, setSubPart] = React.useState<number>(0)

  // Status Tab: 'uncompleted' | 'completed'
  const [statusTab, setStatusTab] = React.useState<"uncompleted" | "completed">("uncompleted")

  // Search
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")

  // Fetch real items from backend API
  const catalogQuery = usePracticeCatalogQuery({
    skill: activeSkill,
    search: searchQuery.trim() || undefined,
  })

  const rawDbItems: PracticeCatalogItem[] = catalogQuery.data?.items ?? []
  const catalogError = catalogQuery.isError
    ? catalogQuery.error instanceof Error
      ? catalogQuery.error.message
      : "Không tải được danh mục luyện tập."
    : null

  // Filter 100% real database items
  const displayItems = React.useMemo(() => {
    return rawDbItems.filter((item) => {
      // 1. Skill filter
      if (activeSkill === "reading" && !item.skills.includes("reading")) return false
      if (activeSkill === "listening" && !item.skills.includes("listening")) return false
      if (activeSkill === "writing" && !item.skills.includes("writing")) return false

      // 2. Sub-part filter (Passage 1, 2, 3 or Part 1, 2, 3, 4, or Multi-part / Full Test)
      if (practiceMode === "single") {
        if (subPart > 0) {
          const { parts } = getExamPartInfo(item, activeSkill as "reading" | "listening")
          if (!parts.includes(subPart)) return false
        } else if (subPart === -1) {
          const { isMultiPart, isFull } = getExamPartInfo(item, activeSkill as "reading" | "listening")
          if (!isMultiPart && !isFull) return false
        }
      }

      // 3. Status Tab filter
      if (statusTab === "uncompleted") {
        if (item.progress.status === "completed") return false
      } else if (statusTab === "completed") {
        if (item.progress.status !== "completed") return false
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchCollection = (item.curriculum?.collectionName ?? "").toLowerCase().includes(q)
        const matchTags = (item.questionTypes ?? []).some((t) => t.toLowerCase().includes(q))
        if (!matchTitle && !matchCollection && !matchTags) return false
      }

      return true
    })
  }, [rawDbItems, activeSkill, practiceMode, subPart, statusTab, searchQuery])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
  }

  // Count uncompleted and completed directly from real DB
  const uncompletedCount = React.useMemo(() => {
    return rawDbItems.filter((i) => {
      if (!i.skills.includes(activeSkill)) return false
      return i.progress.status !== "completed"
    }).length
  }, [rawDbItems, activeSkill])

  const completedCount = React.useMemo(() => {
    return rawDbItems.filter((i) => {
      if (!i.skills.includes(activeSkill)) return false
      return i.progress.status === "completed"
    }).length
  }, [rawDbItems, activeSkill])

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 animate-fade-in font-sans">
      {/* ─── 1. TOP SKILL HEADER BAR (Design System Primary Accent) ────────── */}
      <div className="flex items-center gap-6 border-b border-border px-1 overflow-x-auto select-none">
        <button
          onClick={() => {
            setActiveSkill("reading")
            setPracticeMode("single")
            setSubPart(0)
          }}
          className={cn(
            "flex items-center gap-2 pb-3 pt-1 text-sm font-semibold transition-all cursor-pointer relative",
            activeSkill === "reading"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <HugeiconsIcon icon={Book02Icon} size={17} className={activeSkill === "reading" ? "text-primary" : ""} />
          <span>Reading</span>
          {activeSkill === "reading" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveSkill("listening")
            setPracticeMode("single")
            setSubPart(0)
          }}
          className={cn(
            "flex items-center gap-2 pb-3 pt-1 text-sm font-semibold transition-all cursor-pointer relative",
            activeSkill === "listening"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <HugeiconsIcon icon={HeadphonesIcon} size={17} className={activeSkill === "listening" ? "text-primary" : ""} />
          <span>Listening</span>
          {activeSkill === "listening" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveSkill("writing")
            setPracticeMode("single")
            setSubPart(0)
          }}
          className={cn(
            "flex items-center gap-2 pb-3 pt-1 text-sm font-semibold transition-all cursor-pointer relative",
            activeSkill === "writing"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} size={17} className={activeSkill === "writing" ? "text-primary" : ""} />
          <span>Writing</span>
          {activeSkill === "writing" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>


      {/* ─── 2. SUB-FILTER ROW & SEARCH BAR (Design System Primary) ─────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left: Tab Switcher & Link to History */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => setStatusTab("uncompleted")}
              className={cn(
                "font-semibold transition-colors cursor-pointer relative pb-1",
                statusTab === "uncompleted"
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Bài chưa làm ({uncompletedCount})</span>
              {statusTab === "uncompleted" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>

            <button
              onClick={() => setStatusTab("completed")}
              className={cn(
                "font-semibold transition-colors cursor-pointer relative pb-1",
                statusTab === "completed"
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Bài đã làm ({completedCount})</span>
              {statusTab === "completed" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          <Link
            href="/student/results"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-colors"
          >
            <HugeiconsIcon icon={Clock01Icon} size={14} />
            <span>Xem lịch sử làm bài</span>
          </Link>
        </div>

        {/* Right: Pill Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center">
          <div className="relative flex items-center w-full sm:w-72 bg-card border border-border rounded-full pl-3 pr-1 py-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <HugeiconsIcon icon={Search01Icon} size={14} className="text-muted-foreground shrink-0 mr-2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên bài tập"
              maxLength={200}
              className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-muted-foreground/70"
            />
            <button
              type="submit"
              className="px-3.5 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {/* ─── 4. MAIN LAYOUT: LEFT SIDEBAR FILTERS + RIGHT PRACTICE GRID ─────── */}
      <div className="flex flex-col lg:flex-row items-start gap-6 pt-1">
        {/* Left Filter Sidebar */}
        <div className="w-full lg:w-60 xl:w-64 shrink-0 space-y-3">
          {/* Header Card */}
          <div className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              <HugeiconsIcon icon={FilterIcon} size={15} />
            </div>
            <div className="leading-tight">
              <h3 className="font-heading text-xs font-bold text-foreground">
                IELTS LOVERs Collect
              </h3>
              <p className="text-[11px] text-muted-foreground">Review đề thi thật</p>
            </div>
          </div>

          {/* Reading Accordion Group */}
          <div
            className={cn(
              "rounded-2xl border transition-all overflow-hidden",
              activeSkill === "reading"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div
              onClick={() => {
                setActiveSkill("reading")
                setPracticeMode("single")
              }}
              className="flex items-center gap-2 p-3.5 cursor-pointer font-bold text-xs text-foreground select-none"
            >
              <HugeiconsIcon icon={Book02Icon} size={16} className={activeSkill === "reading" ? "text-primary" : "text-muted-foreground"} />
              <span>Reading</span>
            </div>

            {activeSkill === "reading" && (
              <div className="px-4 pb-3.5 pt-1 space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer font-medium text-foreground">
                  <input
                    type="radio"
                    name="reading_mode_sel"
                    checked={practiceMode === "single"}
                    onChange={() => setPracticeMode("single")}
                    className="accent-primary cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Bài lẻ</span>
                </label>

                {practiceMode === "single" && (
                  <div className="pl-6 space-y-1.5 text-[11px] text-muted-foreground font-medium">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="reading_passage_opt"
                        checked={subPart === 0}
                        onChange={() => setSubPart(0)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Tất cả Passage</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="reading_passage_opt"
                        checked={subPart === 1}
                        onChange={() => setSubPart(1)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Passage 1</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="reading_passage_opt"
                        checked={subPart === 2}
                        onChange={() => setSubPart(2)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Passage 2</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="reading_passage_opt"
                        checked={subPart === 3}
                        onChange={() => setSubPart(3)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Passage 3</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="reading_passage_opt"
                        checked={subPart === -1}
                        onChange={() => setSubPart(-1)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Nhiều phần (Full Test)</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Listening Accordion Group */}
          <div
            className={cn(
              "rounded-2xl border transition-all overflow-hidden",
              activeSkill === "listening"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div
              onClick={() => {
                setActiveSkill("listening")
                setPracticeMode("single")
              }}
              className="flex items-center gap-2 p-3.5 cursor-pointer font-bold text-xs text-foreground select-none"
            >
              <HugeiconsIcon icon={HeadphonesIcon} size={16} className={activeSkill === "listening" ? "text-primary" : "text-muted-foreground"} />
              <span>Listening</span>
            </div>

            {activeSkill === "listening" && (
              <div className="px-4 pb-3.5 pt-1 space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer font-medium text-foreground">
                  <input
                    type="radio"
                    name="listening_mode_sel"
                    checked={practiceMode === "single"}
                    onChange={() => setPracticeMode("single")}
                    className="accent-primary cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Bài lẻ</span>
                </label>

                {practiceMode === "single" && (
                  <div className="pl-6 space-y-1.5 text-[11px] text-muted-foreground font-medium">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="listening_part_opt"
                        checked={subPart === 0}
                        onChange={() => setSubPart(0)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Tất cả Part</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="listening_part_opt"
                        checked={subPart === 1}
                        onChange={() => setSubPart(1)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Part 1</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="listening_part_opt"
                        checked={subPart === 2}
                        onChange={() => setSubPart(2)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Part 2</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="listening_part_opt"
                        checked={subPart === 3}
                        onChange={() => setSubPart(3)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Part 3</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="listening_part_opt"
                        checked={subPart === 4}
                        onChange={() => setSubPart(4)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Part 4</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground">
                      <input
                        type="radio"
                        name="listening_part_opt"
                        checked={subPart === -1}
                        onChange={() => setSubPart(-1)}
                        className="accent-primary cursor-pointer"
                      />
                      <span>Nhiều phần (Full Test)</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Writing Accordion Group */}
          <div
            className={cn(
              "rounded-2xl border transition-all overflow-hidden",
              activeSkill === "writing"
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div
              onClick={() => {
                setActiveSkill("writing")
                setPracticeMode("single")
                setSubPart(0)
              }}
              className="flex items-center gap-2 p-3.5 cursor-pointer font-bold text-xs text-foreground select-none"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={16} className={activeSkill === "writing" ? "text-primary" : "text-muted-foreground"} />
              <span>Writing</span>
            </div>
            {activeSkill === "writing" && (
              <div className="px-4 pb-3.5 text-xs text-muted-foreground font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked readOnly className="accent-primary" />
                  <span>Bài lẻ (Task 1 / Task 2)</span>
                </label>
                <p className="pt-1.5 text-[11px] leading-relaxed">
                  Bài viết được giáo viên chấm và nhận xét sau khi bạn nộp.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Content Area: Cards Grid */}
        <div className="flex-1 w-full space-y-4">
          {/* Active Category Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-foreground">
              {activeSkill === "reading"
                ? "Reading · Luyện tập"
                : activeSkill === "listening"
                  ? "Listening · Luyện tập"
                  : "Writing · Đề luyện viết"}
              {subPart > 0 ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {activeSkill === "reading" ? "Passage" : activeSkill === "writing" ? "Task" : "Part"}{" "}
                  {subPart}
                </span>
              ) : subPart === -1 ? (
                <span className="text-muted-foreground font-normal"> · Nhiều phần (Full Test)</span>
              ) : null}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Hiển thị {displayItems.length} bài
            </span>
          </div>

          {/* Loading Skeletons */}
          {catalogQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-3 space-y-3 animate-pulse">
                  <div className="aspect-[16/10] rounded-xl bg-muted" />
                  <div className="h-4 w-3/4 rounded-md bg-muted" />
                  <div className="h-3 w-1/2 rounded-md bg-muted" />
                </div>
              ))}
            </div>
          ) : catalogError ? (
            <Card className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-destructive">
                Không tải được danh mục luyện tập
              </p>
              <p className="text-xs text-muted-foreground">{catalogError}</p>
            </Card>
          ) : activeSkill === "writing" && displayItems.length === 0 ? (
            <Card className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <HugeiconsIcon icon={SparklesIcon} size={22} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-heading text-base font-bold text-foreground">
                  Chưa có bài luyện Writing nào
                </h4>
                <p className="text-xs text-muted-foreground">
                  Giáo viên chưa xuất bản bài luyện Writing. Trong khi chờ, bạn có thể luyện tập <strong>Reading</strong> hoặc <strong>Listening</strong>.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => setActiveSkill("reading")}
                  size="sm"
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 cursor-pointer"
                >
                  <HugeiconsIcon icon={Book02Icon} size={14} className="mr-1.5" />
                  Luyện Reading ngay
                </Button>
                <Button
                  onClick={() => setActiveSkill("listening")}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold px-4 cursor-pointer"
                >
                  <HugeiconsIcon icon={HeadphonesIcon} size={14} className="mr-1.5" />
                  Luyện Listening ngay
                </Button>
              </div>
            </Card>
          ) : displayItems.length === 0 ? (
            <Card className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-1">
                <HugeiconsIcon icon={Book02Icon} size={22} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Chưa có bài luyện tập nào trong mục này
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Các bài luyện tập do giáo viên tạo và xuất bản sẽ tự động hiển thị tại đây.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubPart(0)
                  setSearchQuery("")
                  setSearchInput("")
                  setStatusTab("uncompleted")
                }}
                className="text-xs rounded-xl mt-2 cursor-pointer"
              >
                Đặt lại bộ lọc
              </Button>
            </Card>
          ) : (
            /* ─── 100% REAL DATABASE PRACTICE CARDS ─────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayItems.map((item, idx) => {
                const isListening = item.skills.includes("listening")
                const isReading = item.skills.includes("reading")
                const primarySkill = isListening ? "listening" : isReading ? "reading" : "writing"
                const partInfo = getExamPartInfo(item, primarySkill)
                const coverUrl = getExamCoverUrl(item.examId, item.title, idx, item.bannerUrl)

                const questionTags =
                  item.questionTypes && item.questionTypes.length > 0
                    ? item.questionTypes.slice(0, 3).map(formatQuestionTypeLabel)
                    : []

                return (
                  <div
                    key={item.examId}
                    className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors flex flex-col relative"
                  >
                    {/* Cover Photo */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Top Overlay Badge: Duration & Question count */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium tracking-tight">
                        <span>{item.durationMinutes} phút · {item.questionCount} câu</span>
                      </div>

                      {/* Bottom Overlay Chip: Passage / Part / Full Test */}
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface/90 dark:bg-card/90 backdrop-blur-xs text-foreground border border-border">
                          {partInfo.badgeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-2">
                        {/* Title */}
                        <h4
                          className="font-heading text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                          title={item.title}
                        >
                          {item.curriculum?.collectionName
                            ? `[${item.curriculum.collectionName}] - ${item.title}`
                            : item.title}
                        </h4>

                        {/* Question Types List with Subtle Bullet Dots */}
                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                          {questionTags.map((qType, qIdx) => (
                            <div key={qIdx} className="flex items-center gap-1.5 truncate">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/60 shrink-0" />
                              <span className="truncate">{qType}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Status / Actions */}
                      <div className="pt-2 border-t border-border mt-2 flex items-center justify-between">
                        {item.progress.status === "completed" ? (
                          <div className="flex items-center justify-between w-full">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                              title={
                                (item.questionCount ?? 0) === 0
                                  ? "Bài viết — giáo viên chấm và nhận xét"
                                  : item.progress.correctCount !== undefined
                                    ? `Đúng ${item.progress.correctCount} · Sai ${item.progress.wrongCount ?? 0} · Bỏ trống ${item.progress.blankCount ?? 0}`
                                    : undefined
                              }
                            >
                              <span className="size-1.5 rounded-full bg-current" />
                              {(item.questionCount ?? 0) === 0
                                ? "Đã nộp"
                                : item.progress.correctCount !== undefined
                                  ? `${item.progress.correctCount}/${
                                      (item.progress.correctCount ?? 0) +
                                      (item.progress.wrongCount ?? 0) +
                                      (item.progress.blankCount ?? 0)
                                    }`
                                  : item.progress.rawScore !== undefined
                                    ? `${item.progress.rawScore}/${item.progress.totalPoints ?? item.totalPoints ?? item.questionCount}`
                                    : "Đã làm"}
                            </span>
                            {item.progress.attemptId && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2.5 font-semibold rounded-lg border-border text-foreground hover:bg-muted"
                              >
                                <Link href={`/student/results/${item.progress.attemptId}`}>
                                  Xem lại
                                </Link>
                              </Button>
                            )}
                          </div>
                        ) : item.progress.status === "in_progress" ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-orange-400 ring-1 ring-inset ring-black/5 dark:ring-white/10">
                              <span className="size-1.5 rounded-full bg-current" />
                              Đang làm dở
                            </span>
                            <Button
                              asChild
                              size="sm"
                              className="h-7 text-[11px] px-3 font-semibold rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground"
                            >
                              <Link
                                href={
                                  item.progress.attemptId
                                    ? `/exam/${item.progress.attemptId}`
                                    : `/exam/start/practice/${item.examId}`
                                }
                              >
                                Tiếp tục
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            className="w-full h-7 text-[11px] font-semibold rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground gap-1 cursor-pointer"
                          >
                            <Link href={`/exam/start/practice/${item.examId}`}>
                              <HugeiconsIcon icon={PlayIcon} size={12} />
                              <span>Làm bài ngay</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
