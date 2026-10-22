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
import { useLoginMutation } from "@/hooks/use-auth"
import { ApiError } from "@/lib/api/client"

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const [next] = useQueryState("next", parseAsString)
  const [reason] = useQueryState("reason", parseAsString)
  const loginMutation = useLoginMutation()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    try {
      const result = await loginMutation.mutateAsync({ email, password })
      toast.success("Đăng nhập thành công!", {
        description: `Chào mừng ${result.user.fullName}`,
      })
      const safeNext = next && next.startsWith("/") ? next : null
      const fallback =
        result.user.role === "student"
          ? "/student"
          : result.user.role === "admin"
            ? "/admin/users"
            : "/teacher"
      router.push(safeNext ?? fallback)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_CREDENTIALS") {
          setFormError(err.message)
          return
        }
        if (err.code === "TOO_MANY_REQUESTS") {
          setFormError("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.")
          return
        }
        setFormError(err.message)
        return
      }
      setFormError("Đã xảy ra lỗi. Vui lòng thử lại.")
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">
          Chào mừng trở lại
        </CardTitle>
        <CardDescription className="text-xs">
          Đăng nhập vào tài khoản IELTS LOVERs của bạn
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {(reason === "session_replaced" || reason === "token_revoked") && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
              <p className="font-medium">
                {reason === "session_replaced"
                  ? "Phiên đăng nhập trước đã kết thúc vì tài khoản được đăng nhập trên thiết bị khác."
                  : "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại."}
              </p>
              {next?.startsWith("/exam") && (
                <p className="mt-1 text-muted-foreground">
                  Bài làm đã được lưu tạm trên thiết bị này. Đăng nhập lại để tiếp tục.
                </p>
              )}
            </div>
          )}

          {formError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="text-sm h-10"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs">Mật khẩu</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="text-sm h-10"
            />
          </div>

          <Button
            type="submit"
            className="w-full font-medium h-10"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Chưa có tài khoản? </span>
        <Link href="/register" className="ml-1 font-medium text-primary hover:underline">
          Đăng ký ngay
        </Link>
      </CardFooter>
    </Card>
  )
}
