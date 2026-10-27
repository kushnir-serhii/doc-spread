import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FieldAction, FieldDef } from '@/lib/mock/types'
import {
  formFromAction,
  formProblems,
  formToAction,
  newForm,
  withScope,
  type ActionEditorTarget,
  type ActionForm,
} from './action-form'
import { rowScopeOf } from './action-scope'
import { ActionPreview } from './action-preview'
import { ActionProblemList } from './action-problem-list'
import { ActionLine } from './action-line'
import { CheckForm } from './check-form'
import { ComputeForm } from './compute-form'
import { INCOMPLETE } from './expr-problems'
import { RowComputeForm } from './row-compute-form'
import { ScopeSelect } from './scope-select'

interface ActionDialogProps {
  target: ActionEditorTarget
  fields: FieldDef[]
  /** every action of the draft */
  actions: FieldAction[]
  titleFieldId: string | null
  /** undefined = the type isn't saved yet */
  typeId: string | undefined
  onSave: (action: FieldAction, mode: ActionEditorTarget['mode']) => void
  onClose: () => void
}

const initialForm = (target: ActionEditorTarget, fields: FieldDef[], actions: FieldAction[]): ActionForm => {
  const existing = target.mode === 'edit' ? actions.find((a) => a.id === target.id) : undefined
  return existing ? formFromAction(existing, fields) : newForm(target.mode === 'new' ? target.kind : 'check')
}

/** Adds or edits one action on a copy; nothing reaches the draft until it is saved here. Mount with a `key` per target. */
export const ActionDialog = ({ target, fields, actions, titleFieldId, typeId, onSave, onClose }: ActionDialogProps) => {
  const [form, setForm] = useState(() => initialForm(target, fields, actions))
  const problems = formProblems(form, fields, actions)
  const action = problems.length === 0 ? formToAction(form, fields, actions) : null
  const isRow = form.scope.kind === 'row'
  const kindName = form.kind === 'check' ? 'check' : isRow ? 'computed column' : 'computed field'
  // The choice is offered when there is a table; an action already on a row stays editable even if its table is gone.
  const showScope = isRow || fields.some((field) => field.type === 'table')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] gap-5 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{target.mode === 'new' ? `Add ${kindName}` : `Edit ${kindName}`}</DialogTitle>
          <DialogDescription>
            {form.kind === 'check'
              ? isRow
                ? 'Compare two values in every row of a table. A failed row is shown in Review.'
                : 'Compare two values. A failed check is shown in Review.'
              : isRow
                ? 'Calculate a column from the row’s other cells instead of reading it from the document.'
                : 'Calculate a field from other fields instead of reading it from the document.'}
          </DialogDescription>
        </DialogHeader>
        <ActionLine form={form} fields={fields} />
        {showScope && (
          <ScopeSelect scope={form.scope} fields={fields} onChange={(scope) => setForm(withScope(form, scope, fields, actions))} />
        )}
        {form.kind === 'check' ? (
          <CheckForm form={form} fields={fields} row={rowScopeOf(form.scope, form.id, undefined, actions)} onChange={setForm} />
        ) : form.scope.kind === 'row' ? (
          <RowComputeForm form={form} tableFieldId={form.scope.tableFieldId} fields={fields} actions={actions} onChange={setForm} />
        ) : (
          <ComputeForm form={form} fields={fields} actions={actions} onChange={setForm} />
        )}
        <ActionProblemList
          problems={problems.filter((problem) => problem !== INCOMPLETE)}
          incomplete={problems.includes(INCOMPLETE)}
        />
        <ActionPreview
          action={action}
          fields={fields}
          otherActions={actions.filter((a) => a.id !== form.id)}
          titleFieldId={titleFieldId}
          typeId={typeId}
        />
        <DialogFooter>
          <Button variant="outline" className="min-h-touch md:min-h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-h-touch md:min-h-9"
            disabled={action === null}
            onClick={() => action && onSave(action, target.mode)}
          >
            {target.mode === 'new' ? 'Add action' : 'Save action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
