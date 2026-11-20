import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Popover } from 'radix-ui'

import { resolveDiagramItems } from '@/features/architecture/diagram-items'
import { GLOSSARY } from '@/features/architecture/diagrams/glossary'
import type { GlossaryKey } from '@/features/architecture/diagrams/glossary'
import { EntryDetails, ProviderBadge } from '@/features/architecture/glossary-parts'

const HOVER_OPEN_MS = 300
// Long enough to move the pointer from the node into the popover.
const HOVER_CLOSE_MS = 150
// Pointer travel between down and up beyond which a click was the end of a pan.
const DRAG_PX = 5

interface Active {
  element: SVGGElement
  key: GlossaryKey
  /** hover closes on leave; pinned (click, tap, keyboard) stays until dismissed. */
  mode: 'hover' | 'pinned'
}

interface NodeTooltipsProps {
  /** The viewport's own container: nodes are looked up inside it only. */
  containerRef: RefObject<HTMLElement | null>
  /** The rendered SVG; nodes are resolved again when it changes. */
  svg: string
  items: Record<string, GlossaryKey>
  label: string
}

/** Makes the nodes of the rendered diagram focusable and shows their glossary entry in a popover anchored to the node. */
export const NodeTooltips = ({ containerRef, svg, items, label }: NodeTooltipsProps) => {
  const [active, setActive] = useState<Active | null>(null)
  const [portal, setPortal] = useState<HTMLElement | undefined>(undefined)
  const activeRef = useRef<Active | null>(null)
  const lastElement = useRef<SVGGElement | null>(null)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const restoreFocus = useRef(false)
  const overPopover = useRef(false)

  const show = useCallback(
    (next: Active | null) => {
      activeRef.current = next
      if (next) {
        lastElement.current = next.element
        // Inside the fullscreen dialog the popover must live in the dialog, or its focus trap and
        // pointer-events lock would swallow every interaction with it.
        setPortal(containerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined)
      }
      setActive(next)
    },
    [containerRef],
  )

  const close = useCallback(
    (focusNode: boolean) => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
      restoreFocus.current = focusNode
      overPopover.current = false
      show(null)
    },
    [show],
  )

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      // The pointer may already be in the popover: its enter fires before the node's leave.
      if (activeRef.current?.mode === 'hover' && !overPopover.current) close(false)
    }, HOVER_CLOSE_MS)
  }, [close])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const resolved = resolveDiagramItems(root, items, (key) => GLOSSARY[key].title, label)
    const cleanups: (() => void)[] = []

    const clearTimers = () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    }

    for (const { element, key } of resolved) {
      let down: { x: number; y: number } | null = null
      const onEnter = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        clearTimers()
        if (activeRef.current?.mode === 'pinned') return
        openTimer.current = window.setTimeout(() => show({ element, key, mode: 'hover' }), HOVER_OPEN_MS)
      }
      const onLeave = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        window.clearTimeout(openTimer.current)
        if (activeRef.current?.element === element && activeRef.current.mode === 'hover') scheduleClose()
      }
      const onDown = (event: PointerEvent) => {
        down = { x: event.clientX, y: event.clientY }
      }
      const onClick = (event: MouseEvent) => {
        // A click that ends a pan drag is not a request for a tooltip.
        if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_PX) return
        const current = activeRef.current
        if (current?.element === element && current.mode === 'pinned') close(false)
        else {
          clearTimers()
          show({ element, key, mode: 'pinned' })
        }
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        clearTimers()
        show({ element, key, mode: 'pinned' })
      }
      element.addEventListener('pointerenter', onEnter)
      element.addEventListener('pointerleave', onLeave)
      element.addEventListener('pointerdown', onDown, true)
      element.addEventListener('click', onClick)
      element.addEventListener('keydown', onKeyDown)
      cleanups.push(() => {
        element.removeEventListener('pointerenter', onEnter)
        element.removeEventListener('pointerleave', onLeave)
        element.removeEventListener('pointerdown', onDown, true)
        element.removeEventListener('click', onClick)
        element.removeEventListener('keydown', onKeyDown)
      })
    }

    return () => {
      cleanups.forEach((fn) => fn())
      clearTimers()
      activeRef.current = null
      setActive(null)
    }
  }, [containerRef, svg, items, label, show, close, scheduleClose])

  // One stable virtual anchor that always measures the current node. The popover recomputes its position
  // every frame, so it follows the node while the diagram is zoomed or panned.
  const anchor = useMemo(() => {
    const reference = {
      getBoundingClientRect: () => activeRef.current?.element.getBoundingClientRect() ?? new DOMRect(),
      get contextElement() {
        return activeRef.current?.element
      },
    }
    return { current: reference }
  }, [])

  const entry = active ? GLOSSARY[active.key] : null

  return (
    <Popover.Root open={active !== null} onOpenChange={(open) => !open && close(restoreFocus.current)}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal container={portal}>
        {active && entry && (
          <Popover.Content
            side="bottom"
            align="center"
            sideOffset={8}
            collisionPadding={8}
            hideWhenDetached
            updatePositionStrategy="always"
            aria-label={entry.title}
            className="z-50 max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none"
            onOpenAutoFocus={(event) => {
              // A hover must not take focus; a pinned popover does, so its link is reachable from the keyboard.
              if (active.mode === 'hover') event.preventDefault()
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (restoreFocus.current) lastElement.current?.focus()
              restoreFocus.current = false
            }}
            onEscapeKeyDown={() => {
              restoreFocus.current = true
            }}
            onInteractOutside={(event) => {
              // A press on the node itself is handled by its click (it toggles the pin).
              if (event.target instanceof Node && active.element.contains(event.target)) event.preventDefault()
            }}
            onPointerEnter={() => {
              overPopover.current = true
              window.clearTimeout(closeTimer.current)
            }}
            onPointerLeave={(event) => {
              overPopover.current = false
              if (event.pointerType === 'mouse' && activeRef.current?.mode === 'hover') scheduleClose()
            }}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm leading-snug font-semibold break-words">{entry.title}</h3>
                <ProviderBadge provider={entry.provider} />
              </div>
              <EntryDetails entry={entry} />
            </div>
          </Popover.Content>
        )}
      </Popover.Portal>
    </Popover.Root>
  )
}
