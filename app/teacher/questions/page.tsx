"use client"

import * as React from "react"
import { parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { BankGroupForm } from "@/features/questions/bank-group-form"
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
import { ApiError } from "@/lib/api/client"
import { RichText } from "@/features/exam-engine/components/rich-text"
import {
  useQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} from "@/hooks/use-questions"
import type { CreateBankGroupPayload } from "@/lib/api/questions"
import {
  QUESTION_GROUP_CATEGORIES,
  QUESTION_GROUP_TYPE_LABEL,
  SKILL_LABEL,
  formatRelative,
} from "@/lib/format"
import type { BankQuestionGroup, QuestionGroupType, SkillType } from "@/lib/api/types"

const SKILL_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
]

const GROUP_TYPES: QuestionGroupType[] = QUESTION_GROUP_CATEGORIES.flatMap((c) => c.types)
const PAGE_SIZE = 20

function groupToPayload(group: BankQuestionGroup): CreateBankGroupPayload {
  return {
    skill: group.skill,
    part: group.part,
    groupType: group.groupType,
    instructions: group.instructions ?? "",
    config: group.config ?? {},
    questions: (group.questions ?? []).map((q) => ({
      prompt: q.prompt ?? "",
      acceptedAnswers: q.acceptedAnswers ?? [],
      points: q.points ?? 1,
      explanation: q.explanation ?? undefined,
      mediaIds: q.mediaIds ?? [],
    })),
  }
}

