import { BrandLogo } from "@/components/layout/brand-logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/20">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo href="/" />
        </div>
        {children}
      </div>
    </div>
  )
}
