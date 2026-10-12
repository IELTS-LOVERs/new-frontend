"use client"

import * as React from "react"
import { parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { QuestionForm } from "@/features/questions/question-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Folder02Icon,
  Image01Icon,
  MusicNote01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import {
  useQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} from "@/hooks/use-questions"
import type { CreateQuestionPayload } from "@/lib/api/questions"
import {
  QUESTION_TYPE_LABEL,
  SKILL_LABEL,
  formatRelative,
} from "@/lib/format"
import type { Question, QuestionType, SkillType } from "@/lib/api/types"
import { DEMO_QUESTION_BANK } from "@/mocks/demo-data"

const SKILL_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
]

const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]
const PAGE_SIZE = 20

function QuestionPreview({ question }: { question: Question }) {
  if (question.type === "multiple_choice" || question.type === "true_false_not_given" || question.type === "yes_no_not_given") {
    const options = (question.data?.options as Array<{ id: string; text: string }>) ?? []
    return (
      <div className="space-y-2">
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <span className="flex size-5 items-center justify-center rounded-full border border-border font-mono text-[11px]">
              {o.id}
            </span>
            {o.text}
          </div>
        ))}
      </div>
    )
  }
  if (question.type === "form_completion" || question.type === "summary_completion" || question.type === "note_completion" || question.type === "table_completion") {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed">
        {(question.data?.templateText as string) ?? question.prompt}
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
      {question.prompt}
    </div>
  )
}

function toPayload(q: Question): CreateQuestionPayload {
  return {
    skill: q.skill,
    type: q.type,
    part: q.part,
    prompt: q.prompt,
    content: q.content ?? undefined,
    data: q.data,
    acceptedAnswers: q.acceptedAnswers,
    points: q.points,
    explanation: q.explanation ?? undefined,
    mediaIds: q.mediaIds,
  }
}

