import { TeacherSidebar } from "@/components/layout/teacher-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AuthGate } from "@/components/providers/auth-gate"

export const dynamic = "force-dynamic"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-background">
        <TeacherSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </div>
    </AuthGate>
  )
}
