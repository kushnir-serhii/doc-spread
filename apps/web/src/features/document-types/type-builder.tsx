import { useReducer, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { resolveSelection, type Selection } from './editor-target'
import { FieldEditorPanel } from './field-editor-panel'
import { FieldList } from './field-list'
import type { TypeDraft } from './type-draft'
import { builderReducer, createBuilderState } from './type-draft-reducer'
import { TypeMetaForm } from './type-meta-form'

interface TypeBuilderProps {
  /** Read once on mount: mount with a `key` per source (template, saved type). */
  initialDraft: TypeDraft
}

export const TypeBuilder = ({ initialDraft }: TypeBuilderProps) => {
  const [{ draft }, dispatch] = useReducer(builderReducer, initialDraft, createBuilderState)
  // The selection is local state: it needn't survive a reload, and a new draft has no ids to link to.
  const [selection, setSelection] = useState<Selection>(null)
  const target = resolveSelection(selection, draft.fields)

  const addField = () => {
    const id = crypto.randomUUID()
    dispatch({ type: 'addField', id })
    setSelection({ kind: 'field', fieldId: id })
  }

  const duplicateField = (id: string) => {
    const newId = crypto.randomUUID()
    dispatch({ type: 'duplicateField', id, newId })
    setSelection({ kind: 'field', fieldId: newId })
  }

  const deleteField = (id: string) => {
    dispatch({ type: 'deleteField', id })
    setSelection(null)
  }

  const addColumn = (fieldId: string) => {
    const id = crypto.randomUUID()
    dispatch({ type: 'column', fieldId, op: { kind: 'add', id } })
    setSelection({ kind: 'column', fieldId, columnId: id })
  }

  const duplicateColumn = (fieldId: string, columnId: string) => {
    const newId = crypto.randomUUID()
    dispatch({ type: 'column', fieldId, op: { kind: 'duplicate', id: columnId, newId } })
    setSelection({ kind: 'column', fieldId, columnId: newId })
  }

  // The table stays selected, so the editor does not go blank.
  const deleteColumn = (fieldId: string, columnId: string) => {
    dispatch({ type: 'column', fieldId, op: { kind: 'delete', id: columnId } })
    setSelection({ kind: 'field', fieldId })
  }

  return (
    <>
      <Link
        to="/types"
        className="mb-4 -ml-2 inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to types
      </Link>
      <TypeMetaForm
        name={draft.name}
        description={draft.description}
        onNameChange={(name) => dispatch({ type: 'setName', name })}
        onDescriptionChange={(description) => dispatch({ type: 'setDescription', description })}
      />
      <h2 className="mb-2 text-sm font-medium">Fields ({draft.fields.length})</h2>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <FieldList
            fields={draft.fields}
            selection={selection}
            onSelect={setSelection}
            onMove={(id, direction) => dispatch({ type: 'moveField', id, direction })}
            onMoveColumn={(fieldId, columnId, direction) =>
              dispatch({ type: 'column', fieldId, op: { kind: 'move', id: columnId, direction } })
            }
            onAdd={addField}
            onAddColumn={addColumn}
          />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <FieldEditorPanel
            target={target}
            fields={draft.fields}
            dispatch={dispatch}
            onDuplicateField={duplicateField}
            onDeleteField={deleteField}
            onAddColumn={addColumn}
            onDuplicateColumn={duplicateColumn}
            onDeleteColumn={deleteColumn}
            onClose={() => setSelection(null)}
          />
        </div>
      </div>
    </>
  )
}
