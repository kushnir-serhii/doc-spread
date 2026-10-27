import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { SETTINGS_TABS, panelId, tabId } from './settings-tab-ids'
import type { SettingsTab } from './settings-tab-ids'

const LABELS: Record<SettingsTab, string> = {
  company: 'Company',
  recipients: 'Recipients',
  team: 'Team',
  plan: 'Plan',
}

interface SettingsTabsProps {
  value: SettingsTab
  onChange: (tab: SettingsTab) => void
}

/** WAI-ARIA tabs: roving tabindex; arrow keys, Home and End move and select. */
export const SettingsTabs = ({ value, onChange }: SettingsTabsProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SETTINGS_TABS.indexOf(value)
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % SETTINGS_TABS.length
        break
      case 'ArrowLeft':
        next = (index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = SETTINGS_TABS.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const target = SETTINGS_TABS[next]
    onChange(target)
    document.getElementById(tabId(target))?.focus()
  }

  return (
    <div role="tablist" aria-label="Settings" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b">
      {SETTINGS_TABS.map((tab) => {
        const selected = tab === value
        return (
          <button
            key={tab}
            id={tabId(tab)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(tab)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={cn(
              '-mb-px min-h-touch shrink-0 border-b-2 px-4 text-sm font-medium transition-colors md:min-h-9',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {LABELS[tab]}
          </button>
        )
      })}
    </div>
  )
}
