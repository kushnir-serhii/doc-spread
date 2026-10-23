import { Link } from 'react-router'
import type { DocumentTemplate } from '@/lib/mock/templates'

const SHOWN_FIELDS = 4

interface TemplateCardProps {
  template: DocumentTemplate
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
  const shown = template.fields.slice(0, SHOWN_FIELDS)
  const more = template.fields.length - shown.length
  return (
    <Link
      to={`/types/new?template=${encodeURIComponent(template.id)}`}
      className="flex h-full min-h-touch flex-col gap-3 rounded-lg border bg-card p-4 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="min-w-0">
        <p className="truncate font-medium" title={template.name}>
          {template.name}
        </p>
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{template.description}</p>
      </div>
      <ul className="mt-auto flex flex-wrap gap-1.5" aria-label="Fields">
        {shown.map((field) => (
          <li key={field.id} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs" title={field.label}>
            {field.label}
          </li>
        ))}
        {more > 0 && <li className="px-1 py-0.5 text-xs text-muted-foreground">+{more} more</li>}
      </ul>
    </Link>
  )
}
