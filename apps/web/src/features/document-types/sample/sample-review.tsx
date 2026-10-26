import { useRef, type Dispatch, type SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import { useTestExtractPreview } from '@/lib/api'
import type { FieldDef } from '@/lib/mock/types'
import { resolveSelection, type Selection } from '../editor-target'
import { FieldEditorPanel } from '../field-editor-panel'
import type { TypeDraft } from '../type-draft'
import type { BuilderAction } from '../type-draft-reducer'
import { useDraftActions } from '../use-draft-actions'
import { AddTableButton } from './add-table-button'
import { PointButton } from './point-button'
import { PointingPanels } from './pointing-panels'
import { ProposalList } from './proposal-list'
import { buildProposalHighlights } from './proposal-highlights'
import { SampleViewer } from './sample-viewer'
import { UnreadableNotice } from './unreadable-notice'
import { useAddTable } from './use-add-table'
import { usePointAgain } from './use-point-again'
import { usePointToAdd } from './use-point-to-add'
import { useProposalActivation } from './use-proposal-activation'
import type { ProposalItem } from './use-proposal-review'
import { useSamplePointing } from './use-sample-pointing'
import { useUnreadableSample } from './use-sample-readability'

interface SampleReviewProps {
  /** The active sample. Mount with a `key` per sample: pointing restarts on a tab switch. */
  documentId: string
  draft: TypeDraft
  dispatch: Dispatch<BuilderAction>
  items: ProposalItem[]
  openCount: number
  /** Fields shown (not rejected): what the sample is tested with. */
  live: FieldDef[]
  heading: string
  selection: Selection
  onSelection: Dispatch<SetStateAction<Selection>>
  reviewActions: {
    acceptAll: () => void
    accept: (id: string) => void
    reject: (id: string) => void
    restore: (id: string) => void
    rename: (id: string, label: string) => void
  }
  onTryExample: () => void
}

/** The viewer, the field list (values for this sample) and the field editor. */
export const SampleReview = ({
  documentId,
  draft,
  dispatch,
  items,
  openCount,
  live,
  heading,
  selection,
  onSelection,
  reviewActions,
  onTryExample,
}: SampleReviewProps) => {
  const viewerRef = useRef<DocumentViewerHandle>(null)
  const pointRef = useRef<HTMLButtonElement>(null)
  const tableRef = useRef<HTMLButtonElement>(null)
  const { activeId, activate } = useProposalActivation(viewerRef)
  const actions = useDraftActions(dispatch, onSelection)
  const point = usePointToAdd(documentId, items, dispatch, pointRef)
  const table = useAddTable(documentId, dispatch, tableRef)
  const preview = useTestExtractPreview(documentId, live)
  const again = usePointAgain(documentId, items, preview.data, dispatch)
  const pointing = useSamplePointing(point, again, table)
  const unreadable = useUnreadableSample(documentId)
  const highlights = buildProposalHighlights(items, documentId, preview.data)
  const selectedId = selection?.fieldId ?? null

  const selectField = (id: string) => {
    onSelection({ kind: 'field', fieldId: id })
    // The list is long on real documents: bring the row of a clicked box into view.
    document.querySelector(`[data-proposal-id="${id}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <>
      {unreadable && (
        <div className="mb-4">
          <UnreadableNotice onTryExample={onTryExample} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-5 2xl:grid-cols-7">
        <div className="h-sample-pane min-w-0 lg:sticky lg:top-24 lg:col-span-3">
          <SampleViewer
            ref={viewerRef}
            documentId={documentId}
            highlights={highlights}
            activeHighlightId={activeId ?? selectedId}
            onHighlightClick={selectField}
            mode={pointing.mode}
            onSelect={pointing.select}
            onCancel={pointing.cancel}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <PointingPanels point={point} table={table} />
          <ProposalList
            heading={heading}
            pointAction={
              <div className="flex flex-wrap justify-center gap-2">
                <PointButton ref={pointRef} pointing={point.pointing} onToggle={pointing.togglePoint} />
                <AddTableButton ref={tableRef} pointing={table.pointing} onToggle={pointing.toggleTable} />
              </div>
            }
            items={items}
            openCount={openCount}
            documentId={documentId}
            values={preview.data}
            valuesLoading={preview.isPending && live.length > 0}
            valuesFailed={preview.isError}
            selectedId={selectedId}
            pointAgain={{ ...again, start: pointing.startAgain }}
            onRetryValues={() => void preview.refetch()}
            onAcceptAll={reviewActions.acceptAll}
            onActivate={activate}
            onSelect={selectField}
            onAccept={reviewActions.accept}
            onReject={reviewActions.reject}
            onRestore={reviewActions.restore}
            onRename={reviewActions.rename}
          />
          <Button variant="outline" onClick={actions.addField} className="min-h-touch self-start md:min-h-9">
            <Plus aria-hidden /> Add a field manually
          </Button>
        </div>
        {/* below 2xl the editor is a sheet (portal), so this cell takes no grid space */}
        <div className="min-w-0 max-2xl:contents 2xl:col-span-2">
          <FieldEditorPanel
            besideFrom="(min-width: 1536px)"
            target={resolveSelection(selection, draft.fields)}
            fields={draft.fields}
            dispatch={dispatch}
            issues={[]}
            onDuplicateField={actions.duplicateField}
            onDeleteField={actions.deleteField}
            onAddColumn={actions.addColumn}
            onDuplicateColumn={actions.duplicateColumn}
            onDeleteColumn={actions.deleteColumn}
            onClose={() => onSelection(null)}
          />
        </div>
      </div>
    </>
  )
}
