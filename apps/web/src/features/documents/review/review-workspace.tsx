import { useRef, useState } from 'react'
import { LeaveGuard } from '@/features/document-types/leave-guard'
import { cellFocusId, fieldFocusId } from '@/features/documents/fields/field-focus-ids'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import type { Document, DocumentType } from '@/lib/mock/types'
import { ReviewForm } from './review-form'
import { ReviewViewerPane } from './review-viewer-pane'
import { ReviewShortcutsDialog } from './review-shortcuts-dialog'
import { ReviewActions } from './review-actions'
import { isReviewDone } from './review-done'
import { focusFieldControl } from './focus-field-control'
import { useNextDocument } from './use-next-document'
import { useReviewActions } from './use-review-actions'
import { useReviewDraft } from './use-review-draft'
import { useReviewShortcuts } from './use-review-shortcuts'
import { useReviewPointing } from './use-review-pointing'
import { useReviewHighlights } from './use-review-highlights'

interface ReviewWorkspaceProps {
  doc: Document
  type: DocumentType
}

/** Viewer and form side by side (stacked on small screens), tied together by focus ids. */
export const ReviewWorkspace = ({ doc, type }: ReviewWorkspaceProps) => {
  const viewerRef = useRef<DocumentViewerHandle>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const editable = doc.status === 'needs_review'
  const { draft, setValue, confirm, save, saveNow, dirty, mutation } = useReviewDraft(doc)
  const pointing = useReviewPointing({ doc, type, draft, setValue, formRef })
  const highlights = useReviewHighlights(doc.id, draft, type)
  const actions = useReviewActions({ doc, type, draft, dirty, saveNow })
  const planNext = useNextDocument(doc, type)
  const [helpOpen, setHelpOpen] = useState(false)
  const busy = actions.approving || actions.rejecting || mutation.isPending
  const shortcuts = useReviewShortcuts({
    formRef,
    editable,
    onApprove: () => {
      if (!busy) void actions.approve()
    },
    onSave: () => {
      if (dirty && !busy) save()
    },
    onNextDocument: planNext(null),
    onHelp: () => setHelpOpen(true),
  })

  const focusField = (id: string) => {
    setFocusedId(id)
    // focus stays in the form: the viewer only scrolls
    viewerRef.current?.scrollToHighlight(id, { focus: false })
  }
  const focusFromBox = (id: string) => {
    setFocusedId(id)
    const target = formRef.current?.querySelector<HTMLElement>(`[data-focus-id="${id}"]`)
    focusFieldControl(target)
  }
  const focusIssue = (issue: ValidationIssue) => {
    const base = fieldFocusId(doc.id, issue.fieldId)
    const id = issue.cell ? cellFocusId(base, issue.cell.rowId, issue.cell.columnId) : base
    if (formRef.current?.querySelector(`[data-focus-id="${id}"]`)) focusFromBox(id)
    // a table without rows (or a cell not on screen) has no target: the field's own row is
    else focusFieldControl(formRef.current?.querySelector<HTMLElement>(`[data-field-id="${issue.fieldId}"]`))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <ReviewViewerPane
        ref={viewerRef}
        doc={doc}
        highlights={highlights}
        activeHighlightId={hoveredId ?? focusedId}
        onHighlightClick={focusFromBox}
        mode={editable ? pointing.mode : 'view'}
        onSelect={pointing.select}
        onCancel={pointing.cancel}
      />
      <div className="flex flex-col gap-3">
        <ReviewShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} editable={editable} />
        <ReviewForm
          ref={formRef}
          docId={doc.id}
          type={type}
          values={draft}
          onValueChange={editable ? setValue : undefined}
          onConfirm={editable ? confirm : undefined}
          pointing={editable ? pointing : undefined}
          onFieldFocus={focusField}
          onFieldHover={setHoveredId}
        />
        {editable && (
          <ReviewActions
            type={type}
            actions={actions}
            dirty={dirty}
            save={{
              isPending: mutation.isPending,
              isSuccess: mutation.isSuccess,
              errorMessage: mutation.isError ? mutation.error.message : null,
              onSave: save,
            }}
            onIssueSelect={focusIssue}
          />
        )}
      </div>
      <p role="status" className="sr-only">
        {pointing.announcement || shortcuts.message}
      </p>
      {editable && (
        <LeaveGuard
          dirty={dirty}
          isExempt={isReviewDone}
          description="You changed values in this document and haven’t saved them. If you leave now, the changes are lost."
        />
      )}
    </div>
  )
}
