import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** A native select styled like the other builder selects (touch-sized, visible focus). */
export const SlotSelect = ({ className, ...props }: ComponentProps<'select'>) => (
  <select
    {...props}
    className={cn(
      'min-h-touch min-w-0 rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9 md:text-sm',
      className,
    )}
  />
)
