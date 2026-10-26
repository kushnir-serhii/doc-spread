import type { Ref } from 'react'
import { fieldFocusId } from '@/features/documents/fields/field-focus-ids'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { DocumentType, FieldValue } from '@/lib/mock/types'
import { ReviewFieldRow } from './review-field-row'
import type { ReviewPointing } from './use-review-pointing'

interface ReviewFormProps {
  docId: string
  type: DocumentType
  /** the draft values */
  values: Record<string, FieldValue>
  /** omitted when the document is read-only */
  onValueChange?: (fieldId: string, next: FieldValue) => void
  onConfirm?: (fieldId: string) => void
  pointing?: ReviewPointing
  /** a field (or table cell) took focus; id as in field-focus-ids.ts */
  onFieldFocus: (id: string) => void
  onFieldHover: (id: string | null) => void
  ref?: Ref<HTMLDivElement>
}

const focusIdOf = (target: EventTarget): string | null =>
  target instanceof HTMLElement ? (target.closest<HTMLElement>('[data-focus-id]')?.dataset.focusId ?? null) : null

/** Every field of the type, in order. Focus and hover are caught once here instead of on every field. */
export const ReviewForm = ({
  docId,
  type,
  values,
  onValueChange,
  onConfirm,
  pointing,
  onFieldFocus,
  onFieldHover,
  ref,
}: ReviewFormProps) => (
  <div
    ref={ref}
    role="group"
    aria-label="Extracted fields"
    className="flex flex-col gap-3"
    onFocus={(event) => {
      const id = focusIdOf(event.target)
      if (id) onFieldFocus(id)
    }}
    onMouseOver={(event) => onFieldHover(focusIdOf(event.target))}
    onMouseLeave={() => onFieldHover(null)}
  >
    {type.fields.length === 0 && <p className="text-sm text-muted-foreground">This type has no fields.</p>}
    {type.fields.map((field) => (
      <ReviewFieldRow
        key={field.id}
        field={field}
        value={values[field.id] ?? FIELD_TYPE_META[field.type].empty()}
        focusId={fieldFocusId(docId, field.id)}
        onChange={onValueChange && ((next) => onValueChange(field.id, next))}
        onConfirm={onConfirm && (() => onConfirm(field.id))}
        pointing={pointing}
      />
    ))}
  </div>
)
