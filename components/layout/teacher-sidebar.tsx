"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Book02Icon,
  PencilEdit02Icon,
  Award01Icon,
  Folder02Icon,
  UserIcon,
  Logout01Icon,
  Add01Icon,
  Shield01Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MoreHorizontalIcon,
  Key01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { BrandLogo } from "@/components/layout/brand-logo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/auth.store"
import { useSidebarStore } from "@/stores/sidebar.store"
import { useLogout } from "@/hooks/use-logout"

const navGroups = [
  {
    title: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/teacher", icon: DashboardSquare01Icon },
    ],
  },
  {
    title: "Giảng dạy",
    items: [
      { label: "Lớp học", href: "/teacher/classes", icon: UserIcon },
      { label: "Học viên", href: "/teacher/students", icon: UserGroupIcon },
      { label: "Đợt giao bài", href: "/teacher/assignments", icon: Book02Icon },
      { label: "Bài nộp & Chấm điểm", href: "/teacher/submissions", icon: Award01Icon },
    ],
  },
  {
    title: "Nội dung học liệu",
    items: [
      { label: "Bài luyện tập", href: "/teacher/practices", icon: Book02Icon },
      { label: "Đề thi", href: "/teacher/exams", icon: PencilEdit02Icon },
      { label: "Ngân hàng câu hỏi", href: "/teacher/questions", icon: Folder02Icon },
      { label: "Thư viện Media", href: "/teacher/media", icon: Folder02Icon },
    ],
  },
]

interface TeacherSidebarContentProps {
  onNavigate?: () => void
  isMobile?: boolean
}

export function TeacherSidebarContent({ onNavigate, isMobile = false }: TeacherSidebarContentProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { isCollapsed, toggleSidebar, setCollapsed } = useSidebarStore()
  const logoutMutation = useLogout()
  const isAdminUsersActive =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/students")

  // On mobile sheet, always render in expanded mode
  const collapsed = !isMobile && isCollapsed

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ieltslovers-sidebar-collapsed")
      if (saved !== null) {
        setCollapsed(JSON.parse(saved))
      }
    } catch {}
  }, [setCollapsed])

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Top Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border transition-all",
          collapsed ? "justify-center px-2" : "justify-between px-4 sm:px-5"
        )}
      >
        {!collapsed ? (
          <>
            <BrandLogo href="/teacher" />
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

      {/* Quick Action */}
      <div className={cn("border-b border-border", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    "font-medium h-9 text-xs rounded-xl",
                    collapsed
                      ? "size-9 p-0 mx-auto flex items-center justify-center"
                      : "w-full justify-start gap-2"
                  )}
                  aria-label="Tạo mới nhanh"
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  {!collapsed && <span>Tạo mới nhanh</span>}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Tạo mới nhanh</TooltipContent>
            )}
          </Tooltip>
          <DropdownMenuContent align="start" side={collapsed ? "right" : "bottom"} className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/teacher/exams/new" className="cursor-pointer text-xs" onClick={onNavigate}>
                Đề thi mới (Exam)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/questions?open=new" className="cursor-pointer text-xs" onClick={onNavigate}>
                Câu hỏi mới (Question)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/classes?action=create" className="cursor-pointer text-xs" onClick={onNavigate}>
                Lớp học mới (Class)
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher/assignments?action=assign" className="cursor-pointer text-xs" onClick={onNavigate}>
                Giao bài tập (Assign)
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation Links */}
      <div className={cn("flex-1 overflow-y-auto space-y-4", collapsed ? "px-2 py-3" : "px-3 py-3")}>
        {pathname.startsWith("/admin") && (
          <div className="space-y-1">
            {!collapsed ? (
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Quản trị
              </div>
            ) : (
              <Separator className="my-2" />
            )}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/users"
                    onClick={onNavigate}
                    className={cn(
                      "flex size-9 mx-auto items-center justify-center rounded-xl text-xs font-medium transition-colors",
                      isAdminUsersActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <HugeiconsIcon icon={Shield01Icon} size={18} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Quản trị người dùng</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/admin/users"
                onClick={onNavigate}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                  isAdminUsersActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={Shield01Icon} size={16} className="text-muted-foreground" />
                  <span>Người dùng</span>
                </div>
              </Link>
            )}
          </div>
        )}

        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {group.title}
              </div>
            ) : (
              <Separator className="my-2 opacity-50" />
            )}
            {group.items.map((item) => {
              const isActive =
                item.href === "/teacher"
                  ? pathname === "/teacher"
                  : pathname.startsWith(item.href)

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
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
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
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
                        "transition-colors shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User profile footer */}
      <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-all mx-auto",
                      pathname.startsWith("/teacher/settings")
                        ? "bg-secondary ring-2 ring-primary text-primary"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <span className="font-bold text-xs">
                      {(user?.fullName ?? "").slice(0, 2).toUpperCase()}
                    </span>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium text-xs">{(user?.fullName ?? "")}</p>
                <p className="text-[10px] text-muted-foreground">Bấm để mở menu tài khoản</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side="right"
              align="end"
              className="w-56 p-1.5 shadow-xl border-border bg-popover"
            >
              <div className="flex items-center gap-2.5 p-2 border-b border-border mb-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  {(user?.fullName ?? "").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-semibold truncate text-foreground">{(user?.fullName ?? "")}</p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{(user?.email ?? "")}</p>
                </div>
              </div>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs" onClick={() => onNavigate?.()}>
                <Link href="/teacher/settings">
                  <HugeiconsIcon icon={UserIcon} size={15} />
                  <span>Cài đặt & Hồ sơ</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs" onClick={() => onNavigate?.()}>
                <Link href="/teacher/settings#password">
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                  <span>Đổi mật khẩu</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onNavigate?.()
                  logoutMutation.mutate()
                }}
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
                  pathname.startsWith("/teacher/settings")
                    ? "bg-secondary text-foreground ring-1 ring-border"
                    : "bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {(user?.fullName ?? "").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate leading-tight text-foreground group-hover:text-primary transition-colors">
                      {(user?.fullName ?? "")}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                      Giáo viên phụ trách
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
              <div className="flex items-center gap-2.5 p-2 border-b border-border mb-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  {(user?.fullName ?? "").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {(user?.fullName ?? "")}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                    {(user?.email ?? "")}
                  </p>
                </div>
              </div>

              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs" onClick={() => onNavigate?.()}>
                <Link href="/teacher/settings">
                  <HugeiconsIcon icon={UserIcon} size={15} />
                  <span>Cài đặt & Hồ sơ</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs" onClick={() => onNavigate?.()}>
                <Link href="/teacher/settings#password">
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                  <span>Đổi mật khẩu</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  onNavigate?.()
                  logoutMutation.mutate()
                }}
                className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <HugeiconsIcon icon={Logout01Icon} size={15} />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function TeacherSidebar() {
  const { isCollapsed } = useSidebarStore()

  return (
    <aside
      className={cn(
        "hidden lg:flex sticky top-0 h-screen flex-col border-r border-border bg-sidebar text-sidebar-foreground shrink-0 transition-[width] duration-200 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <TeacherSidebarContent />
    </aside>
  )
}
