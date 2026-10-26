import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { placeBox } from './place-box'
import type { ViewerHighlight } from './viewer-highlights'

/** rest: nothing is active · active: this box · dimmed: another box is active (spotlight) */
export type HighlightBoxState = 'rest' | 'active' | 'dimmed'

interface HighlightBoxProps {
  highlight: ViewerHighlight
  state: HighlightBoxState
  /** move focus here once (set by scrollToHighlight) */
  focusRequested: boolean
  onFocused: () => void
  onClick?: (id: string) => void
  /** pointing mode: let pointer events through to the page, the box stays visible */
  passive?: boolean
}

/** A focusable box in page coordinates. Tone differs by border style as well as colour: solid, dashed, thick. */
export const HighlightBox = ({ highlight, state, focusRequested, onFocused, onClick, passive = false }: HighlightBoxProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const { id, bbox, tone, label } = highlight
  const low = tone === 'low-confidence'

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
      aria-pressed={state === 'active'}
      title={label}
      className={cn(
        passive ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer',
        'absolute rounded-xs border outline-offset-2 transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-2 motion-reduce:transition-none',
        low ? 'border-dashed outline-highlight-low-border' : 'outline-highlight-active-border',
        state === 'rest' &&
          (low
            ? 'border-highlight-low-border bg-highlight-low-bg'
            : 'border-highlight-border bg-highlight-bg hover:bg-highlight-active-bg'),
        // faded but still findable; hover and focus bring a box back to full strength
        state === 'dimmed' &&
          (low
            ? 'border-highlight-low-dim-border hover:border-highlight-low-border hover:bg-highlight-low-bg focus-visible:border-highlight-low-border'
            : 'border-highlight-dim-border hover:border-highlight-border hover:bg-highlight-bg focus-visible:border-highlight-border'),
        // active keeps the dashed border of a low-confidence box, so that signal isn't lost
        state === 'active' &&
          (low
            ? 'z-10 border-2 border-highlight-low-border bg-highlight-low-bg ring-3 ring-highlight-low-active-ring'
            : 'z-10 border-2 border-highlight-active-border bg-highlight-active-bg ring-3 ring-highlight-active-ring'),
      )}
      // dynamic position: normalized page coordinates, padded so the border clears the text
      style={placeBox(bbox, { padded: true })}
      onClick={() => onClick?.(id)}
    />
  )
}
