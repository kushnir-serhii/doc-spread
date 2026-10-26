import { useRef, useState } from 'react'
import { LeaveGuard } from '@/features/document-types/leave-guard'
import { cellFocusId, fieldFocusId } from '@/features/documents/fields/field-focus-ids'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import type { Document, DocumentType } from '@/lib/mock/types'
import { ReviewForm } from './review-form'
import { ReviewViewerPane } from './review-viewer-pane'
import { ReviewActions } from './review-actions'
import { isReviewDone } from './review-done'
import { useReviewDraft } from './use-review-draft'
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

  const focusField = (id: string) => {
    setFocusedId(id)
    // focus stays in the form: the viewer only scrolls
    viewerRef.current?.scrollToHighlight(id, { focus: false })
  }
  const focusFromBox = (id: string) => {
    setFocusedId(id)
    const target = formRef.current?.querySelector<HTMLElement>(`[data-focus-id="${id}"]`)
    focusControl(target)
  }
  const focusControl = (target: HTMLElement | null | undefined) => {
    // an editable row is not focusable itself: its first control is
    const control = target?.matches('input, button, [tabindex]')
      ? target
      : target?.querySelector<HTMLElement>('input, [role="combobox"], [role="switch"], button')
    control?.focus()
  }
  const focusIssue = (issue: ValidationIssue) => {
    const base = fieldFocusId(doc.id, issue.fieldId)
    const id = issue.cell ? cellFocusId(base, issue.cell.rowId, issue.cell.columnId) : base
    if (formRef.current?.querySelector(`[data-focus-id="${id}"]`)) focusFromBox(id)
    // a table without rows (or a cell not on screen) has no target: the field's own row is
    else focusControl(formRef.current?.querySelector<HTMLElement>(`[data-field-id="${issue.fieldId}"]`))
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
            doc={doc}
            type={type}
            draft={draft}
            dirty={dirty}
            saveNow={saveNow}
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
        {pointing.announcement}
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
