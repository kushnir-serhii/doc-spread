import { cn } from '@/lib/utils'

/** Placeholder brand mark + wordmark. Replace once the final logo exists. */
export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold tracking-tight text-foreground', className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path d="M10 7h8l5 5v13H10z" className="fill-primary-foreground" />
        <path d="M13 17h7M13 21h5" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className={cn('text-base', collapsed && 'sr-only')}>DocSpread</span>
    </span>
  )
}