function GroupPreview({ group }: { group: BankQuestionGroup }) {
  return (
    <div className="space-y-3">
      <Badge variant="secondary" className="font-medium">
        {QUESTION_GROUP_TYPE_LABEL[group.groupType] || group.groupType}
      </Badge>
      {group.instructions && (
        <p className="whitespace-pre-line rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed">
          <RichText text={group.instructions} />
        </p>
      )}
      <div className="space-y-2">
        {group.questions.map((q, index) => (
          <div key={q.id} className="rounded-lg border border-border px-3 py-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[11px] font-bold text-primary">
                {index + 1}
              </span>
              <p className="text-sm text-foreground">{q.prompt || "—"}</p>
            </div>
            <div className="mt-1 flex flex-wrap gap-1 pl-7">
              {(q.acceptedAnswers ?? []).map((a) => (
                <Badge key={a} variant="outline" className="font-mono text-[10px] font-normal">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
      type: type !== "all" ? (type as QuestionGroupType) : undefined,
      scope: (scope === "mine" ? "own" : "all") as "own" | "all",
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [skill, part, type, scope, search, page]
  )

  const groupsQuery = useQuestionsQuery(queryParams)
  const createMutation = useCreateQuestionMutation()
  const updateMutation = useUpdateQuestionMutation(open !== "new" ? open : "")
  const deleteMutation = useDeleteQuestionMutation()

  const groups = groupsQuery.data?.items ?? []
  const meta = groupsQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1

  const editing = groups.find((g) => g.id === open) ?? null

  const handleSave = async (payload: CreateBankGroupPayload) => {
    try {
      if (open === "new") {
        await createMutation.mutateAsync(payload)
        toast.success("Đã tạo nhóm câu hỏi")
      } else {
        await updateMutation.mutateAsync(payload)
        toast.success("Đã cập nhật nhóm câu hỏi")
      }
      setOpen(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể lưu nhóm câu hỏi. Vui lòng thử lại.")
    }
  }

  const handleDuplicate = async (group: BankQuestionGroup) => {
    const payload = groupToPayload(group)
    try {
      await createMutation.mutateAsync(payload)
      toast.success("Đã nhân bản nhóm câu hỏi")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thể nhân bản nhóm câu hỏi.")
    }
  }

  const handleDelete = async (group: BankQuestionGroup) => {
    try {
      await deleteMutation.mutateAsync(group.id)
      toast.success("Đã xoá nhóm câu hỏi")
      if (open === group.id) setOpen(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUESTION_IN_USE") {
        toast.error("Nhóm câu hỏi đang nằm trong đề đã xuất bản, không thể xoá.", {
          description: "Hãy gỡ khỏi đề trước khi xoá khỏi ngân hàng.",
        })
      } else {
        toast.error(err instanceof ApiError ? err.message : "Không thể xoá nhóm câu hỏi. Vui lòng thử lại.")
      }
    }
  }

  const isLoading = groupsQuery.isLoading
  const isError = groupsQuery.isError

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Ngân hàng câu hỏi" },
        ]}
        title="Ngân hàng câu hỏi"
        description="Lưu trữ các nhóm câu hỏi (Question Group) theo kỹ năng & dạng bài để tái sử dụng trong nhiều đề thi"
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => setOpen("new")}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} />
            <span>Tạo nhóm câu hỏi</span>
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
                placeholder="Tìm theo hướng dẫn / nội dung câu hỏi..."
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
                <SelectTrigger size="sm" className="w-52">
                  <SelectValue placeholder="Dạng câu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi dạng câu</SelectItem>
                  {GROUP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {QUESTION_GROUP_TYPE_LABEL[t]}
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
              {groupsQuery.error instanceof ApiError
                ? groupsQuery.error.message
                : "Đã xảy ra lỗi. Vui lòng thử lại."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={() => groupsQuery.refetch()}
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} />
              <span>Thử lại</span>
            </Button>
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Folder02Icon}
          title="Chưa có nhóm câu hỏi nào"
          description="Thử thay đổi bộ lọc, hoặc tạo nhóm câu hỏi mới để bổ sung vào ngân hàng."
          action={
            <Button className="gap-2" onClick={() => setOpen("new")}>
              <HugeiconsIcon icon={Add01Icon} size={16} /> Tạo nhóm câu hỏi
            </Button>
          }
        />
      ) : (
        <Card className="border-border shadow-xs">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-72">Nhóm câu hỏi</TableHead>
                  <TableHead>Kỹ năng</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Dạng</TableHead>
                  <TableHead className="text-center">Số câu</TableHead>
                  <TableHead className="text-center">Media</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => {
                  const hasMedia = g.questions.some((q) => (q.mediaIds?.length ?? 0) > 0)
                  return (
                    <TableRow key={g.id} className="cursor-pointer" onClick={() => setOpen(g.id)}>
                      <TableCell className="max-w-md">
                        <p className="truncate text-sm font-medium text-foreground">
                          {g.instructions?.trim().split("\n")[0] || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {SKILL_LABEL[g.skill]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{g.part}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {QUESTION_GROUP_TYPE_LABEL[g.groupType] || g.groupType}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {g.questions.length}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasMedia ? (
                          <HugeiconsIcon
                            icon={g.skill === "listening" ? MusicNote01Icon : Image01Icon}
                            size={15}
                            className="mx-auto text-primary"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatRelative(g.updatedAt ?? g.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setOpen(g.id)}>
                              <HugeiconsIcon icon={PencilEdit02Icon} size={15} /> Sửa nhóm
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(g)}
                              disabled={createMutation.isPending}
                            >
                              <HugeiconsIcon icon={Copy01Icon} size={15} /> Nhân bản
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(g)}
                              disabled={deleteMutation.isPending}
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={15} /> Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Server-side pagination */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Trang {meta.page}/{totalPages} · {meta.total} nhóm câu hỏi
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
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
              {open === "new" ? "Tạo nhóm câu hỏi" : "Chi tiết nhóm câu hỏi"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {open === "new"
                ? "Chọn dạng câu hỏi rồi soạn nội dung để lưu vào ngân hàng."
                : "Chỉnh sửa nhóm câu hỏi hoặc xem trước như học sinh."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-24">
            <Tabs defaultValue="edit">
              <TabsList className="mb-4 bg-muted/50 p-1">
                <TabsTrigger value="edit" className="text-xs">Sửa</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Xem như học sinh</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <BankGroupForm
                  key={open}
                  initial={editing}
                  onSave={handleSave}
                  submitLabel={
                    (createMutation.isPending || updateMutation.isPending)
                      ? "Đang lưu…"
                      : open === "new"
                        ? "Tạo nhóm câu hỏi"
                        : "Cập nhật"
                  }
                />
              </TabsContent>
              <TabsContent value="preview" className="space-y-4">
                {editing ? (
                  <GroupPreview group={editing} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Lưu nhóm câu hỏi trước để xem trước.
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
