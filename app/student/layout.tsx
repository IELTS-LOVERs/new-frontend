import { StudentSidebar } from "@/components/layout/student-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AuthGate } from "@/components/providers/auth-gate"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate allowedRoles={["student"]}>
      <div className="flex min-h-screen bg-background">
        <StudentSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGate>
  )
}
