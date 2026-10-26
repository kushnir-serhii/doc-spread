import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { tabId, panelId } from './export-tab-ids'
import type { ExportTab } from './export-tab-ids'


const TABS: { id: ExportTab; label: string }[] = [
  { id: 'new', label: 'New export' },
  { id: 'history', label: 'History' },
]


interface ExportTabsProps {
  value: ExportTab
  onChange: (tab: ExportTab) => void
}

/** WAI-ARIA tabs: roving tabindex; arrow keys, Home and End move and select. */
export const ExportTabs = ({ value, onChange }: ExportTabsProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === value)
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % TABS.length
        break
      case 'ArrowLeft':
        next = (index - 1 + TABS.length) % TABS.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = TABS.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const target = TABS[next]
    onChange(target.id)
    document.getElementById(tabId(target.id))?.focus()
  }

  return (
    <div role="tablist" aria-label="Export" onKeyDown={onKeyDown} className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px min-h-touch border-b-2 px-4 text-sm font-medium transition-colors md:min-h-9',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
