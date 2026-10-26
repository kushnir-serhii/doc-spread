import type { ComponentProps } from 'react'
import type { DocumentType } from '@/lib/mock/types'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import { ReviewActionBar } from './review-action-bar'
import { ReviewWarningsDialog } from './review-warnings-dialog'
import type { useReviewActions } from './use-review-actions'

type DraftState = Pick<ComponentProps<typeof ReviewActionBar>, 'dirty' | 'save'>

interface ReviewActionsProps extends DraftState {
  type: DocumentType
  actions: ReturnType<typeof useReviewActions>
  onIssueSelect: (issue: ValidationIssue) => void
}

/** The action bar wired to approve and reject (the actions live in the workspace, which the shortcuts share). */
export const ReviewActions = ({ type, actions, dirty, save, onIssueSelect }: ReviewActionsProps) => (
  <>
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
    <ReviewWarningsDialog
      open={actions.confirmingWarnings}
      warnings={actions.warnings}
      onConfirm={() => void actions.approve({ confirmed: true })}
      onCancel={actions.cancelWarnings}
    />
  </>
)
