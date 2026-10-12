"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Book02Icon,
  Award01Icon,
  Analytics01Icon,
  UserIcon,
  Logout01Icon,
  SchoolIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MoreHorizontalIcon,
  Key01Icon,
} from "@hugeicons/core-free-icons"
import { BrandLogo } from "@/components/layout/brand-logo"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuthStore } from "@/stores/auth.store"
import { useSidebarStore } from "@/stores/sidebar.store"
import { useLogout } from "@/hooks/use-logout"
import { useMyAssignmentsQuery } from "@/hooks/use-assignments"
import { USE_MOCKS } from "@/lib/api/config"
import { DEMO_STUDENT } from "@/mocks/demo-data"

export function StudentSidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { isCollapsed, toggleSidebar, setCollapsed } = useSidebarStore()
  const currentUser = user || DEMO_STUDENT
  const logoutMutation = useLogout()

  const assignmentsQuery = useMyAssignmentsQuery({}, !USE_MOCKS)
  const pendingCount = USE_MOCKS
    ? null
    : (assignmentsQuery.data ?? []).filter(
        (a) => a.submissionStatus === "not_started" || a.submissionStatus === "in_progress"
      ).length
  const assignmentsBadge = USE_MOCKS
    ? "2"
    : pendingCount && pendingCount > 0
      ? String(pendingCount)
      : undefined

  const navItems = [
    { label: "Tổng quan", href: "/student", icon: DashboardSquare01Icon },
    { label: "Lớp học", href: "/student/classes", icon: SchoolIcon },
    { label: "Bài tập", href: "/student/assignments", icon: Book02Icon, badge: assignmentsBadge },
    { label: "Kết quả", href: "/student/results", icon: Award01Icon },
    { label: "Tiến độ", href: "/student/progress", icon: Analytics01Icon },
  ]

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ieltslovers-sidebar-collapsed")
      if (saved !== null) {
        setCollapsed(JSON.parse(saved))
      }
    } catch {}
  }, [setCollapsed])

  return (
    <aside
      className={cn(
        "sticky top-0 hidden md:flex h-screen flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border transition-all",
          isCollapsed ? "justify-center px-2" : "justify-between px-4 sm:px-5"
        )}
      >
        {!isCollapsed ? (
          <>
            <BrandLogo href="/student" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleSidebar}
                  className="size-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted"
                  aria-label="Thu gọn thanh điều hướng (Ctrl+B)"
                >
                  <HugeiconsIcon icon={PanelLeftCloseIcon} size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Thu gọn thanh điều hướng (Ctrl+B)
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleSidebar}
                className="size-9 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                aria-label="Mở rộng thanh điều hướng (Ctrl+B)"
              >
                <HugeiconsIcon icon={PanelLeftOpenIcon} size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Mở rộng thanh điều hướng (Ctrl+B)
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation list */}
      <div className={cn("flex-1 overflow-y-auto space-y-1", isCollapsed ? "px-2 py-3" : "px-3 py-4")}>
        {!isCollapsed ? (
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Học tập
          </div>
        ) : (
          <Separator className="my-2 opacity-50" />
        )}
        {navItems.map((item) => {
          const isActive =
            item.href === "/student"
              ? pathname === "/student"
              : pathname.startsWith(item.href)

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex size-9 mx-auto items-center justify-center rounded-xl text-xs font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      size={18}
                      className={cn(
                        "transition-colors shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon
                  icon={item.icon}
                  size={16}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="px-1.5 py-0 text-[10px] h-4.5 min-w-4.5 font-mono justify-center"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </div>

      {/* User profile footer */}
      <div className={cn("border-t border-border", isCollapsed ? "p-2" : "p-3")}>
        {isCollapsed ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-all mx-auto",
                      pathname.startsWith("/student/profile")
                        ? "bg-secondary ring-2 ring-primary text-primary"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <span className="font-bold text-xs">
                      {currentUser.fullName.slice(0, 2).toUpperCase()}
                    </span>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium text-xs">{currentUser.fullName}</p>
                <p className="text-[10px] text-muted-foreground">Bấm để mở menu hồ sơ</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side="right"
              align="end"
              className="w-56 p-1.5 shadow-xl border-border bg-popover"
            >
              <div className="flex items-center gap-2.5 p-2 border-b border-border mb-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  {currentUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-semibold truncate text-foreground">{currentUser.fullName}</p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{currentUser.email}</p>
                </div>
              </div>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                <Link href="/student/profile">
                  <HugeiconsIcon icon={UserIcon} size={15} />
                  <span>Hồ sơ của tôi</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                <Link href="/student/profile#password">
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                  <span>Đổi mật khẩu</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <HugeiconsIcon icon={Logout01Icon} size={15} />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "group flex w-full items-center justify-between gap-2.5 rounded-xl p-2 text-left transition-all hover:bg-muted/70",
                  pathname.startsWith("/student/profile")
                    ? "bg-secondary text-foreground ring-1 ring-border"
                    : "bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {currentUser.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate leading-tight text-foreground group-hover:text-primary transition-colors">
                      {currentUser.fullName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                      Target Band {currentUser.targetBand || 6.5}
                    </p>
                  </div>
                </div>
                <HugeiconsIcon
                  icon={MoreHorizontalIcon}
                  size={16}
                  className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-60 p-1.5 shadow-xl border-border bg-popover"
            >
              {/* Header profile info */}
              <div className="flex items-center gap-2.5 p-2 border-b border-border mb-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  {currentUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {currentUser.fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                <Link href="/student/profile">
                  <HugeiconsIcon icon={UserIcon} size={15} />
                  <span>Hồ sơ của tôi</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                <Link href="/student/profile#password">
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                  <span>Đổi mật khẩu</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <HugeiconsIcon icon={Logout01Icon} size={15} />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  )
}
