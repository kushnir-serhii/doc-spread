import type { Dispatch } from 'react'
import { ListColumnsPicker } from './list-columns-picker'
import { TitleFieldSelect } from './title-field-select'
import type { TypeDraft } from './type-draft'
import type { BuilderAction } from './type-draft-reducer'

interface ListSettingsSectionProps {
  draft: TypeDraft
  dispatch: Dispatch<BuilderAction>
}

/** How documents of this type look in the Inbox. */
export const ListSettingsSection = ({ draft, dispatch }: ListSettingsSectionProps) => (
  <section aria-labelledby="list-settings-heading" className="mb-6 grid max-w-3xl gap-4">
    <h2 id="list-settings-heading" className="text-sm font-medium">
      List settings
    </h2>
    <TitleFieldSelect
      fields={draft.fields}
      value={draft.titleFieldId}
      onChange={(id) => dispatch({ type: 'setTitleField', id })}
    />
    <ListColumnsPicker
      fields={draft.fields}
      titleFieldId={draft.titleFieldId}
      listColumnIds={draft.listColumnIds}
      onToggle={(id) => dispatch({ type: 'toggleListColumn', id })}
      onMove={(id, direction) => dispatch({ type: 'moveListColumn', id, direction })}
    />
  </section>
)
