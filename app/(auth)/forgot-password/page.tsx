import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"

export default function ForgotPasswordPage() {
  return (
    <Card className="border border-border shadow-xs bg-card animate-fade-in">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-xl font-extrabold tracking-tight">
          Quên mật khẩu?
        </CardTitle>
        <CardDescription className="text-xs">
          Hướng dẫn cấp lại mật khẩu tài khoản
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 text-foreground/90">
          <HugeiconsIcon icon={InformationCircleIcon} size={20} className="text-primary shrink-0 mt-0.5" />
          <p>
            Nhằm đảm bảo an toàn và bảo mật cho tài khoản học viên, hệ thống hiện tại chưa hỗ trợ gửi mã đặt lại mật khẩu tự động qua email.
          </p>
        </div>

        <p>
          Vui lòng liên hệ trực tiếp với <strong>Giáo viên phụ trách</strong> hoặc <strong>Quản trị viên (Admin)</strong> của trung tâm để được hỗ trợ đặt lại mật khẩu mới.
        </p>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border pt-4">
        <Button variant="outline" size="sm" asChild className="gap-2 text-xs font-semibold">
          <Link href="/login">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span>Quay lại trang Đăng nhập</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
