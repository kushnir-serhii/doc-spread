import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { AnyExtractedValue } from '@/lib/mock/types'
import type { FieldViewProps } from './field-types'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

/** Read-only value of any scalar field. Long values wrap; the title carries the full text. */
export const ScalarView = <V extends AnyExtractedValue>({ value }: FieldViewProps<V>) => {
  const locale = useFormatLocale()
  if (value.value === null) {
    return <p className="text-sm text-muted-foreground italic">Not found</p>
  }
  const text = formatFieldValue(value, locale)
  return (
    <p title={text} className="text-sm font-medium break-words">
      {text}
    </p>
  )
}
