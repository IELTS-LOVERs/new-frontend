"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Key01Icon,
  LockIcon,
  PlusSignIcon,
  SchoolIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { initials } from "@/lib/format"
import { useAuthStore } from "@/stores/auth.store"
import { useMeQuery, useUpdateMeMutation, useChangePasswordMutation } from "@/hooks/use-auth"
import { useClassesQuery, useJoinClassMutation } from "@/hooks/use-classes"
import { ApiError } from "@/lib/api/client"
import type { ClassSummary, User } from "@/lib/api/types"

const BANDS = ["4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0"]

export default function StudentProfilePage() {
  return <RealProfile />
}

// ─── REAL ────────────────────────────────────────────────────────────────────
function RealProfile() {
  const { user: storeUser } = useAuthStore()
  const meQuery = useMeQuery(!storeUser)
  const classesQuery = useClassesQuery()

  const user = storeUser ?? meQuery.data ?? null
  const isLoadingUser = !storeUser && meQuery.isLoading

  if (isLoadingUser) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Tổng quan", href: "/student" },
            { label: "Hồ sơ của tôi" },
          ]}
          title="Hồ sơ của tôi"
          description="Quản lý thông tin cá nhân, lớp học và bảo mật tài khoản."
        />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!user) {
    const message =
      meQuery.error instanceof ApiError
        ? meQuery.error.message
        : "Không tải được thông tin người dùng."
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Tổng quan", href: "/student" },
            { label: "Hồ sơ của tôi" },
          ]}
          title="Hồ sơ của tôi"
          description="Quản lý thông tin cá nhân, lớp học và bảo mật tài khoản."
        />
        <Card className="border-border shadow-xs">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button
              variant="default"
              size="sm"
              onClick={() => meQuery.refetch()}
              className="font-semibold"
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ProfileView
      user={user}
      classes={classesQuery.data ?? []}
      isLoadingClasses={classesQuery.isLoading}
      isClassesError={classesQuery.isError}
      classesErrorMessage={
        classesQuery.error instanceof ApiError
          ? classesQuery.error.message
          : "Không tải được danh sách lớp."
      }
      refetchClasses={() => classesQuery.refetch()}
    />
  )
}

