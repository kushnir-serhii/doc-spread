import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/lib/theme/theme-provider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
