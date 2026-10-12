"use client"

export const dynamic = "force-dynamic"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth.store"
import { useRegisterMutation } from "@/hooks/use-auth"
import { ApiError } from "@/lib/api/client"
import { USE_MOCKS } from "@/lib/api/config"
import { DEMO_STUDENT } from "@/mocks/demo-data"

export default function RegisterPage() {
  return (
    <React.Suspense>
      <RegisterForm />
    </React.Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const [inviteCode] = useQueryState("code", parseAsString)
  const { setAuth } = useAuthStore()
  const registerMutation = useRegisterMutation()

  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [classCode, setClassCode] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)

  // Đồng bộ mã lớp từ URL khi tải trang (điều chỉnh state trong render)
  const [syncedCode, setSyncedCode] = React.useState<string | null>(null)
  if (inviteCode !== syncedCode) {
    setSyncedCode(inviteCode)
    if (inviteCode) setClassCode(inviteCode.toUpperCase().slice(0, 6))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (USE_MOCKS) {
      setAuth({ ...DEMO_STUDENT, fullName: fullName || "Học viên mới", email }, "mock-new-token")
      toast.success("Đăng ký tài khoản thành công!", {
        description: classCode ? `Đã tự động tham gia lớp học mã ${classCode}` : "Chào mừng bạn đến với IELTS LOVERs",
      })
      router.push("/student")
      return
    }

    try {
      await registerMutation.mutateAsync({
        fullName,
        email,
        password,
      })

      // Nếu có mã lớp, tự động tham gia sau khi đăng ký thành công
      if (classCode && classCode.length === 6) {
        try {
          const { joinClassApi } = await import("@/lib/api/classes")
          const joinRes = await joinClassApi(classCode)
          toast.success("Đăng ký tài khoản thành công!", {
            description: `Đã tham gia lớp "${joinRes.name}"`,
          })
        } catch {
          toast.success("Đăng ký tài khoản thành công!", {
            description: "Chưa thể tham gia lớp — bạn có thể nhập mã lớp lại ở trang Lớp học.",
          })
        }
      } else {
        toast.success("Đăng ký tài khoản thành công!", {
          description: "Chào mừng bạn đến với IELTS LOVERs",
        })
      }

      router.push("/student")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CONFLICT") {
          setFormError("Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.")
          return
        }
        if (err.code === "VALIDATION_ERROR") {
          setFormError(err.message)
          return
        }
        setFormError(err.message)
        return
      }
      setFormError("Đã xảy ra lỗi. Vui lòng thử lại.")
    }
  }

  return (
    <Card className="border border-border shadow-xs bg-card animate-fade-in">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl font-extrabold tracking-tight">
          Tạo tài khoản học viên
        </CardTitle>
        <CardDescription className="text-xs">
          Bắt đầu luyện thi IELTS trực tuyến cùng giáo viên của bạn
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleRegister}>
        <CardContent className="space-y-3.5">
          {formError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="fullName" className="text-xs">Họ và tên</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn An"
              required
              className="text-sm h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="text-sm h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Mật khẩu (≥ 8 ký tự)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="text-sm h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="classCode" className="text-xs text-muted-foreground">
              Mã lớp học (nếu có lời mời)
            </Label>
            <Input
              id="classCode"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="VD: FOUND1"
              maxLength={6}
              className="text-sm h-9 font-mono uppercase"
            />
          </div>

          <Button
            type="submit"
            className="w-full font-bold h-10 shadow-xs mt-2"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Đang tạo tài khoản..." : "Đăng ký học"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Đã có tài khoản? </span>
        <Link href="/login" className="ml-1 font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  )
}
