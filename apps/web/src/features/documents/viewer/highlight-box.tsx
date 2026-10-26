import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { placeBox } from './place-box'
import type { ViewerHighlight } from './viewer-highlights'

interface HighlightBoxProps {
  highlight: ViewerHighlight
  active: boolean
  /** move focus here once (set by scrollToHighlight) */
  focusRequested: boolean
  onFocused: () => void
  onClick?: (id: string) => void
  /** pointing mode: let pointer events through to the page, the box stays visible */
  passive?: boolean
}

/** A focusable box in page coordinates. Tone differs by border style as well as colour: solid, dashed, thick. */
export const HighlightBox = ({ highlight, active, focusRequested, onFocused, onClick, passive = false }: HighlightBoxProps) => {
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
        passive ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer',
        'absolute rounded-xs border border-highlight-border bg-highlight-bg outline-offset-2 outline-highlight-active-border hover:bg-highlight-active-bg focus-visible:outline-2',
        tone === 'low-confidence' &&
          'border-dashed border-highlight-low-border bg-highlight-low-bg outline-highlight-low-border hover:bg-highlight-low-bg',
        // active keeps the dashed border of a low-confidence box, so that signal isn't lost
        active && 'z-10 border-2 bg-highlight-active-bg',
        active && tone === 'normal' && 'border-highlight-active-border',
      )}
      // dynamic position: normalized page coordinates, padded so the border clears the text
      style={placeBox(bbox, { padded: true })}
      onClick={() => onClick?.(id)}
    />
  )
}
