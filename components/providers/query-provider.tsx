"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ApiError } from "@/lib/api/client"
import { SessionReplacedNotice } from "@/components/providers/session-replaced-notice"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // FIX-13: only retry transient failures (network/5xx). Never retry 4xx
        // (400/401/403/404), which are deterministic and just waste requests.
        retry: (failureCount, error) => {
          if (failureCount >= 1) return false
          if (error instanceof ApiError) {
            return error.status >= 500 || error.status === 0
          }
          return true
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <SessionReplacedNotice />
    </QueryClientProvider>
  )
}
