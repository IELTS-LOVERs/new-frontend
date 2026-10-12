import * as React from "react"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"

interface EmptyStateProps {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} size={24} />
      </div>
      <div className="space-y-1">
        <p className="font-heading text-base font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
