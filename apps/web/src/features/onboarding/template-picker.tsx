import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTemplates } from '@/lib/api'
import { SelectableTemplateCard } from './selectable-template-card'

interface TemplatePickerProps {
  selected: string[]
  disabled: boolean
  onToggle: (templateId: string) => void
  describedBy?: string
}

/** The template grid with its loading, error and empty states. */
export const TemplatePicker = ({ selected, disabled, onToggle, describedBy }: TemplatePickerProps) => {
  const templates = useTemplates()

  if (templates.isPending) {
    return (
      <div role="status" aria-label="Loading templates" className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    )
  }

  if (templates.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p>Could not load the templates.</p>
        <Button type="button" variant="outline" className="min-h-touch md:min-h-9" onClick={() => void templates.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (templates.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates yet. Show us a sample document instead, or skip and add types later.
      </p>
    )
  }

  return (
    <fieldset aria-describedby={describedBy} className="min-w-0">
      <legend className="sr-only">Document templates</legend>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {templates.data.map((template) => (
          <SelectableTemplateCard
            key={template.id}
            template={template}
            selected={selected.includes(template.id)}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </div>
    </fieldset>
  )
}
