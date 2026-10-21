import type { Confidence } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

const CONFIDENCE_META: Record<Confidence, { label: string; className: string; dot: string; bars: number }> = {
  high: { label: 'High', className: 'bg-confidence-high-bg text-confidence-high-fg', dot: 'bg-confidence-high-dot', bars: 3 },
  medium: {
    label: 'Medium',
    className: 'bg-confidence-medium-bg text-confidence-medium-fg',
    dot: 'bg-confidence-medium-dot',
    bars: 2,
  },
  low: { label: 'Low', className: 'bg-confidence-low-bg text-confidence-low-fg', dot: 'bg-confidence-low-dot', bars: 1 },
}

const BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5']

export interface ConfidenceBadgeProps {
  level: Confidence
  /** 0–1 score; shown as a percentage when provided */
  score?: number
  className?: string
}

/**
 * AI confidence indicator. A 3-bar meter + text label, so it reads without color.
 */
export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  const meta = CONFIDENCE_META[level]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap',
        meta.className,
        className,
      )}
    >
      <span className="flex items-end gap-px" aria-hidden="true">
        {BAR_HEIGHTS.map((height, i) => (
          <span
            key={height}
            className={cn('w-1 rounded-xs', height, i < meta.bars ? meta.dot : 'bg-current opacity-25')}
          />
        ))}
      </span>
      <span>
        {meta.label}
        {score !== undefined && <span className="amount ml-1 opacity-90">{Math.round(score * 100)}%</span>}
      </span>
      <span className="sr-only"> confidence</span>
    </span>
  )
}
