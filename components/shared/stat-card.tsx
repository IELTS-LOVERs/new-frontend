import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  accent?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-border bg-card transition-colors",
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="truncate">{label}</span>
          {icon && (
            <HugeiconsIcon
              icon={icon}
              size={15}
              className={accent ? "text-primary" : "text-muted-foreground/80"}
            />
          )}
        </div>
        <div
          className={cn(
            "font-mono text-2xl font-semibold tracking-tight tabular-nums",
            accent ? "text-primary" : "text-foreground"
          )}
        >
          {value}
        </div>
        {hint && (
          <p className="text-xs text-muted-foreground leading-tight">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
