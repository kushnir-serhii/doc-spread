import { useEffect, useRef, useState } from 'react'
import type { DocumentPage, Token } from '@/lib/mock/types'
import type { PointingState } from './pointing-types'
import { resolveSelection } from './resolve-selection'
import type { Point, ViewRotation } from './rotation'
import { nearestOnAdjacentLine, rectFromPoints, tokenAt } from './token-hit-test'
import type { ViewerMode, ViewerSelection } from './viewer-types'

export type FocusMove = 'prev' | 'next' | 'up' | 'down' | 'first' | 'last'

export interface PointingActions {
  start: (page: number, p: Point, extend: boolean) => void
  move: (p: Point) => void
  end: () => void
  moveFocus: (page: number, move: FocusMove, extend: boolean) => void
  confirm: () => void
  cancel: () => void
}

interface UsePointingArgs {
  mode: ViewerMode
  pages: DocumentPage[]
  rotationOf: (page: number) => ViewRotation
  onSelect?: (s: ViewerSelection) => void
  onCancel?: () => void
}

const IDLE: PointingState = { step: 'idle' }

/** Pointing state machine. A selection is pending until confirmed; switching mode clears it. */
export const usePointing = ({ mode, pages, rotationOf, onSelect, onCancel }: UsePointingArgs) => {
  const [held, setHeld] = useState<{ mode: ViewerMode; value: PointingState }>({ mode, value: IDLE })
  const state = held.mode === mode ? held.value : IDLE
  const dragRef = useRef<{ page: number; origin: Point } | null>(null)
  const update = (fn: (s: PointingState) => PointingState) =>
    setHeld((h) => ({ mode, value: fn(h.mode === mode ? h.value : IDLE) }))
  const tokensOf = (page: number): Token[] => pages.find((p) => p.index === page)?.tokens ?? []

  const page = state.step === 'idle' ? null : (pages.find((p) => p.index === state.page) ?? null)
  const selection = state.step !== 'idle' && page ? resolveSelection(page, state.sel) : null
  const focusToken = state.step !== 'idle' && page && state.sel.kind === 'words' ? (page.tokens[state.sel.focus] ?? null) : null

  const cancel = () => {
    dragRef.current = null
    if (state.step === 'idle') return
    update(() => IDLE)
    onCancel?.()
  }
  const confirm = () => {
    if (state.step !== 'pending' || !selection) return
    update(() => IDLE)
    onSelect?.(selection)
  }

  const start: PointingActions['start'] = (pageIndex, p, extend) => {
    if (mode === 'view') return
    dragRef.current = { page: pageIndex, origin: p }
    if (mode === 'select-region') return
    const idx = tokenAt(tokensOf(pageIndex), p)
    if (idx === null) {
      dragRef.current = null
      return
    }
    update((s) => {
      const prev = s.step !== 'idle' && s.page === pageIndex && s.sel.kind === 'words' ? s.sel : null
      return { step: 'selecting', page: pageIndex, sel: { kind: 'words', anchor: extend && prev ? prev.anchor : idx, focus: idx } }
    })
  }

  const move: PointingActions['move'] = (p) => {
    const drag = dragRef.current
    if (!drag) return
    if (mode === 'select-region') {
      update(() => ({ step: 'selecting', page: drag.page, sel: { kind: 'region', rect: rectFromPoints(drag.origin, p) } }))
      return
    }
    const idx = tokenAt(tokensOf(drag.page), p)
    if (idx === null) return
    update((s) => (s.step === 'selecting' && s.sel.kind === 'words' ? { ...s, sel: { ...s.sel, focus: idx } } : s))
  }

  const end: PointingActions['end'] = () => {
    dragRef.current = null
    update((s) => (s.step === 'selecting' ? { ...s, step: 'pending' } : s))
  }

  const moveFocus: PointingActions['moveFocus'] = (pageIndex, direction, extend) => {
    const tokens = tokensOf(pageIndex)
    const last = tokens.length - 1
    if (mode !== 'select-words' || last < 0) return
    update((s) => {
      const cur = s.step !== 'idle' && s.page === pageIndex && s.sel.kind === 'words' ? s.sel : null
      const from = cur?.focus ?? null
      let next: number
      if (from === null) next = direction === 'last' ? last : 0
      else if (direction === 'prev') next = Math.max(0, from - 1)
      else if (direction === 'next') next = Math.min(last, from + 1)
      else if (direction === 'first') next = 0
      else if (direction === 'last') next = last
      else next = nearestOnAdjacentLine(tokens, from, rotationOf(pageIndex), direction) ?? from
      return { step: 'pending', page: pageIndex, sel: { kind: 'words', anchor: extend && cur ? cur.anchor : next, focus: next } }
    })
  }

  // Esc cancels from anywhere (document listener: an external subscription)
  useEffect(() => {
    if (state.step === 'idle') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const actions: PointingActions = { start, move, end, moveFocus, confirm, cancel }
  return { state, selection, focusToken, actions }
}
