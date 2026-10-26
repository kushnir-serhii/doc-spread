import { useState } from 'react'
import { useApproveDocuments, useRejectDocument } from '@/lib/api'
import { validateDocument, type ValidationIssue } from '@/lib/fields/validate-field-value'
import type { Document, DocumentType, FieldValue } from '@/lib/mock/types'
import { useNextDocument } from './use-next-document'

interface UseReviewActionsOptions {
  doc: Document
  type: DocumentType
  draft: Record<string, FieldValue>
  /** something (an edit or a computed value) has to be stored before approving */
  needsSave: boolean
  /** from the checks: failed blocking checks, and what needs a confirmation */
  blockingChecks: ValidationIssue[]
  warnings: ValidationIssue[]
  saveNow: () => Promise<void>
}

/** Approve (checks, saves, approves) and Reject, each followed by the next document in the queue. */
export const useReviewActions = ({ doc, type, draft, needsSave, blockingChecks, warnings, saveNow }: UseReviewActionsOptions) => {
  const planNext = useNextDocument(doc, type)
  const approveMutation = useApproveDocuments()
  const rejectMutation = useRejectDocument()
  // After a blocked Approve the list stays and follows the draft, so it empties as the problems are fixed.
  const [blocked, setBlocked] = useState(false)
  const issues = blocked ? [...validateDocument(type, draft), ...blockingChecks] : []
  // Warnings need a yes before Approve goes on; Cancel returns to the form.
  const [confirmingWarnings, setConfirmingWarnings] = useState(false)

  /** `confirmed`: the user has already said yes to the warnings in the dialog. */
  const approve = async ({ confirmed = false }: { confirmed?: boolean } = {}) => {
    const found = [...validateDocument(type, draft), ...blockingChecks]
    setBlocked(found.length > 0)
    if (found.length > 0) return
    if (warnings.length > 0 && !confirmed) {
      setConfirmingWarnings(true)
      return
    }
    setConfirmingWarnings(false)
    const goNext = planNext('approved')
    try {
      // one action: the edits are stored first, so what is approved is what is on screen
      if (needsSave) await saveNow()
      await approveMutation.mutateAsync([doc.id])
    } catch {
      // a failed save shows in the save state, a failed approval in approveMutation
      return
    }
    goNext()
  }

  const reject = async (reason: string) => {
    const goNext = planNext('rejected')
    try {
      await rejectMutation.mutateAsync({ id: doc.id, reason })
    } catch {
      return
    }
    goNext()
  }

  return {
    approve,
    reject,
    issues,
    warnings,
    confirmingWarnings,
    cancelWarnings: () => setConfirmingWarnings(false),
    approving: approveMutation.isPending,
    approveError: approveMutation.isError ? approveMutation.error.message : null,
    rejecting: rejectMutation.isPending,
    rejectError: rejectMutation.isError ? rejectMutation.error.message : null,
    resetRejectError: rejectMutation.reset,
  }
}
