import { useRef, type Dispatch } from 'react'
import type { Selection } from '../editor-target'
import { ErrorSummary } from '../error-summary'
import { focusIssue, getIssueSelection } from '../issue-targets'
import { isSameDraft } from '../is-same-draft'
import { LeaveGuard } from '../leave-guard'
import { SaveBar } from '../save-bar'
import { SaveImpactDialog } from '../save-impact-dialog'
import type { TypeDraft } from '../type-draft'
import type { BuilderAction } from '../type-draft-reducer'
import { TypeMetaForm } from '../type-meta-form'
import { useTypeSave, type SavedTypeInfo } from '../use-type-save'
import type { ValidationIssue } from '../validate-draft'
import { useAssignSamples } from './use-assign-samples'

interface SampleSaveSectionProps {
  draft: TypeDraft
  baseline: TypeDraft
  dispatch: Dispatch<BuilderAction>
  onSelect: (selection: Selection) => void
  /** Documents the type was tried on: the ones without a type join it on Save. */
  sampleIds: string[]
  /** Set when training a type that exists; saving creates the next version. */
  savedType?: SavedTypeInfo
  notice?: string | null
  onSaved?: (notice: string) => void
}

/** 014's save flow around the sample screen: name, Save bar, validation summary and leave guard. */
export const SampleSaveSection = ({
  draft,
  baseline,
  dispatch,
  onSelect,
  sampleIds,
  savedType,
  notice = null,
  onSaved,
}: SampleSaveSectionProps) => {
  const summaryRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const save = useTypeSave({ draft, baseline, savedType, onSaved, afterSave: useAssignSamples(sampleIds) })
  const dirty = !isSameDraft(draft, baseline)
  const shownIssues = save.attempted ? save.issues : []

  const handleSave = () => {
    if (save.requestSave() === 'invalid') requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const goToIssue = (issue: ValidationIssue) => {
    const next = getIssueSelection(issue)
    if (next) onSelect(next)
    requestAnimationFrame(() => focusIssue(issue, nameRef.current))
  }

  return (
    <>
      <LeaveGuard dirty={dirty} />
      {save.confirming && savedType && (
        <SaveImpactDialog
          impact={save.impact}
          documentCount={savedType.documentCount}
          nextVersion={save.nextVersion}
          onConfirm={save.confirm}
          onCancel={save.cancelConfirm}
        />
      )}
      <SaveBar
        version={savedType?.version ?? null}
        dirty={dirty}
        pending={save.pending}
        error={save.error?.message ?? null}
        notice={dirty ? null : notice}
        onSave={handleSave}
      />
      {shownIssues.length > 0 && <ErrorSummary ref={summaryRef} issues={shownIssues} onSelect={goToIssue} />}
      <TypeMetaForm
        name={draft.name}
        description={draft.description}
        nameError={shownIssues.find((issue) => issue.part === 'name')?.message ?? null}
        nameRef={nameRef}
        onNameChange={(name) => dispatch({ type: 'setName', name })}
        onDescriptionChange={(description) => dispatch({ type: 'setDescription', description })}
      />
    </>
  )
}