// ─── Shared View ─────────────────────────────────────────────────────────────
function ProfileView({
  user,
  classes,
  isLoadingClasses,
  isClassesError,
  classesErrorMessage,
  refetchClasses,
}: {
  user: User
  classes: ClassSummary[]
  isLoadingClasses: boolean
  isClassesError: boolean
  classesErrorMessage?: string
  refetchClasses: () => void
}) {
  const updateMeMutation = useUpdateMeMutation()
  const changePasswordMutation = useChangePasswordMutation()
  const joinMutation = useJoinClassMutation()

  const [fullName, setFullName] = React.useState(user.fullName)
  const [phone, setPhone] = React.useState(user.phone ?? "")
  const [targetBand, setTargetBand] = React.useState(String(user.targetBand ?? 6.5))
  const [profileFieldError, setProfileFieldError] = React.useState<Record<string, string>>({})

  const [joinOpen, setJoinOpen] = React.useState(false)
  const [code, setCode] = React.useState("")
  const [joinError, setJoinError] = React.useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [oldPasswordError, setOldPasswordError] = React.useState<string | null>(null)

  // Form fields khởi tạo từ user hiện tại.
  // Sau khi PATCH thành công, mutation tự cập nhật authStore + react-query cache → user thay đổi.
  // Không cần useEffect sync — form state là nguồn cục bộ cho đến khi save.

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileFieldError({})

    try {
      await updateMeMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        targetBand: Number(targetBand),
      })
      toast.success("Đã cập nhật hồ sơ", {
        description: "Thông tin cá nhân của bạn đã được lưu.",
      })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "VALIDATION_ERROR" && err.details) {
          // Map field-level errors nếu backend trả details
          const details = err.details as Record<string, string | string[]>
          const mapped: Record<string, string> = {}
          for (const key of Object.keys(details)) {
            const v = details[key]
            mapped[key] = Array.isArray(v) ? v[0] : String(v)
          }
          setProfileFieldError(mapped)
        }
        toast.error("Không thể cập nhật hồ sơ", { description: err.message })
      } else {
        toast.error("Không thể cập nhật hồ sơ")
      }
    }
  }

  const joinClass = async () => {
    const cleanCode = code.trim().toUpperCase()
    setJoinError(null)

    if (cleanCode.length < 5) {
      setJoinError("Mã lớp có 6 ký tự, do giáo viên cung cấp.")
      return
    }

    try {
      const res = await joinMutation.mutateAsync(cleanCode)
      toast.success(`Đã tham gia lớp ${res.name}`)
      setJoinOpen(false)
      setCode("")
      setJoinError(null)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CLASS_CODE_INVALID") {
          setJoinError(err.message || "Mã lớp không đúng. Kiểm tra lại với giáo viên.")
        } else if (err.code === "STUDENT_ALREADY_IN_CLASS") {
          setJoinError(err.message || "Bạn đã ở trong lớp này.")
        } else {
          setJoinError(err.message || "Không thể tham gia lớp. Thử lại sau.")
        }
      } else {
        setJoinError("Không thể tham gia lớp. Thử lại sau.")
      }
      // KHÔNG đóng dialog
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setOldPasswordError(null)

    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới cần tối thiểu 8 ký tự")
      return
    }

    try {
      await changePasswordMutation.mutateAsync({
        oldPassword: currentPassword,
        newPassword,
      })
      toast.success("Đã đổi mật khẩu", {
        description: "Bạn sẽ cần đăng nhập lại trên các thiết bị khác.",
      })
      setCurrentPassword("")
      setNewPassword("")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "OLD_PASSWORD_INCORRECT") {
          setOldPasswordError(err.message || "Mật khẩu hiện tại không đúng.")
        } else if (err.code === "VALIDATION_ERROR") {
          toast.error("Mật khẩu không hợp lệ", { description: err.message })
        } else {
          toast.error("Không thể đổi mật khẩu", { description: err.message })
        }
      } else {
        toast.error("Không thể đổi mật khẩu")
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/student" },
          { label: "Hồ sơ của tôi" },
        ]}
        title="Hồ sơ của tôi"
        description="Quản lý thông tin cá nhân, lớp học và bảo mật tài khoản."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit border-border shadow-xs lg:col-span-2">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-heading text-base font-bold">Thông tin cá nhân</CardTitle>
            <CardDescription className="text-xs">Cập nhật họ tên, số điện thoại và band mục tiêu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 font-heading text-xl font-bold text-primary">
                {initials(user.fullName)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">Học viên · Target {targetBand}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Họ và tên</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 text-sm"
                    disabled={updateMeMutation.isPending}
                  />
                  {profileFieldError.fullName && (
                    <p className="text-[11px] text-destructive">{profileFieldError.fullName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Số điện thoại</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-sm"
                    disabled={updateMeMutation.isPending}
                  />
                  {profileFieldError.phone && (
                    <p className="text-[11px] text-destructive">{profileFieldError.phone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={user.email} readOnly disabled className="h-9 text-sm" />
                  <p className="text-[11px] text-muted-foreground">Email không thể thay đổi.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Band mục tiêu</Label>
                  <Select
                    value={targetBand}
                    onValueChange={setTargetBand}
                    disabled={updateMeMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BANDS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {profileFieldError.targetBand && (
                    <p className="text-[11px] text-destructive">{profileFieldError.targetBand}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="gap-2 font-semibold"
                  disabled={updateMeMutation.isPending}
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
                  {updateMeMutation.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
            <div>
              <CardTitle className="font-heading text-base font-bold">Lớp của tôi</CardTitle>
              <CardDescription className="text-xs">
                {classes.length} lớp đang tham gia
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setJoinOpen(true)}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} /> Tham gia
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {isLoadingClasses ? (
              <>
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </>
            ) : isClassesError ? (
              <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs text-destructive">
                  {classesErrorMessage ?? "Không tải được danh sách lớp."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchClasses}
                  className="h-7 text-xs font-semibold"
                >
                  Thử lại
                </Button>
              </div>
            ) : classes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Bạn chưa tham gia lớp học nào.
              </p>
            ) : (
              classes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <HugeiconsIcon icon={SchoolIcon} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.studentsCount} học sinh</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {c.code}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="h-fit border-border shadow-xs lg:col-span-3">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <HugeiconsIcon icon={LockIcon} size={16} className="text-primary" /> Đổi mật khẩu
            </CardTitle>
            <CardDescription className="text-xs">Sử dụng mật khẩu mạnh tối thiểu 8 ký tự.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={changePassword} className="max-w-xl space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mật khẩu hiện tại</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      if (oldPasswordError) setOldPasswordError(null)
                    }}
                    className="h-9 text-sm"
                    disabled={changePasswordMutation.isPending}
                    required
                  />
                  {oldPasswordError && (
                    <p className="text-[11px] text-destructive font-medium">{oldPasswordError}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mật khẩu mới</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-sm"
                    disabled={changePasswordMutation.isPending}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="gap-2 font-semibold"
                disabled={changePasswordMutation.isPending}
              >
                <HugeiconsIcon icon={Key01Icon} size={15} />
                {changePasswordMutation.isPending ? "Đang đổi…" : "Đổi mật khẩu"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={joinOpen}
        onOpenChange={(open) => {
          setJoinOpen(open)
          if (!open) {
            setCode("")
            setJoinError(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Tham gia lớp học</DialogTitle>
            <DialogDescription className="text-xs">
              Nhập mã lớp 6 ký tự do giáo viên cung cấp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/\s/g, ""))
                if (joinError) setJoinError(null)
              }}
              placeholder="VD: INTER2"
              maxLength={6}
              className="h-12 text-center font-mono text-lg font-bold tracking-[0.3em]"
              disabled={joinMutation.isPending}
            />
            {joinError ? (
              <p className="text-[11px] text-destructive font-medium">{joinError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Mã lớp có thể được dán trực tiếp từ lời mời của giáo viên.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJoinOpen(false)}
              disabled={joinMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={joinClass}
              className="font-semibold"
              disabled={joinMutation.isPending || !code.trim()}
            >
              {joinMutation.isPending ? "Đang tham gia…" : "Tham gia lớp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
