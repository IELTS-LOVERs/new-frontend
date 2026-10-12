import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
  href?: string
  compact?: boolean
  size?: "sm" | "md" | "lg"
}

export function BrandLogo({
  className,
  href = "/",
  compact = false,
  size = "md",
}: BrandLogoProps) {
  const heightClasses = {
    sm: "h-7",
    md: "h-8",
    lg: "h-10",
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 transition-opacity hover:opacity-80 select-none",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="IELTS LOVERs"
        width={50}
        height={34}
        className={cn(heightClasses[size], "w-auto object-contain shrink-0")}
        priority
      />

      {!compact && (
        <span className="font-heading font-bold text-base tracking-tight text-foreground leading-none">
          IELTS LOVERs
        </span>
      )}
    </Link>
  )
}
