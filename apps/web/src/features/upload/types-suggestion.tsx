import { Link } from 'react-router'

const MAX_LINKS = 3

const linkClass =
  'inline-flex min-h-11 max-w-full items-center rounded-md px-1 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

interface TypesSuggestionProps {
  documents: { id: string; name: string }[]
}

/** Shown when the user has no document types: offers to make one from a file just uploaded. */
export const TypesSuggestion = ({ documents }: TypesSuggestionProps) => {
  const shown = documents.slice(0, MAX_LINKS)
  const more = documents.length - shown.length
  return (
    <aside className="flex flex-col gap-1 rounded-md border border-info bg-info-soft p-4 text-info-soft-foreground">
      <p className="text-sm font-semibold">You don't have document types yet</p>
      <p className="text-sm">Make one from a file you just uploaded.</p>
      <ul className="flex flex-col">
        {shown.map((document) => (
          <li key={document.id} className="min-w-0">
            <Link to={`/types/new?from=sample&documentId=${encodeURIComponent(document.id)}`} className={linkClass}>
              <span className="truncate">Make a type from {document.name}</span>
            </Link>
          </li>
        ))}
        {more > 0 && (
          <li>
            <Link to="/inbox?type=unclassified" className={linkClass}>
              +{more} more
            </Link>
          </li>
        )}
      </ul>
    </aside>
  )
}
