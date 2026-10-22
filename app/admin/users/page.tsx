"use client"

import * as React from "react"
import { parseAsString, parseAsInteger, useQueryState } from "nuqs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Copy01Icon,
  Key01Icon,
  LockIcon,
  MoreHorizontalIcon,
  RefreshIcon,
  Search01Icon,
  Shield01Icon,
  UserAdd01Icon,
  UserIcon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDateShort, initials } from "@/lib/format"
import type { User, UserRole, UserStatus } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/hooks/use-admin"

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Học sinh",
  teacher: "Giáo viên",
  admin: "Quản trị",
}

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Hoạt động",
  inactive: "Ngừng hoạt động",
  suspended: "Bị khoá",
}

const PAGE_SIZE = 20

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Không tải được danh sách người dùng."
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
      <p className="text-sm font-medium text-foreground">Không tải được dữ liệu</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium" onClick={onRetry}>
        <HugeiconsIcon icon={RefreshIcon} size={14} />
        <span>Thử lại</span>
      </Button>
    </div>
  )
}

function TableSkeleton() {
  return (
    <Card className="border-border shadow-xs">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

export default function AdminUsersPage() {
  const [query, setQuery] = React.useState("")
  const [role, setRole] = useQueryState("role", parseAsString.withDefault("all"))
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("all"))
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1))

  const [createOpen, setCreateOpen] = React.useState(false)
  const [resetUser, setResetUser] = React.useState<User | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [suspendUser, setSuspendUser] = React.useState<User | null>(null)

  // Debounce ô tìm kiếm
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Đổi bộ lọc → về trang 1
  React.useEffect(() => {
    setPage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, debouncedQuery])

  const usersQuery = useUsersQuery(
    {
      role: role !== "all" ? (role as UserRole) : undefined,
      status: status !== "all" ? (status as UserStatus) : undefined,
      search: debouncedQuery || undefined,
      page,
      limit: PAGE_SIZE,
    },
  )
  const updateStatus = useUpdateUserStatusMutation()
  const resetPassword = useResetUserPasswordMutation()

  const filtered = usersQuery.data?.items ?? []

  const meta = usersQuery.data?.meta
  const totalPages = meta?.totalPages ?? 1
  const totalUsers = meta?.total ?? filtered.length

  const counts = {
    total: totalUsers,
    teachers: filtered.filter((u) => u.role === "teacher").length,
    suspended: filtered.filter((u) => u.status === "suspended").length,
    admins: filtered.filter((u) => u.role === "admin").length,
  }

  const handleReset = (user: User) => {
    setResetUser(user)
    setNewPassword(randomPassword())
  }

  const confirmReset = () => {
    if (!resetUser) return
    resetPassword.mutate(
      { id: resetUser.id, newPassword },
      {
        onSuccess: () => {
          toast.success(`Đã đặt lại mật khẩu cho ${resetUser.fullName}`)
          setResetUser(null)
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Không đặt lại được mật khẩu."),
      }
    )
  }

  const confirmSuspend = () => {
    if (!suspendUser) return
    updateStatus.mutate(
      { id: suspendUser.id, status: "suspended" },
      {
        onSuccess: () => {
          toast.success(`Đã khoá tài khoản ${suspendUser.fullName}`)
          setSuspendUser(null)
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Không khoá được tài khoản."),
      }
    )
  }

  const activateUser = (u: User) => {
    updateStatus.mutate(
      { id: u.id, status: "active" },
      {
        onSuccess: () => toast.success(`Đã kích hoạt lại ${u.fullName}`),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Không kích hoạt được tài khoản."),
      }
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Quản trị" }, { label: "Người dùng" }]}
        title="Quản lý người dùng"
        description="Tạo tài khoản giáo viên, phân quyền và quản lý trạng thái tài khoản."
        actions={
          <Button className="gap-2 font-semibold" onClick={() => setCreateOpen(true)}>
            <HugeiconsIcon icon={UserAdd01Icon} size={16} />
            Tạo tài khoản giáo viên
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng người dùng" value={counts.total} icon={UserIcon} />
        <StatCard label="Giáo viên" value={counts.teachers} icon={UserSwitchIcon} />
        <StatCard label="Bị khoá" value={counts.suspended} icon={Alert02Icon} accent />
        <StatCard label="Quản trị" value={counts.admins} icon={Shield01Icon} />
      </div>

      <Card className="border-border shadow-xs">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative w-full sm:max-w-xs">
            <HugeiconsIcon icon={Search01Icon} size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v === "all" ? null : v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi vai trò</SelectItem>
              <SelectItem value="student">Học sinh</SelectItem>
              <SelectItem value="teacher">Giáo viên</SelectItem>
              <SelectItem value="admin">Quản trị</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-full border border-border p-0.5">
            {[
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Hoạt động" },
              { value: "suspended", label: "Bị khoá" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value === "all" ? null : s.value)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                  status === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {usersQuery.isLoading ? (
        <TableSkeleton />
      ) : usersQuery.isError ? (
        <QueryError error={usersQuery.error} onRetry={() => usersQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title="Không tìm thấy người dùng"
          description="Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
        />
      ) : (
        <>
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {initials(u.fullName)}
                          </span>
                          <span className="font-medium text-foreground">{u.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "admin" ? "default" : u.role === "teacher" ? "secondary" : "outline"}
                          className="font-normal"
                        >
                          {ROLE_LABEL[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              u.status === "active" ? "bg-emerald-500" : u.status === "suspended" ? "bg-destructive" : "bg-muted-foreground"
                            )}
                          />
                          <span className="text-xs text-muted-foreground">{STATUS_LABEL[u.status]}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(u.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleReset(u)}>
                              <HugeiconsIcon icon={Key01Icon} size={15} /> Đặt lại mật khẩu
                            </DropdownMenuItem>
                            {u.status === "active" ? (
                              <DropdownMenuItem variant="destructive" onClick={() => setSuspendUser(u)}>
                                <HugeiconsIcon icon={LockIcon} size={15} /> Khoá tài khoản
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={updateStatus.isPending}
                                onClick={() => activateUser(u)}
                              >
                                <HugeiconsIcon icon={UserSwitchIcon} size={15} /> Kích hoạt lại
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toast.success("Đã gửi lại lời mời qua email")}>
                              Gửi lại lời mời
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Trang <span className="font-mono font-semibold text-foreground">{page}</span>/
                <span className="font-mono">{totalPages}</span> · {totalUsers} người dùng
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 1}
                  title={page <= 1 ? "Đang ở trang đầu" : undefined}
                  onClick={() => setPage(page - 1)}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page >= totalPages}
                  title={page >= totalPages ? "Đang ở trang cuối" : undefined}
                  onClick={() => setPage(page + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create teacher */}
      <CreateTeacherDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Reset password */}
      <Dialog open={!!resetUser} onOpenChange={(v) => !v && setResetUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={Key01Icon} size={24} />
            </div>
            <DialogTitle className="text-center font-heading text-lg font-bold">
              Đặt lại mật khẩu
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Mật khẩu ngẫu nhiên mới cho <span className="font-semibold text-foreground">{resetUser?.fullName}</span>. Hãy sao chép và gửi cho người dùng.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
            <code className="flex-1 font-mono text-base font-bold tracking-wider text-foreground">
              {newPassword}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard?.writeText(newPassword)
                toast.success("Đã sao chép mật khẩu mới")
              }}
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Đóng</Button>
            <Button
              className="font-semibold"
              disabled={resetPassword.isPending}
              onClick={confirmReset}
            >
              {resetPassword.isPending ? "Đang đặt lại..." : "Xác nhận đặt lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend confirm */}
      <Dialog open={!!suspendUser} onOpenChange={(v) => !v && setSuspendUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Khoá tài khoản?</DialogTitle>
            <DialogDescription className="text-xs">
              {suspendUser?.fullName} sẽ không thể đăng nhập cho tới khi được kích hoạt lại.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendUser(null)}>Hủy</Button>
            <Button
              variant="destructive"
              disabled={updateStatus.isPending}
              onClick={confirmSuspend}
            >
              {updateStatus.isPending ? "Đang khoá..." : "Khoá tài khoản"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateTeacherDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const createUser = useCreateUserMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      toast.error("Vui lòng nhập họ tên và email")
      return
    }
    createUser.mutate(
      {
        email,
        fullName,
        phone: phone || undefined,
        role: "teacher",
        password: randomPassword(),
      },
      {
        onSuccess: () => {
          toast.success("Đã tạo tài khoản giáo viên", {
            description: `Mật khẩu tạm thời đã được gửi tới ${email}`,
          })
          setFullName("")
          setEmail("")
          setPhone("")
          onOpenChange(false)
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Không tạo được tài khoản."),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Tạo tài khoản giáo viên</DialogTitle>
            <DialogDescription className="text-xs">
              Giáo viên mới sẽ nhận email kích hoạt và mật khẩu tạm thời.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Họ và tên</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Mạnh Hùng" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hung.nguyen@ieltslovers.com" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Số điện thoại (tuỳ chọn)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" className="gap-2 font-semibold" disabled={createUser.isPending}>
              <HugeiconsIcon icon={UserAdd01Icon} size={15} />
              {createUser.isPending ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
