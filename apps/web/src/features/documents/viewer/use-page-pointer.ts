import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { viewToPage, type ViewRotation } from './rotation'
import type { FocusMove, PointingActions } from './use-pointing'
import type { ViewerMode } from './viewer-types'

const DRAG_THRESHOLD = 4 // px: below this a press is a click

const KEY_MOVES: Record<string, FocusMove> = {
  ArrowLeft: 'prev',
  ArrowRight: 'next',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'first',
  End: 'last',
}

interface UsePagePointerArgs {
  mode: ViewerMode
  pageIndex: number
  rotation: ViewRotation
  actions: PointingActions
}

/** Pointer + keyboard handlers for one page box. Points are normalized to the page box, then mapped to page coordinates. */
export const usePagePointer = ({ mode, pageIndex, rotation, actions }: UsePagePointerArgs) => {
  const originRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null)
  if (mode === 'view') return {}

  // the page box is axis-aligned, so its rect gives view coordinates; viewToPage undoes the rotation
  const toPagePoint = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clamp = (n: number) => Math.min(1, Math.max(0, n))
    return viewToPage({ x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) }, rotation)
  }
  const release = () => {
    if (!originRef.current) return
    originRef.current = null
    actions.end()
  }

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !e.isPrimary) return
      if (e.target instanceof Element && e.target.closest('button')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      originRef.current = { x: e.clientX, y: e.clientY, dragged: false }
      actions.start(pageIndex, toPagePoint(e), e.shiftKey)
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const o = originRef.current
      if (!o) return
      if (!o.dragged && Math.hypot(e.clientX - o.x, e.clientY - o.y) < DRAG_THRESHOLD) return
      o.dragged = true
      actions.move(toPagePoint(e))
    },
    onPointerUp: release,
    onPointerCancel: release,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (mode !== 'select-words' || e.target !== e.currentTarget) return
      const page = e.currentTarget
      const move = KEY_MOVES[e.key]
      if (move) {
        e.preventDefault()
        actions.moveFocus(pageIndex, move, e.shiftKey)
        // keep the focused token in view; the layer marks it once React has rendered
        requestAnimationFrame(() =>
          page.querySelector('[data-selection-focus]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        actions.confirm()
      }
    },
  }
}
