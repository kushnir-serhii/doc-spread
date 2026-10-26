import { useId } from 'react'
import { Check } from 'lucide-react'
import { useDocumentTypes } from '@/lib/api'

interface CreatedTypesListProps {
  ids: string[]
}

/** Types already made from a sample on the way here. */
export const CreatedTypesList = ({ ids }: CreatedTypesListProps) => {
  const types = useDocumentTypes()
  const titleId = useId()
  if (ids.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-sm font-medium">
        Already created from a sample
      </h2>
      <ul className="flex flex-col gap-1.5">
        {ids.map((id) => {
          const name = types.data?.find((t) => t.id === id)?.name
          return (
            <li key={id} className="flex min-w-0 items-center gap-2 text-sm">
              <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {name ? (
                <span className="truncate" title={name}>
                  {name}
                </span>
              ) : (
                <span className="text-muted-foreground">{types.isError ? 'Document type' : 'Loading…'}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