export default function TeacherQuestionsPage() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""))
  const [skill, setSkill] = useQueryState("skill", parseAsString.withDefault("all"))
  const [part, setPart] = useQueryState("part", parseAsString.withDefault("all"))
  const [type, setType] = useQueryState("type", parseAsString.withDefault("all"))
  const [scope, setScope] = useQueryState("scope", parseAsString.withDefault("mine"))
  const [open, setOpen] = useQueryState("open", parseAsString.withDefault(""))
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))

  const [input, setInput] = React.useState(search)

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(input || null)
      setPage(null)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  // Reset về trang 1 khi đổi bộ lọc
  React.useEffect(() => {
    setPage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, part, type, scope])

  const queryParams = React.useMemo(
    () => ({
      skill: skill !== "all" ? (skill as SkillType) : undefined,
      part: part !== "all" ? Number(part) : undefined,
      type: type !== "all" ? (type as QuestionType) : undefined,
      scope: (scope === "mine" ? "own" : "all") as "own" | "all",
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [skill, part, type, scope, search, page]
  )

  const questionsQuery = useQuestionsQuery(queryParams, !USE_MOCKS)
  const createMutation = useCreateQuestionMutation()
  const updateMutation = useUpdateQuestionMutation(open !== "new" ? open : "")
  const deleteMutation = useDeleteQuestionMutation()

  const [mockQuestions, setMockQuestions] = React.useState<Question[]>(DEMO_QUESTION_BANK)

  // Client-side filter cho mock mode
  const mockFiltered = React.useMemo(() => {
    if (!USE_MOCKS) return []
    return mockQuestions.filter((q) => {
      if (skill !== "all" && q.skill !== skill) return false
      if (part !== "all" && String(q.part) !== part) return false
      if (type !== "all" && q.type !== type) return false
      if (search && !q.prompt.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [mockQuestions, skill, part, type, search])

  const questions = USE_MOCKS ? mockFiltered : (questionsQuery.data?.items ?? [])
  const meta = USE_MOCKS ? undefined : questionsQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1

  const editing = questions.find((q) => q.id === open) ?? null

  const handleSave = async (question: Question) => {
    if (USE_MOCKS) {
      setMockQuestions((prev) => {
        const exists = prev.some((q) => q.id === question.id)
        return exists ? prev.map((q) => (q.id === question.id ? question : q)) : [question, ...prev]
      })
      toast.success(open === "new" ? "Đã tạo câu hỏi mới" : "Đã cập nhật câu hỏi")
      setOpen(null)
      return
    }
    const payload = toPayload(question)
    try {
      if (open === "new") {
        await createMutation.mutateAsync(payload)
        toast.success("Đã tạo câu hỏi mới")
      } else {
        await updateMutation.mutateAsync(payload)
        toast.success("Đã cập nhật câu hỏi")
      }
      setOpen(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể lưu câu hỏi. Vui lòng thử lại.")
    }
  }

  const handleDuplicate = async (q: Question) => {
    if (USE_MOCKS) {
      const copy = { ...q, id: `q-copy-${Date.now()}`, updatedAt: new Date().toISOString() }
      setMockQuestions((prev) => [copy, ...prev])
      toast.success("Đã nhân bản câu hỏi")
      return
    }
    try {
      await createMutation.mutateAsync(toPayload(q))
      toast.success("Đã nhân bản câu hỏi")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể nhân bản câu hỏi.")
    }
  }

  const handleDelete = async (question: Question) => {
    if (USE_MOCKS) {
      if (question.id === "q-r1") {
        toast.error("Câu hỏi đang nằm trong đề đã xuất bản, không thể xoá.", {
          description: "Hãy gỡ câu hỏi khỏi đề trước khi xoá khỏi ngân hàng.",
        })
        return
      }
      setMockQuestions((prev) => prev.filter((q) => q.id !== question.id))
      toast.success("Đã xoá câu hỏi")
      return
    }
    try {
      await deleteMutation.mutateAsync(question.id)
      toast.success("Đã xoá câu hỏi")
      if (open === question.id) setOpen(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUESTION_IN_USE") {
        toast.error("Câu hỏi đang nằm trong đề đã xuất bản, không thể xoá.", {
          description: "Hãy gỡ câu hỏi khỏi đề trước khi xoá khỏi ngân hàng.",
        })
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể xoá câu hỏi. Vui lòng thử lại.")
      }
    }
  }

  const isLoading = !USE_MOCKS && questionsQuery.isLoading
  const isError = !USE_MOCKS && questionsQuery.isError

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Ngân hàng câu hỏi" },
        ]}
        title="Ngân hàng câu hỏi"
        description="Quản lý và biên soạn câu hỏi theo từng kỹ năng, dạng bài để tích hợp vào các đề thi"
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => setOpen("new")}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} />
            <span>Tạo câu hỏi mới</span>
          </Button>
        }
      />

      <Card className="border-border shadow-xs">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tìm theo nội dung câu hỏi..."
                className="h-9 pl-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={part} onValueChange={(v) => setPart(v === "all" ? null : v)}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue placeholder="Part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi Part</SelectItem>
                  {[1, 2, 3, 4].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      Part {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v) => setType(v === "all" ? null : v)}>
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue placeholder="Loại câu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi loại câu</SelectItem>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {QUESTION_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex rounded-full border border-border p-0.5">
                {["mine", "all"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s === "mine" ? "Của tôi" : "Tất cả"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Tabs value={skill} onValueChange={(v) => setSkill(v === "all" ? null : v)}>
            <TabsList className="bg-muted/50 p-1">
              {SKILL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-border shadow-xs">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-border shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Không tải được ngân hàng câu hỏi</p>
            <p className="text-xs text-muted-foreground">
              {questionsQuery.error instanceof ApiError
                ? questionsQuery.error.message
                : "Đã xảy ra lỗi. Vui lòng thử lại."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => questionsQuery.refetch()}
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              <span>Thử lại</span>
            </Button>
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={Folder02Icon}
          title="Chưa có câu hỏi nào"
          description="Thử thay đổi bộ lọc, hoặc tạo câu hỏi mới để bổ sung vào ngân hàng."
          action={
            <Button className="gap-2" onClick={() => setOpen("new")}>
              <HugeiconsIcon icon={Add01Icon} size={16} /> Tạo câu hỏi
            </Button>
          }
        />
      ) : (
        <Card className="border-border shadow-xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-72">Câu hỏi</TableHead>
                  <TableHead>Kỹ năng</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Loại câu</TableHead>
                  <TableHead>Đáp án</TableHead>
                  <TableHead className="text-center">Media</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => setOpen(q.id)}
                  >
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm font-medium text-foreground">{q.prompt}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {SKILL_LABEL[q.skill]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{q.part}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {QUESTION_TYPE_LABEL[q.type]}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(q.acceptedAnswers ?? []).slice(0, 2).map((a) => (
                          <Badge key={a} variant="secondary" className="font-mono text-[10px] font-normal">
                            {a}
                          </Badge>
                        ))}
                        {(q.acceptedAnswers?.length ?? 0) === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {(q.mediaIds?.length ?? 0) > 0 ? (
                        <HugeiconsIcon
                          icon={q.skill === "listening" ? MusicNote01Icon : Image01Icon}
                          size={15}
                          className="mx-auto text-primary"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelative(q.updatedAt ?? q.createdAt)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setOpen(q.id)}>
                            <HugeiconsIcon icon={PencilEdit02Icon} size={15} /> Sửa câu hỏi
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(q)}
                            disabled={!USE_MOCKS && createMutation.isPending}
                          >
                            <HugeiconsIcon icon={Copy01Icon} size={15} /> Nhân bản
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(q)}
                            disabled={!USE_MOCKS && deleteMutation.isPending}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={15} /> Xoá
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Server-side pagination */}
      {!USE_MOCKS && meta && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Trang {meta.page}/{totalPages} · {meta.total} câu hỏi
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}

      <Sheet open={open !== ""} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="font-heading text-lg font-bold">
              {open === "new" ? "Tạo câu hỏi mới" : "Chi tiết câu hỏi"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {open === "new"
                ? "Điền thông tin để thêm câu hỏi vào ngân hàng."
                : "Chỉnh sửa nội dung hoặc xem trước như học sinh."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-24">
            <Tabs defaultValue="edit">
              <TabsList className="mb-4 bg-muted/50 p-1">
                <TabsTrigger value="edit" className="text-xs">Sửa</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Xem như học sinh</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <QuestionForm
                  key={open}
                  initial={editing}
                  onSave={handleSave}
                  submitLabel={
                    !USE_MOCKS && (createMutation.isPending || updateMutation.isPending)
                      ? "Đang lưu…"
                      : open === "new"
                        ? "Tạo câu hỏi"
                        : "Cập nhật"
                  }
                />
              </TabsContent>
              <TabsContent value="preview" className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-primary uppercase">Câu hỏi</p>
                      <p className="text-sm text-foreground">{editing.prompt}</p>
                    </div>
                    <QuestionPreview question={editing} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Lưu câu hỏi trước để xem trước.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
