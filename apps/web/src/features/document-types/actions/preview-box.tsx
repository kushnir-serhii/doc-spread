import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewBoxProps {
  tone: 'ok' | 'bad' | 'neutral'
  title: string
  children: ReactNode
}

/** One preview outcome: a toned title and its detail. */
export const PreviewBox = ({ tone, title, children }: PreviewBoxProps) => {
  const Icon = tone === 'ok' ? CircleCheck : tone === 'bad' ? CircleX : CircleAlert
  return (
    <div
      className={cn(
        'rounded-md border p-3 text-sm',
        tone === 'ok' && 'border-success bg-success-soft text-success-soft-foreground',
        tone === 'bad' && 'border-destructive',
        tone === 'neutral' && 'bg-warning-soft text-warning-soft-foreground',
      )}
    >
      <p className={cn('flex items-center gap-2 font-medium', tone === 'bad' && 'text-destructive')}>
        <Icon className="size-4 shrink-0" aria-hidden />
        {title}
      </p>
      <div className="mt-1 break-words tabular-nums">{children}</div>
    </div>
  )
}
