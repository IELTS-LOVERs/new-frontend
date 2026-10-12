"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { useRouter, usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Sun02Icon,
  Moon02Icon,
  Search01Icon,
  UserSwitchIcon,
  PencilEdit02Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/layout/offline-banner"
import { ResumeBanner } from "@/components/layout/resume-banner"
import { useAuthStore } from "@/stores/auth.store"
import { useSidebarStore } from "@/stores/sidebar.store"
import { IS_DEMO_MODE, USE_MOCKS } from "@/lib/api/config"
import { DEMO_STUDENT, DEMO_TEACHER } from "@/mocks/demo-data"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { TeacherSidebarContent } from "@/components/layout/teacher-sidebar"

interface AppHeaderProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
}

export function AppHeader({ title, subtitle, children }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const { setAuth } = useAuthStore()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const isTeacherPath = pathname.startsWith("/teacher") || pathname.startsWith("/admin")
  const currentRole = isTeacherPath ? "teacher" : "student"

  const { toggleSidebar } = useSidebarStore()

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSidebar])

  const switchRole = () => {
    if (currentRole === "student") {
      setAuth(DEMO_TEACHER, "mock-teacher-token")
      router.push("/teacher")
    } else {
      setAuth(DEMO_STUDENT, "mock-student-token")
      router.push("/student")
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          {isTeacherPath && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 lg:hidden text-foreground hover:bg-muted"
                  aria-label="Mở menu điều hướng"
                >
                  <HugeiconsIcon icon={Menu01Icon} size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <TeacherSidebarContent onNavigate={() => setMobileMenuOpen(false)} isMobile />
              </SheetContent>
            </Sheet>
          )}

          {title && (
            <div className="min-w-0 truncate">
              <h1 className="font-heading text-sm sm:text-base font-semibold text-foreground truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {children}

          {/* Command palette trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
            title="Mở bảng lệnh nhanh (Ctrl/⌘ + K)"
          >
            <HugeiconsIcon icon={Search01Icon} size={14} />
            <span className="w-24 text-left">Tìm kiếm…</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* Demo Role Switcher */}
          {(IS_DEMO_MODE || USE_MOCKS) && (
            <Button
              variant="outline"
              size="sm"
              onClick={switchRole}
              className="h-8 gap-1.5 text-xs font-medium px-2.5"
              title="Chuyển đổi vai trò demo (Học sinh / Giáo viên)"
            >
              <HugeiconsIcon icon={UserSwitchIcon} size={14} className="text-muted-foreground" />
              <span className="hidden sm:inline">Vai trò: {currentRole === "student" ? "Học sinh" : "Giáo viên"}</span>
              <span className="sm:hidden">{currentRole === "student" ? "HS" : "GV"}</span>
              <Badge variant="secondary" className="px-1 py-0 text-[10px] uppercase font-mono ml-0.5">
                Đổi
              </Badge>
            </Button>
          )}

          {/* Fast exam preview button */}
          {(IS_DEMO_MODE || USE_MOCKS) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/exam/start/assign-1")}
              className="hidden h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
              title="Vào phòng thi thử ngay"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
              <span>Phòng thi</span>
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Chuyển giao diện sáng/tối"
          >
            <HugeiconsIcon
              icon={theme === "dark" ? Sun02Icon : Moon02Icon}
              size={16}
            />
          </Button>
        </div>
      </header>
      <OfflineBanner />
      <ResumeBanner />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        isTeacher={isTeacherPath}
      />
    </>
  )
}
