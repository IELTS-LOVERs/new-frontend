import Link from "next/link"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export interface Crumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs?: Crumb[]
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="text-xs">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className="text-xs">
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <div className="text-xs text-muted-foreground leading-normal">{description}</div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        )}
      </div>

      {children}
    </div>
  )
}
