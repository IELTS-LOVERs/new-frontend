"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Key01Icon,
  LockIcon,
  Moon02Icon,
  Sun02Icon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"
import { useAuthStore } from "@/stores/auth.store"
import { DEMO_TEACHER } from "@/mocks/demo-data"
import { USE_MOCKS } from "@/lib/api/config"
import { ApiError } from "@/lib/api/client"
import { useMeQuery, useUpdateMeMutation, useChangePasswordMutation } from "@/hooks/use-auth"

export default function TeacherSettingsPage() {
  const { user: authUser } = useAuthStore()
  const meQuery = useMeQuery(!USE_MOCKS)
  const current = USE_MOCKS ? (authUser ?? DEMO_TEACHER) : (meQuery.data ?? authUser)

  const { theme, setTheme } = useTheme()
  const updateMe = useUpdateMeMutation()
  const changePasswordMutation = useChangePasswordMutation()

  const [fullName, setFullName] = React.useState(current?.fullName ?? "")
  const [phone, setPhone] = React.useState(current?.phone ?? "")
  const [syncedFor, setSyncedFor] = React.useState<string | null>(current?.id ?? null)

  // Đồng bộ form khi dữ liệu user sẵn sàng (điều chỉnh state trong render)
  if (current && syncedFor !== current.id) {
    setSyncedFor(current.id)
    setFullName(current.fullName)
    setPhone(current.phone ?? "")
  }

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (USE_MOCKS) {
      toast.success("Đã cập nhật hồ sơ giáo viên")
      return
    }
    updateMe.mutate(
      { fullName, phone: phone || undefined },
      {
        onSuccess: () => toast.success("Đã cập nhật hồ sơ giáo viên"),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Không cập nhật được hồ sơ."),
      }
    )
  }

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới cần tối thiểu 8 ký tự")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp")
      return
    }
    if (USE_MOCKS) {
      toast.success("Đã đổi mật khẩu", {
        description: "Bạn sẽ cần đăng nhập lại trên các thiết bị khác.",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      return
    }
    changePasswordMutation.mutate(
      { oldPassword: currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success("Đã đổi mật khẩu", {
            description: "Bạn sẽ cần đăng nhập lại trên các thiết bị khác.",
          })
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === "OLD_PASSWORD_INCORRECT") {
            setPasswordError(error.message || "Mật khẩu hiện tại không đúng.")
            return
          }
          toast.error(error instanceof ApiError ? error.message : "Không đổi được mật khẩu.")
        },
      }
    )
  }

  if (!USE_MOCKS && meQuery.isLoading && !current) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl lg:col-span-3" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tổng quan", href: "/teacher" },
          { label: "Cài đặt tài khoản" },
        ]}
        title="Cài đặt tài khoản"
        description="Quản lý thông tin hồ sơ, mật khẩu bảo mật và tùy chỉnh giao diện"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit border-border shadow-xs lg:col-span-2">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-heading text-base font-bold">Hồ sơ giáo viên</CardTitle>
            <CardDescription className="text-xs">Thông tin hiển thị với học sinh.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
                {initials(fullName || "GV")}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{fullName || "Giáo viên"}</p>
                <p className="text-xs text-muted-foreground">Giáo viên · IELTS LOVERs</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Họ và tên</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Số điện thoại</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Email</Label>
                  <Input value={current?.email ?? ""} readOnly disabled className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="gap-2 font-semibold"
                  disabled={updateMe.isPending || !fullName.trim()}
                  title={!fullName.trim() ? "Họ tên không được để trống" : undefined}
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
                  {updateMe.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit border-border shadow-xs">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-heading text-base font-bold">Giao diện</CardTitle>
            <CardDescription className="text-xs">Chọn chế độ sáng hoặc tối.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-5">
            {[
              { value: "light", label: "Sáng", icon: Sun02Icon },
              { value: "dark", label: "Tối", icon: Moon02Icon },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors",
                  theme === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <HugeiconsIcon icon={opt.icon} size={22} />
                <span className="text-xs font-medium">{opt.label}</span>
                {theme === opt.value && <Badge variant="default" className="text-[10px]">Đang dùng</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit border-border shadow-xs lg:col-span-3">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold">
              <HugeiconsIcon icon={LockIcon} size={16} className="text-primary" /> Đổi mật khẩu
            </CardTitle>
            <CardDescription className="text-xs">Nên đổi mật khẩu định kỳ để bảo mật tài khoản.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={changePassword} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mật khẩu hiện tại</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setPasswordError(null)
                  }}
                  className="h-9 text-sm"
                  aria-invalid={!!passwordError}
                />
                {passwordError && (
                  <p className="text-[11px] text-destructive">{passwordError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mật khẩu mới</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Xác nhận mật khẩu mới</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  className="gap-2 font-semibold"
                  disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
                  title={!currentPassword || !newPassword ? "Nhập đầy đủ mật khẩu hiện tại và mật khẩu mới" : undefined}
                >
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                  {changePasswordMutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
