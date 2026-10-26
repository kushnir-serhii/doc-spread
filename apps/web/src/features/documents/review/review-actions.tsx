import type { ComponentProps } from 'react'
import type { Document, DocumentType } from '@/lib/mock/types'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import { ReviewActionBar } from './review-action-bar'
import { useReviewActions } from './use-review-actions'

type DraftState = Pick<ComponentProps<typeof ReviewActionBar>, 'dirty' | 'save'>

interface ReviewActionsProps extends DraftState {
  doc: Document
  type: DocumentType
  draft: Parameters<typeof useReviewActions>[0]['draft']
  saveNow: () => Promise<void>
  onIssueSelect: (issue: ValidationIssue) => void
}

/** The action bar wired to approve and reject. */
export const ReviewActions = ({ doc, type, draft, dirty, save, saveNow, onIssueSelect }: ReviewActionsProps) => {
  const actions = useReviewActions({ doc, type, draft, dirty, saveNow })
  return (
    <ReviewActionBar
      typeName={type.name}
      dirty={dirty}
      save={save}
      approve={{
        isPending: actions.approving,
        errorMessage: actions.approveError,
        issues: actions.issues,
        onApprove: () => void actions.approve(),
      }}
      reject={{
        isPending: actions.rejecting,
        errorMessage: actions.rejectError,
        onReject: (reason) => void actions.reject(reason),
        onOpen: actions.resetRejectError,
      }}
      onIssueSelect={onIssueSelect}
    />
  )
}
