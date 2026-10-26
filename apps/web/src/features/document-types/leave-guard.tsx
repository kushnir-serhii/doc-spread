import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { readSavedNotice } from './saved-notice'

interface LeaveGuardProps {
  dirty: boolean
  /** what is lost on leaving; defaults to the type builder's text */
  description?: string
}

/** Asks before leaving with unsaved changes: in-app navigation (router) and closing the tab (browser). */
export const LeaveGuard = ({
  dirty,
  description = 'You changed this type and haven’t saved it. If you leave now, the changes are lost.',
}: LeaveGuardProps) => {
  // The dialog has no trigger, so "Stay" would drop focus on <body>: send it back to what started the leave.
  const returnFocus = useRef<HTMLElement | null>(null)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      // The save of a new type navigates with its notice; that leave is intended.
      readSavedNotice(nextLocation.state) === null &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return (
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
      <AlertDialogContent
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus.current?.focus()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-touch md:min-h-9">Stay</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-touch md:min-h-9"
            onClick={(event) => {
              // Leaving unmounts the dialog; closing it first would reset the blocker.
              event.preventDefault()
              blocker.proceed?.()
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
