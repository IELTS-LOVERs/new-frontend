import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 md:h-10 w-full min-w-0 rounded-xl border border-border-strong bg-surface dark:bg-white/4 px-4 text-base md:text-sm text-foreground placeholder:text-muted-foreground transition-colors outline-hidden focus:border-focus focus:ring-2 focus:ring-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus:ring-2 aria-invalid:focus:ring-red-500/10 dark:aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
