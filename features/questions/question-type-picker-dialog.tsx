"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Task01Icon,
  Tick02Icon,
  HelpCircleIcon,
  Link01Icon,
  PencilEdit02Icon,
  Note01Icon,
  Table01Icon,
  File01Icon,
  ArrowRight01Icon,
  Location01Icon,
  Comment01Icon,
  PenTool01Icon,
  Book02Icon,
  HeadphonesIcon,
  SparklesIcon,
  StarIcon,
  LayoutGridIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { QUESTION_GROUP_CATEGORIES, QUESTION_GROUP_TYPE_LABEL, SKILL_LABEL } from "@/lib/format"
import type { CandidateSection, QuestionGroupType, SkillType } from "@/lib/api/types"

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof HugeiconsIcon>["icon"]> = {
  "Lựa chọn": CheckmarkCircle02Icon,
  "Xác định thông tin": Tick02Icon,
  "Nối ghép": Link01Icon,
  "Điền từ": PencilEdit02Icon,
  "Gán nhãn": Location01Icon,
  "Trả lời ngắn": Comment01Icon,
  "Viết (Writing)": PenTool01Icon,
}

interface QuestionTypeMeta {
  type: QuestionGroupType
  label: string
  category: string
  categoryIcon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  description: string
  skills: SkillType[]
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  keywords: string[]
}

const QUESTION_TYPE_DETAILS: Record<
  QuestionGroupType,
  {
    description: string
    skills: SkillType[]
    icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
    keywords: string[]
  }
> = {
  multiple_choice_single: {
    description: "Chọn 1 phương án chính xác nhất trong 4 lựa chọn (A, B, C, D).",
    skills: ["listening", "reading"],
    icon: CheckmarkCircle02Icon,
    keywords: ["mcq", "trac nghiem", "single", "chon 1", "lua chon"],
  },
  multiple_choice_multiple: {
    description: "Chọn 2 hoặc nhiều phương án đúng theo yêu cầu từ danh sách lựa chọn.",
    skills: ["listening", "reading"],
    icon: Task01Icon,
    keywords: ["mcq", "trac nghiem", "multiple", "chon nhieu"],
  },
  true_false_not_given: {
    description: "Đối chiếu tính chính xác của nhận định dựa trên dữ kiện thực tế trong bài đọc.",
    skills: ["reading"],
    icon: Tick02Icon,
    keywords: ["tfng", "true", "false", "not given", "dung", "sai", "khong co"],
  },
  yes_no_not_given: {
    description: "Đối chiếu nhận định với quan điểm, lập trường hoặc ý kiến của tác giả.",
    skills: ["reading"],
    icon: HelpCircleIcon,
    keywords: ["ynng", "yes", "no", "not given", "quan diem", "y kien"],
  },
  matching_headings: {
    description: "Nối tiêu đề tóm tắt thích hợp nhất (i, ii, iii...) cho từng đoạn văn.",
    skills: ["reading"],
    icon: Link01Icon,
    keywords: ["headings", "tieu de", "noi doan", "ghep tieu de"],
  },
  matching_information: {
    description: "Xác định đoạn văn nào chứa thông tin hoặc chi tiết cụ thể được nêu.",
    skills: ["listening", "reading"],
    icon: Search01Icon,
    keywords: ["information", "thong tin", "tim doan", "which paragraph contains"],
  },
  matching_features: {
    description: "Nối các nhận định, phát hiện với danh sách tên người, địa danh hoặc tổ chức.",
    skills: ["listening", "reading"],
    icon: Link01Icon,
    keywords: ["features", "dac diem", "ten nguoi", "chuyen gia", "noi dac diem"],
  },
  matching_sentence_endings: {
    description: "Ghép nửa đầu câu với phần kết thúc phù hợp nhất dựa trên nội dung bài đọc.",
    skills: ["reading"],
    icon: Link01Icon,
    keywords: ["sentence endings", "ghep cau", "noi duoi cau", "ket thuc cau"],
  },
  sentence_completion: {
    description: "Điền từ vào chỗ trống để hoàn thành các câu trích xuất theo giới hạn từ.",
    skills: ["listening", "reading"],
    icon: PencilEdit02Icon,
    keywords: ["dien tu", "hoan thanh cau", "dien cau", "sentence"],
  },
  note_completion: {
    description: "Hoàn thành phần ghi chú tóm tắt ý chính với giới hạn số từ quy định.",
    skills: ["listening", "reading"],
    icon: Note01Icon,
    keywords: ["note", "ghi chu", "dien ghi chu"],
  },
  table_completion: {
    description: "Điền dữ liệu, từ khóa còn thiếu vào các ô tương ứng trong bảng biểu.",
    skills: ["listening", "reading"],
    icon: Table01Icon,
    keywords: ["table", "bang", "dien bang"],
  },
  summary_completion: {
    description: "Điền từ lấy trực tiếp từ bài đọc vào các chỗ trống trong đoạn tóm tắt.",
    skills: ["listening", "reading"],
    icon: File01Icon,
    keywords: ["summary", "tom tat", "dien tom tat"],
  },
  summary_completion_options: {
    description: "Chọn từ trong hộp danh sách cho sẵn (box of options) để điền vào đoạn tóm tắt.",
    skills: ["reading"],
    icon: File01Icon,
    keywords: ["summary options", "danh sach", "hop tu vung", "chon tu dien"],
  },
  form_completion: {
    description: "Điền biểu mẫu thông tin cá nhân (thường gặp trong Listening Part 1).",
    skills: ["listening"],
    icon: Note01Icon,
    keywords: ["form", "bieu mau", "dien don", "thong tin ca nhan"],
  },
  flow_chart_completion: {
    description: "Điền từ còn thiếu vào các bước trong quy trình hoặc chu trình tuần tự.",
    skills: ["listening", "reading"],
    icon: ArrowRight01Icon,
    keywords: ["flow chart", "quy trinh", "so do chu trinh", "cac buoc"],
  },
  map_labelling: {
    description: "Xác định và gán nhãn các vị trí trên bản đồ hoặc sơ đồ hướng dẫn (Listening).",
    skills: ["listening"],
    icon: Location01Icon,
    keywords: ["map", "ban do", "dia diem", "vi tri", "so do khu vuc"],
  },
  diagram_labelling: {
    description: "Điền nhãn cho các bộ phận cấu tạo của sơ đồ kỹ thuật, máy móc, cơ chế.",
    skills: ["listening", "reading"],
    icon: Location01Icon,
    keywords: ["diagram", "so do", "cau tao", "bo phan"],
  },
  short_answer: {
    description: "Trả lời câu hỏi mở ngắn gọn theo đúng giới hạn số từ yêu cầu (VD: NO MORE THAN THREE WORDS).",
    skills: ["listening", "reading"],
    icon: Comment01Icon,
    keywords: ["short answer", "tra loi ngan", "cau hoi ngan"],
  },
  writing_task_1: {
    description: "Miêu tả, so sánh biểu đồ, bản đồ hoặc quy trình (tối thiểu 150 từ).",
    skills: ["writing"],
    icon: PenTool01Icon,
    keywords: ["writing 1", "task 1", "bieu do", "viet", "report"],
  },
  writing_task_2: {
    description: "Bài luận nghị luận xã hội về một vấn đề hoặc quan điểm (tối thiểu 250 từ).",
    skills: ["writing"],
    icon: PenTool01Icon,
    keywords: ["writing 2", "task 2", "essay", "nghi luan", "bai luan"],
  },
}

