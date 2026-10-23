import { Link } from 'react-router'
import { FileStack } from 'lucide-react'
import { NEW_TYPE_OPTIONS } from './new-type-options'

export const TypesEmptyState = () => (
  <div className="flex flex-col items-center rounded-lg border border-dashed p-6 text-center sm:p-10">
    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <FileStack className="size-6" aria-hidden />
    </span>
    <h2 className="mt-4 text-lg font-semibold">No document types yet</h2>
    <p className="mt-1 max-w-md text-sm text-muted-foreground">
      A type describes one kind of document you collect, like an invoice or a contract: which fields to read
      and which to show in lists. Create one to start processing files.
    </p>
    <ul className="mt-6 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
      {NEW_TYPE_OPTIONS.map(({ id, label, hint, to, icon: Icon }) => (
        <li key={id}>
          <Link
            to={to}
            className="flex h-full min-h-touch flex-col items-center gap-1 rounded-lg border bg-card p-4 text-center outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
)
