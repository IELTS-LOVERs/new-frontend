import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ring-1 ring-inset ring-black/5 dark:ring-white/10 [&_svg]:pointer-events-none [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
        neutral:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300",
        success:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        warning:
          "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-orange-400",
        destructive:
          "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
        outline:
          "border border-border-strong bg-surface text-foreground ring-0",
        secondary:
          "bg-secondary text-secondary-foreground ring-0",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
  withDot?: boolean
}

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  withDot = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {withDot && (
        <span className="size-1.5 rounded-full bg-current shrink-0" aria-hidden />
      )}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