/** Normalize string by removing Vietnamese diacritics for faster search */
function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}

export interface QuestionTypePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeSection?: CandidateSection
  onSelectType: (type: QuestionGroupType) => void
}

export function QuestionTypePickerDialog({
  open,
  onOpenChange,
  activeSection,
  onSelectType,
}: QuestionTypePickerDialogProps) {
  const [search, setSearch] = React.useState("")
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const activeSkill = activeSection?.skill

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setSearch("")
      // If section skill is present, default to "recommended" for quick access
      if (activeSkill) {
        setSelectedFilter("recommended")
      } else {
        setSelectedFilter("all")
      }
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [open, activeSkill])

  // Flat list of all items with metadata
  const allItems: QuestionTypeMeta[] = React.useMemo(() => {
    const list: QuestionTypeMeta[] = []
    QUESTION_GROUP_CATEGORIES.forEach((cat) => {
      cat.types.forEach((type) => {
        const details = QUESTION_TYPE_DETAILS[type]
        list.push({
          type,
          label: QUESTION_GROUP_TYPE_LABEL[type],
          category: cat.label,
          categoryIcon: CATEGORY_ICON[cat.label] ?? Task01Icon,
          description: details?.description ?? "",
          skills: details?.skills ?? [],
          icon: details?.icon ?? CheckmarkCircle02Icon,
          keywords: details?.keywords ?? [],
        })
      })
    })
    return list
  }, [])

  // Filter items
  const filteredItems = React.useMemo(() => {
    const q = removeAccents(search.trim())

    return allItems.filter((item) => {
      // Search matching
      if (q) {
        const matchLabel = removeAccents(item.label).includes(q)
        const matchDesc = removeAccents(item.description).includes(q)
        const matchCat = removeAccents(item.category).includes(q)
        const matchType = item.type.includes(q.replace(/\s+/g, "_"))
        const matchKw = item.keywords.some((kw) => removeAccents(kw).includes(q))
        if (!matchLabel && !matchDesc && !matchCat && !matchType && !matchKw) {
          return false
        }
      }

      // Filter matching
      if (selectedFilter === "recommended") {
        if (activeSkill) {
          return item.skills.includes(activeSkill)
        }
        return true
      }
      if (selectedFilter !== "all") {
        return item.category === selectedFilter
      }
      return true
    })
  }, [allItems, search, selectedFilter, activeSkill])

  // Group items by category if no search query and "all" or "recommended" selected
  const groupedItems = React.useMemo(() => {
    if (search.trim()) return null

    const groups: Array<{
      label: string
      icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
      items: QuestionTypeMeta[]
    }> = []

    QUESTION_GROUP_CATEGORIES.forEach((cat) => {
      const itemsInCat = filteredItems.filter((item) => item.category === cat.label)
      if (itemsInCat.length > 0) {
        groups.push({
          label: cat.label,
          icon: CATEGORY_ICON[cat.label] ?? Task01Icon,
          items: itemsInCat,
        })
      }
    })

    return groups
  }, [filteredItems, search])

  // Filter tabs
  const filterOptions = React.useMemo(() => {
    const options: Array<{
      id: string
      label: string
      count?: number
      icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"]
    }> = []

    if (activeSkill) {
      const recCount = allItems.filter((i) => i.skills.includes(activeSkill)).length
      options.push({
        id: "recommended",
        label: `Phù hợp ${SKILL_LABEL[activeSkill]}`,
        count: recCount,
        icon: StarIcon,
      })
    }

    options.push({
      id: "all",
      label: "Tất cả",
      count: allItems.length,
      icon: LayoutGridIcon,
    })

    QUESTION_GROUP_CATEGORIES.forEach((cat) => {
      const catCount = allItems.filter((i) => i.category === cat.label).length
      options.push({
        id: cat.label,
        label: cat.label,
        count: catCount,
        icon: CATEGORY_ICON[cat.label] ?? Task01Icon,
      })
    })

    return options
  }, [activeSkill, allItems])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border space-y-3">
          <DialogHeader className="pr-10">
            <div className="flex items-center gap-2">
              <DialogTitle className="font-heading text-lg font-bold text-foreground">
                Chọn dạng câu hỏi
              </DialogTitle>
              {activeSection && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {activeSkill === "reading" && <HugeiconsIcon icon={Book02Icon} size={12} />}
                  {activeSkill === "listening" && <HugeiconsIcon icon={HeadphonesIcon} size={12} />}
                  {activeSkill === "writing" && <HugeiconsIcon icon={PenTool01Icon} size={12} />}
                  <span>{activeSection.title}</span>
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Mỗi nhóm câu hỏi sẽ có chung hướng dẫn, giới hạn từ và dạng bài.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm dạng bài (vd: Multiple choice, True/False, Điền từ, Summary...)"
              className="w-full h-10 rounded-xl border border-input bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  searchInputRef.current?.focus()
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
              </button>
            )}
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {filterOptions.map((opt) => {
              const isActive = selectedFilter === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedFilter(opt.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-hidden transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
                  )}
                >
                  {opt.icon && (
                    <HugeiconsIcon
                      icon={opt.icon}
                      size={12}
                      className={cn(
                        opt.id === "recommended" && !isActive && "text-amber-500",
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                  )}
                  <span>{opt.label}</span>
                  {typeof opt.count === "number" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-4 max-h-[55vh]">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <HugeiconsIcon icon={Search01Icon} size={22} />
              </div>
              <p className="text-sm font-semibold text-foreground">Không tìm thấy dạng câu hỏi nào</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Không có kết quả nào khớp với &ldquo;{search}&rdquo;. Thử tìm kiếm với từ khóa khác hoặc bỏ bộ lọc.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setSelectedFilter("all")
                }}
                className="mt-4 text-xs"
              >
                Xem tất cả dạng câu hỏi
              </Button>
            </div>
          ) : groupedItems ? (
            <div className="space-y-5">
              {groupedItems.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <HugeiconsIcon icon={group.icon} size={14} className="text-muted-foreground" />
                      <span>{group.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {group.items.length} dạng bài
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.items.map((item) => (
                      <QuestionTypeCard
                        key={item.type}
                        item={item}
                        activeSkill={activeSkill}
                        onSelect={() => onSelectType(item.type)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>
                  Tìm thấy <strong className="text-foreground">{filteredItems.length}</strong> dạng câu hỏi
                </span>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="hover:text-foreground hover:underline cursor-pointer"
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredItems.map((item) => (
                  <QuestionTypeCard
                    key={item.type}
                    item={item}
                    activeSkill={activeSkill}
                    onSelect={() => onSelectType(item.type)}
                  />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={InformationCircleIcon} size={15} className="text-primary shrink-0" />
            <span>Mỗi nhóm câu hỏi sẽ có ô nhập riêng cho phần bài làm và bảng cấu hình đáp án.</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-3 cursor-pointer"
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function QuestionTypeCard({
  item,
  activeSkill,
  onSelect,
}: {
  item: QuestionTypeMeta
  activeSkill?: SkillType
  onSelect: () => void
}) {
  const isRecommended = activeSkill && item.skills.includes(activeSkill)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-all duration-150",
        "hover:border-primary/50 hover:bg-item-hover hover:shadow-xs",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      )}
    >
      {/* Icon */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground/80 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <HugeiconsIcon icon={item.icon} size={18} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
            {item.label}
          </span>
          {isRecommended && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <HugeiconsIcon icon={StarIcon} size={10} className="fill-primary text-primary" />
              Khuyên dùng
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {item.description}
        </p>
      </div>
    </button>
  )
}
