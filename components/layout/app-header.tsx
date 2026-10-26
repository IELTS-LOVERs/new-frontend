"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Sun02Icon,
  Moon02Icon,
  Search01Icon,
  Menu01Icon,
  UserIcon,
  Key01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/layout/offline-banner"
import { ResumeBanner } from "@/components/layout/resume-banner"
import { useAuthStore } from "@/stores/auth.store"
import { useSidebarStore } from "@/stores/sidebar.store"
import { useLogout } from "@/hooks/use-logout"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { TeacherSidebarContent } from "@/components/layout/teacher-sidebar"
import { StudentSidebarContent } from "@/components/layout/student-sidebar"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
}

export function AppHeader({ title, subtitle, children }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const { user } = useAuthStore()
  const logoutMutation = useLogout()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const isTeacherPath = pathname.startsWith("/teacher") || pathname.startsWith("/admin")

  const { toggleSidebar } = useSidebarStore()

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      const target = e.target as HTMLElement | null
      const isTyping =
        !!target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !isTyping) {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSidebar])

  const profileHref = isTeacherPath ? "/teacher/settings" : "/student/profile"
  const passwordHref = isTeacherPath ? "/teacher/settings#password" : "/student/profile#password"

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Drawer Menu trigger (cho cả Teacher và Student) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-8 text-foreground hover:bg-muted shrink-0",
                  isTeacherPath ? "lg:hidden" : "md:hidden"
                )}
                aria-label="Mở menu điều hướng"
              >
                <HugeiconsIcon icon={Menu01Icon} size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 sm:w-80">
              {isTeacherPath ? (
                <TeacherSidebarContent onNavigate={() => setMobileMenuOpen(false)} isMobile />
              ) : (
                <StudentSidebarContent onNavigate={() => setMobileMenuOpen(false)} isMobile />
              )}
            </SheetContent>
          </Sheet>

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

          {/* Mobile Profile & Logout Dropdown (Đặc biệt tiện lợi khi dùng điện thoại) */}
          <div className={cn(isTeacherPath ? "lg:hidden" : "md:hidden")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs ring-1 ring-border hover:bg-primary/20 transition-colors"
                  aria-label="Tài khoản và đăng xuất"
                >
                  {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "U"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                className="w-56 p-1.5 shadow-xl border-border bg-popover"
              >
                <div className="flex items-center gap-2.5 p-2 border-b border-border mb-1">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {user?.fullName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                  <Link href={profileHref}>
                    <HugeiconsIcon icon={UserIcon} size={15} />
                    <span>Hồ sơ của tôi</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                  <Link href={passwordHref}>
                    <HugeiconsIcon icon={Key01Icon} size={15} />
                    <span>Đổi mật khẩu</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
                >
                  <HugeiconsIcon icon={Logout01Icon} size={15} />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
