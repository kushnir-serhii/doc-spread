import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { ViewerHighlight } from './viewer-highlights'

interface HighlightBoxProps {
  highlight: ViewerHighlight
  active: boolean
  /** move focus here once (set by scrollToHighlight) */
  focusRequested: boolean
  onFocused: () => void
  onClick?: (id: string) => void
}

/** A focusable box in page coordinates. Tone differs by border style as well as colour: solid, dashed, thick. */
export const HighlightBox = ({ highlight, active, focusRequested, onFocused, onClick }: HighlightBoxProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const { id, bbox, tone, label } = highlight

  useEffect(() => {
    if (!focusRequested) return
    ref.current?.focus({ preventScroll: true })
    onFocused()
  }, [focusRequested, onFocused])

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'pointer-events-auto absolute cursor-pointer rounded-xs border border-highlight-border bg-highlight-bg outline-offset-2 outline-highlight-active-border hover:bg-highlight-active-bg focus-visible:outline-2',
        tone === 'low-confidence' &&
          'border-dashed border-highlight-low-border bg-highlight-low-bg outline-highlight-low-border hover:bg-highlight-low-bg',
        // active keeps the dashed border of a low-confidence box, so that signal isn't lost
        active && 'z-10 border-2 bg-highlight-active-bg',
        active && tone === 'normal' && 'border-highlight-active-border',
      )}
      // dynamic position: normalized page coordinates, so zoom never shifts the box
      style={{ left: `${bbox.x * 100}%`, top: `${bbox.y * 100}%`, width: `${bbox.w * 100}%`, height: `${bbox.h * 100}%` }}
      onClick={() => onClick?.(id)}
    />
  )
}
