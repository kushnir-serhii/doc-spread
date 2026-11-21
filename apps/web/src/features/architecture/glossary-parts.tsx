import type { GlossaryEntry, Provider } from '@/features/architecture/diagrams/glossary'
import { PROVIDER_LABELS } from '@/features/architecture/diagrams/glossary'
import { cn } from '@/lib/utils'

// Token pairs that already meet AA in light and dark.
const PROVIDER_STYLES: Record<Provider, string> = {
  vercel: 'bg-foreground text-background',
  supabase: 'bg-success-soft text-success-soft-foreground',
  github: 'bg-muted text-foreground',
  anthropic: 'bg-warning-soft text-warning-soft-foreground',
  browser: 'bg-info-soft text-info-soft-foreground',
  app: 'bg-primary-soft text-primary-soft-foreground',
}

export const ProviderBadge = ({ provider, className }: { provider: Provider; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
      PROVIDER_STYLES[provider],
      className,
    )}
  >
    {PROVIDER_LABELS[provider]}
  </span>
)

/** The text of an entry, shared by the tooltip and the "Items in this diagram" list. */
export const EntryDetails = ({ entry }: { entry: GlossaryEntry }) => (
  <div className="space-y-3 text-sm">
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">What it is</p>
      <p>{entry.summary}</p>
    </div>
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">In DocSpread</p>
      <p>{entry.role}</p>
    </div>
    {entry.where && entry.where.length > 0 && (
      <ul className="space-y-1" aria-label="Where it lives">
        {entry.where.map((path) => (
          <li key={path} className="font-mono text-xs break-all text-muted-foreground">
            {path}
          </li>
        ))}
      </ul>
    )}
    {entry.docsUrl && (
      <a
        href={entry.docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-touch items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Docs <span aria-hidden="true">&nbsp;↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )}
  </div>
)
