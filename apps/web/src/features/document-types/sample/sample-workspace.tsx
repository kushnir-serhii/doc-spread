import { useReducer, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentViewer } from '@/features/documents/viewer/document-viewer'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import { useTestExtractPreview } from '@/lib/api'
import type { Document, FieldDef } from '@/lib/mock/types'
import { resolveSelection, type Selection } from '../editor-target'
import { FieldEditorPanel } from '../field-editor-panel'
import { blankDraft } from '../type-draft'
import { builderReducer, createBuilderState } from '../type-draft-reducer'
import { useDraftActions } from '../use-draft-actions'
import { buildProposalHighlights } from './proposal-highlights'
import { ProposalList } from './proposal-list'
import { SampleSaveSection } from './sample-save-section'
import { useProposalActivation } from './use-proposal-activation'
import { useProposalReview } from './use-proposal-review'

interface SampleWorkspaceProps {
  documentId: string
  file: Document['file']
  proposals: FieldDef[]
}

/** The viewer, the proposed fields and the field editor. The draft holds what was accepted until Save. */
export const SampleWorkspace = ({ documentId, file, proposals }: SampleWorkspaceProps) => {
  const [{ draft }, dispatch] = useReducer(builderReducer, undefined, () => createBuilderState(blankDraft()))
  const [baseline] = useState(blankDraft)
  const [selection, setSelection] = useState<Selection>(null)
  const viewerRef = useRef<DocumentViewerHandle>(null)
  const { activeId, activate } = useProposalActivation(viewerRef)
  const review = useProposalReview(proposals, draft, dispatch)
  const actions = useDraftActions(dispatch, setSelection)

  const live = review.items.filter((item) => item.status !== 'rejected').map((item) => item.field)
  const preview = useTestExtractPreview(documentId, live)
  const highlights = buildProposalHighlights(review.items, preview.data)
  const selectedId = selection?.fieldId ?? null
  const target = resolveSelection(selection, draft.fields)

  const selectField = (id: string) => {
    setSelection({ kind: 'field', fieldId: id })
    // The list is long on real documents: bring the row of a clicked box into view.
    document.querySelector(`[data-proposal-id="${id}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <>
      <SampleSaveSection draft={draft} baseline={baseline} dispatch={dispatch} onSelect={setSelection} />
      <div className="grid gap-6 lg:grid-cols-5 2xl:grid-cols-7">
        <div className="h-sample-pane min-w-0 lg:sticky lg:top-24 lg:col-span-3">
          <DocumentViewer
            ref={viewerRef}
            documentId={documentId}
            file={file}
            highlights={highlights}
            activeHighlightId={activeId ?? selectedId}
            onHighlightClick={selectField}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <ProposalList
            items={review.items}
            openCount={review.openCount}
            values={preview.data}
            valuesLoading={preview.isPending && live.length > 0}
            valuesFailed={preview.isError}
            selectedId={selectedId}
            onRetryValues={() => void preview.refetch()}
            onAcceptAll={review.acceptAll}
            onActivate={activate}
            onSelect={selectField}
            onAccept={review.accept}
            onReject={review.reject}
            onRestore={review.restore}
            onRename={review.rename}
          />
          <Button variant="outline" onClick={actions.addField} className="min-h-touch self-start md:min-h-9">
            <Plus aria-hidden /> Add a field manually
          </Button>
        </div>
        {/* below 2xl the editor is a sheet (portal), so this cell takes no grid space */}
        <div className="min-w-0 max-2xl:contents 2xl:col-span-2">
          <FieldEditorPanel
            besideFrom="(min-width: 1536px)"
            target={target}
            fields={draft.fields}
            dispatch={dispatch}
            issues={[]}
            onDuplicateField={actions.duplicateField}
            onDeleteField={actions.deleteField}
            onAddColumn={actions.addColumn}
            onDuplicateColumn={actions.duplicateColumn}
            onDeleteColumn={actions.deleteColumn}
            onClose={() => setSelection(null)}
          />
        </div>
      </div>
    </>
  )
}
