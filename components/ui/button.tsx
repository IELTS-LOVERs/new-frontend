import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium transition-colors outline-hidden select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:not-aria-busy:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border-strong bg-surface text-foreground hover:bg-button-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        destructive:
          "bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto min-h-0",
      },
      size: {
        default: "min-h-10 h-10 gap-2 px-4 py-2 text-sm",
        sm: "min-h-8 h-8 gap-1.5 px-3 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-11 h-11 gap-2.5 px-5 text-base rounded-xl",
        icon: "size-10 min-h-10 p-0",
        "icon-sm": "size-8 min-h-8 p-0 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 min-h-11 p-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

function Button({
  className,
  variant = "outline",
  size = "default",
  asChild = false,
  isLoading = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  const handleClick =
    onClick || isLoading
      ? (e: React.MouseEvent<HTMLButtonElement>) => {
          if (isLoading) {
            e.preventDefault()
            return
          }
          onClick?.(e)
        }
      : undefined

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading || undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading ? (
        <>
          <HugeiconsIcon
            icon={Loading03Icon}
            className="animate-spin text-current"
            aria-hidden
          />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
