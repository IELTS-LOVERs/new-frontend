import { TeacherSidebar } from "@/components/layout/teacher-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AuthGate } from "@/components/providers/auth-gate"

export const dynamic = "force-dynamic"

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate allowedRoles={["teacher", "admin"]}>
      <div className="flex min-h-screen bg-background">
        <TeacherSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGate>
  )
}
