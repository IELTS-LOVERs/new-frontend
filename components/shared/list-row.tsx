import * as React from "react"
import { cn } from "@/lib/utils"

export interface ListRowProps extends Omit<React.ComponentProps<"li">, "title"> {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  trailing?: React.ReactNode
  actions?: React.ReactNode
  isInteractive?: boolean
}

export function ListRow({
  className,
  leading,
  title,
  subtitle,
  badge,
  trailing,
  actions,
  isInteractive = true,
  ...props
}: ListRowProps) {
  return (
    <li
      className={cn(
        "group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors",
        isInteractive && "hover:bg-item-hover cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading && <div className="shrink-0">{leading}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 text-sm font-medium text-foreground leading-snug">
              {title}
            </div>
            {badge && <div className="shrink-0 hidden xs:inline-flex">{badge}</div>}
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {trailing && <div className="text-xs text-muted-foreground">{trailing}</div>}

        {actions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity [@media(hover:none)]:opacity-100">
            {actions}
          </div>
        )}
      </div>
    </li>
  )
}
