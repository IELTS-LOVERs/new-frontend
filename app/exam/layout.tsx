import { AuthGate } from "@/components/providers/auth-gate"

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate allowedRoles={["student"]}>
      <div className="min-h-screen bg-background text-foreground antialiased select-none">
        {children}
      </div>
    </AuthGate>
  )
}
