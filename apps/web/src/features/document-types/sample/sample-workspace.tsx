import { useReducer, useState } from 'react'
import type { FieldDef } from '@/lib/mock/types'
import type { Selection } from '../editor-target'
import { blankDraft, type TypeDraft } from '../type-draft'
import { builderReducer, createBuilderState } from '../type-draft-reducer'
import type { SavedTypeInfo } from '../use-type-save'
import { AddSampleDialog } from './add-sample-dialog'
import type { AddSampleView } from './add-sample-body'
import { SampleReview } from './sample-review'
import { SampleSaveSection } from './sample-save-section'
import { SampleSummary } from './sample-summary'
import { SampleTabs } from './sample-tabs'
import { useProposalReview } from './use-proposal-review'
import { useSampleRemoval } from './use-sample-removal'
import { useSampleSummary } from './use-sample-summary'
import { useSamples } from './use-samples'

interface SampleWorkspaceProps {
  /** Read once on mount: a saved type's draft when training, a blank one for a new type. */
  initialDraft?: TypeDraft
  /** The documents to test on, in tab order (up to 5). */
  initialSamples: string[]
  /** Proposed from the first sample; none when training a type that exists. */
  proposals: FieldDef[]
  savedType?: SavedTypeInfo
  notice?: string | null
  onSaved?: (notice: string, sampleIds: string[]) => void
}

/** One draft tested on up to 5 samples: the draft, the proposal review and the chooser outlive a tab switch. */
export const SampleWorkspace = ({ initialDraft, initialSamples, proposals, savedType, notice, onSaved }: SampleWorkspaceProps) => {
  const [{ draft }, dispatch] = useReducer(builderReducer, initialDraft, (d) => createBuilderState(d ?? blankDraft()))
  const [baseline] = useState(() => initialDraft ?? blankDraft())
  const [selection, setSelection] = useState<Selection>(null)
  const [chooser, setChooser] = useState<AddSampleView | null>(initialSamples.length === 0 ? 'examples' : null)
  const samples = useSamples(initialSamples)
  const removeExamples = useSampleRemoval(draft, dispatch)
  // A sample that was removed no longer backs an unaccepted proposal's box.
  const usable = proposals.map((p) => ({ ...p, examples: p.examples.filter((e) => samples.ids.includes(e.documentId)) }))
  const review = useProposalReview(usable, draft, dispatch)
  const live = review.items.filter((item) => item.status !== 'rejected').map((item) => item.field)
  const summary = useSampleSummary(samples.ids, live, draft.actions)

  const addSample = (id: string) => {
    if (samples.add(id) !== 'full') setChooser(null)
  }

  return (
    <>
      <SampleSaveSection
        draft={draft}
        baseline={baseline}
        dispatch={dispatch}
        onSelect={setSelection}
        sampleIds={samples.ids}
        savedType={savedType}
        notice={notice}
        onSaved={onSaved && ((message) => onSaved(message, samples.ids))}
      />
      <SampleTabs
        ids={samples.ids}
        activeId={samples.activeId}
        full={samples.full}
        onSelect={samples.setActive}
        onRemove={(id) => {
          if (samples.remove(id)) removeExamples(id)
        }}
        onAdd={() => setChooser('upload')}
      />
      <SampleSummary summary={summary} sampleCount={samples.ids.length} />
      <AddSampleDialog
        open={chooser !== null}
        initialView={chooser ?? 'upload'}
        takenIds={samples.ids}
        onOpenChange={(open) => !open && setChooser(null)}
        onAdd={addSample}
      />
      {samples.activeId !== null && (
        <SampleReview
          key={samples.activeId}
          documentId={samples.activeId}
          draft={draft}
          dispatch={dispatch}
          items={review.items}
          openCount={review.openCount}
          live={live}
          heading={proposals.length > 0 ? 'Proposed fields' : 'Fields'}
          selection={selection}
          onSelection={setSelection}
          reviewActions={review}
          onTryExample={() => setChooser('examples')}
        />
      )}
    </>
  )
}
