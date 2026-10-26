import { useEffect, useState, type RefObject } from 'react'
import { focusFieldControl } from './focus-field-control'
import { isTypingTarget } from './is-typing-target'

interface UseReviewShortcutsArgs {
  formRef: RefObject<HTMLElement | null>
  /** false once the document is approved, exported or rejected: only moving, next document and help remain */
  editable: boolean
  onApprove: () => void
  onSave: () => void
  onNextDocument: () => void
  onHelp: () => void
}

const DIALOG = '[role="dialog"], [role="alertdialog"]'
const ROW = '[data-field-id]'

const rowsOf = (form: HTMLElement) => Array.from(form.querySelectorAll<HTMLElement>(ROW))

/** Moves focus to a row (J/K); the first row when none is focused. Stops at the ends. */
const moveRow = (form: HTMLElement, step: 1 | -1) => {
  const rows = rowsOf(form)
  const current = rows.findIndex((row) => row.contains(document.activeElement))
  const next = rows[current < 0 ? 0 : Math.min(Math.max(current + step, 0), rows.length - 1)]
  next?.focus()
  next?.scrollIntoView({ block: 'nearest' })
}

/** The focused row's own button (Confirm, Point on document): the same path as a click. */
const clickInRow = (form: HTMLElement, selector: string): HTMLElement | null => {
  const row = rowsOf(form).find((r) => r.contains(document.activeElement))
  const button = row?.querySelector<HTMLElement>(selector)
  if (!row || !button) return null
  button.click()
  // the Confirm button disappears once used: focus stays on the row
  if (!button.isConnected) row.focus()
  return row
}

/** One keydown listener for the whole screen. Returns a message for the live region. */
export const useReviewShortcuts = ({ formRef, editable, onApprove, onSave, onNextDocument, onHelp }: UseReviewShortcutsArgs) => {
  const [message, setMessage] = useState('')

  // re-subscribed after every render so the handlers are never stale
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const form = formRef.current
      if (!form || document.querySelector(DIALOG)) return
      const key = event.key.toLowerCase()
      const withModifier = event.ctrlKey || event.metaKey

      if (withModifier && editable && (key === 'enter' || key === 's')) {
        event.preventDefault()
        if (key === 'enter') onApprove()
        else onSave()
        return
      }
      if (event.key === 'Escape') {
        const target = event.target
        const row = target instanceof Element ? target.closest<HTMLElement>(ROW) : null
        const open = target instanceof Element && target.closest('[aria-expanded="true"]') !== null
        // an input that handled Esc itself (a grid cell, an open select) keeps it
        if (!event.defaultPrevented && row && form.contains(row) && isTypingTarget(target) && !open) row.focus()
        return
      }
      if (withModifier || event.altKey || isTypingTarget(event.target)) return

      if (key === 'j' || key === 'k') {
        event.preventDefault()
        moveRow(form, key === 'j' ? 1 : -1)
      } else if (key === 'n') onNextDocument()
      else if (event.key === '?') onHelp()
      else if (key === 'enter' && editable && event.target instanceof HTMLElement && event.target.matches(ROW)) {
        event.preventDefault()
        focusFieldControl(event.target)
      } else if (key === 'c' && editable) {
        const row = clickInRow(form, '[data-confirm]')
        const label = row && document.getElementById(row.getAttribute('aria-labelledby') ?? '')?.textContent
        if (row) setMessage(`${label ?? 'Field'} confirmed`)
      } else if (key === 'p' && editable) clickInRow(form, '[data-point-id]')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return { message }
}
