import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  isFlushList = false,
  ...props
}: React.ComponentProps<"section"> & { isFlushList?: boolean }) {
  return (
    <section
      data-slot="card"
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface text-card-foreground",
        isFlushList ? "py-5" : "p-5",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  hasAction = false,
  ...props
}: React.ComponentProps<"header"> & { hasAction?: boolean }) {
  return (
    <header
      data-slot="card-header"
      className={cn(
        "flex items-start justify-between gap-3",
        hasAction ? "min-h-10 mb-4" : "mb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("font-heading text-base font-semibold text-foreground leading-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

function CardContent({
  className,
  isFlushList = false,
  ...props
}: React.ComponentProps<"div"> & { isFlushList?: boolean }) {
  return (
    <div
      data-slot="card-content"
      className={cn("min-h-0 flex-1", isFlushList && "px-2", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="card-footer"
      className={cn("mt-4 flex items-center justify-end gap-2 border-t border-border pt-3", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
