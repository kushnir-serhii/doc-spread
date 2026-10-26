import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentTemplate } from '@/lib/mock/templates'

const SHOWN_FIELDS = 4

interface SelectableTemplateCardProps {
  template: DocumentTemplate
  selected: boolean
  disabled: boolean
  onToggle: (templateId: string) => void
}

/** A template card with checkbox semantics: the whole card is the label of a real checkbox. */
export const SelectableTemplateCard = ({ template, selected, disabled, onToggle }: SelectableTemplateCardProps) => {
  const shown = template.fields.slice(0, SHOWN_FIELDS)
  const more = template.fields.length - shown.length
  return (
    <label
      className={cn(
        'relative flex h-full min-h-touch cursor-pointer flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
        selected && 'border-primary bg-accent',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={selected}
        disabled={disabled}
        onChange={() => onToggle(template.id)}
      />
      <span
        aria-hidden
        className={cn(
          'absolute top-4 right-4 flex size-5 items-center justify-center rounded border bg-background',
          selected && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {selected && <Check className="size-3.5" />}
      </span>
      <span className="min-w-0 pr-8">
        <span className="block truncate font-medium" title={template.name}>
          {template.name}
        </span>
        <span className="mt-1 line-clamp-3 block text-sm text-muted-foreground">{template.description}</span>
      </span>
      <span className="mt-auto flex flex-wrap gap-1.5" aria-hidden>
        {shown.map((field) => (
          <span key={field.id} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs" title={field.label}>
            {field.label}
          </span>
        ))}
        {more > 0 && <span className="px-1 py-0.5 text-xs text-muted-foreground">+{more} more</span>}
      </span>
    </label>
  )
}
