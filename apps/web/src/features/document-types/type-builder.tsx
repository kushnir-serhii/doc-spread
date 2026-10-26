import { useReducer, useRef, useState } from 'react'
import { ArrowLeft, ScanSearch } from 'lucide-react'
import { Link } from 'react-router'
import { resolveSelection, type Selection } from './editor-target'
import { ErrorSummary } from './error-summary'
import { FieldEditorPanel } from './field-editor-panel'
import { FieldList } from './field-list'
import { focusIssue, getInvalidIds, getIssueSelection, getTargetIssues } from './issue-targets'
import { isSameDraft } from './is-same-draft'
import { LeaveGuard } from './leave-guard'
import { ListSettingsSection } from './list-settings-section'
import { SaveBar } from './save-bar'
import { SaveImpactDialog } from './save-impact-dialog'
import type { TypeDraft } from './type-draft'
import { builderReducer, createBuilderState } from './type-draft-reducer'
import { TypeMetaForm } from './type-meta-form'
import { useDraftActions } from './use-draft-actions'
import { useTypeSave, type SavedTypeInfo } from './use-type-save'
import type { ValidationIssue } from './validate-draft'

interface TypeBuilderProps {
  /** Read once on mount: mount with a `key` per source (template, saved type, saved version). */
  initialDraft: TypeDraft
  /** Set when editing a type that exists; saving it creates the next version. */
  savedType?: SavedTypeInfo
  /** Success message of the save that led here. */
  notice?: string | null
  onSaved?: (notice: string) => void
}

export const TypeBuilder = ({ initialDraft, savedType, notice = null, onSaved }: TypeBuilderProps) => {
  const [{ draft }, dispatch] = useReducer(builderReducer, initialDraft, createBuilderState)
  // The draft the builder started with: what "unsaved" is measured against.
  const [baseline] = useState(initialDraft)
  // The selection is local state: it needn't survive a reload, and a new draft has no ids to link to.
  const [selection, setSelection] = useState<Selection>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const target = resolveSelection(selection, draft.fields)
  const actions = useDraftActions(dispatch, setSelection)
  const save = useTypeSave({ draft, baseline, savedType, onSaved })

  const dirty = !isSameDraft(draft, baseline)
  const shownIssues = save.attempted ? save.issues : []

  const handleSave = () => {
    if (save.requestSave() === 'invalid') requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const goToIssue = (issue: ValidationIssue) => {
    const next = getIssueSelection(issue)
    if (next) setSelection(next)
    // Wait for the editor (or, below lg, the sheet) to render the selected item.
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/types"
          className="-ml-2 inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to types
        </Link>
        {savedType && (
          <Link
            to={`/types/${savedType.id}/train`}
            className="inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
          >
            <ScanSearch className="size-4" aria-hidden />
            Train with samples
          </Link>
        )}
      </div>
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
      <ListSettingsSection draft={draft} dispatch={dispatch} />
      <h2 className="mb-2 text-sm font-medium">Fields ({draft.fields.length})</h2>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <FieldList
            fields={draft.fields}
            titleFieldId={draft.titleFieldId}
            listColumnIds={draft.listColumnIds}
            selection={selection}
            invalidIds={getInvalidIds(shownIssues)}
            onSelect={setSelection}
            onMove={(id, direction) => dispatch({ type: 'moveField', id, direction })}
            onMoveColumn={(fieldId, columnId, direction) =>
              dispatch({ type: 'column', fieldId, op: { kind: 'move', id: columnId, direction } })
            }
            onAdd={actions.addField}
            onAddColumn={actions.addColumn}
          />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <FieldEditorPanel
            target={target}
            fields={draft.fields}
            dispatch={dispatch}
            issues={getTargetIssues(shownIssues, target)}
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
