import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppProviders } from "@/components/providers/query-provider"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "IELTS LOVERs",
  description: "Nền tảng luyện thi IELTS Computer-delivered",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
}

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn(
        "antialiased font-sans [--font-heading:var(--font-sans)]",
        fontMono.variable,
        geistSans.variable
      )}
    >
      <body>
        <ThemeProvider>
          <AppProviders>
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" richColors />
            </TooltipProvider>
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
