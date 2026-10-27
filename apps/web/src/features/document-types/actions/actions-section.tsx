import type { Dispatch } from 'react'
import type { BuilderAction } from '../type-draft-reducer'
import type { TypeDraft } from '../type-draft'
import { ActionDialog } from './action-dialog'
import { isDocumentAction, type ActionEditorTarget } from './action-form'
import { actionProblems } from './action-problems'
import { ActionRow } from './action-row'
import { AddActionMenu } from './add-action-menu'

interface ActionsSectionProps {
  draft: TypeDraft
  dispatch: Dispatch<BuilderAction>
  /** undefined = the type isn't saved yet (no documents to preview on) */
  typeId: string | undefined
  /** what the dialog is open for; null = closed. Lives in the builder so an error or a computed field can open it. */
  target: ActionEditorTarget | null
  onTarget: (target: ActionEditorTarget | null) => void
}

/** Checks and computed fields of the type, below the fields. */
export const ActionsSection = ({ draft, dispatch, typeId, target, onTarget }: ActionsSectionProps) => {
  const { actions, fields } = draft
  const noFields = fields.length === 0
  // row actions are shown but not edited yet (spec 017 slice 2)
  const found = target?.mode === 'edit' ? actions.find((a) => a.id === target.id) : undefined
  const editing = found && isDocumentAction(found) ? found : undefined
  const dialogOpen = target !== null && (target.mode === 'new' || editing !== undefined)

  return (
    <section aria-labelledby="actions-heading" className="mt-8">
      <h2 id="actions-heading" className="mb-2 text-sm font-medium">
        Actions ({actions.length})
      </h2>
      {actions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <div>
            <p className="font-medium">No actions yet</p>
            <p className="max-w-prose text-sm text-muted-foreground">
              Actions work across fields. A <strong>check</strong> warns or blocks approval in Review, like Gross = Net +
              VAT. A <strong>computed field</strong> is calculated instead of extracted, like Due in days = Due date −
              Issue date.
            </p>
          </div>
          <AddActionMenu disabled={noFields} onAdd={(kind) => onTarget({ mode: 'new', kind })} />
          {noFields && <p className="text-xs text-muted-foreground">Add a field first.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="divide-y rounded-lg border bg-card">
            {actions.map((action) => (
              <li key={action.id}>
                <ActionRow
                  action={action}
                  fields={fields}
                  invalid={actionProblems(action, fields, actions).length > 0}
                  onEdit={isDocumentAction(action) ? () => onTarget({ mode: 'edit', id: action.id }) : undefined}
                  onRemove={() => dispatch({ type: 'removeAction', id: action.id })}
                />
              </li>
            ))}
          </ul>
          <AddActionMenu onAdd={(kind) => onTarget({ mode: 'new', kind })} />
        </div>
      )}
      {target && dialogOpen && (
        <ActionDialog
          key={target.mode === 'edit' ? target.id : `new-${target.kind}`}
          target={target}
          fields={fields}
          actions={actions}
          titleFieldId={draft.titleFieldId}
          typeId={typeId}
          onClose={() => onTarget(null)}
          onSave={(action, mode) => {
            dispatch({ type: mode === 'new' ? 'addAction' : 'updateAction', action })
            onTarget(null)
          }}
        />
      )}
    </section>
  )
}
