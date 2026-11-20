import { ChevronRight } from 'lucide-react'

import { GLOSSARY, PROVIDERS, PROVIDER_LABELS } from '@/features/architecture/diagrams/glossary'
import type { GlossaryKey } from '@/features/architecture/diagrams/glossary'
import { EntryDetails, ProviderBadge } from '@/features/architecture/glossary-parts'

interface DiagramItemsListProps {
  items: Record<string, GlossaryKey>
}

/** The same entries as the tooltips, as text under the diagram (also for screen readers). */
export const DiagramItemsList = ({ items }: DiagramItemsListProps) => {
  const keys = [...new Set(Object.values(items))]
  const groups = PROVIDERS.map((provider) => ({
    provider,
    entries: keys.filter((key) => GLOSSARY[key].provider === provider).map((key) => ({ key, entry: GLOSSARY[key] })),
  })).filter((group) => group.entries.length > 0)

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex min-h-touch items-center gap-2 px-4 text-sm font-medium">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
        Items in this diagram ({keys.length})
      </summary>
      <div className="space-y-6 border-t p-4">
        {groups.map(({ provider, entries }) => (
          <section key={provider} aria-label={PROVIDER_LABELS[provider]} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ProviderBadge provider={provider} />
              <span className="text-muted-foreground">{entries.length}</span>
            </h3>
            <ul className="space-y-4">
              {entries.map(({ key, entry }) => (
                <li key={key} className="space-y-2 border-l-2 pl-3">
                  <h4 className="text-sm font-semibold break-words">{entry.title}</h4>
                  <EntryDetails entry={entry} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  )
}
