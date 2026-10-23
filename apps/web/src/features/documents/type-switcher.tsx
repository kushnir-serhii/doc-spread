import { Link } from 'react-router'
import type { DocumentType } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { TypeSwitcherSkeleton } from './type-switcher-skeleton'

export interface TypeCounts {
  unclassified: number
  needsReviewByType: Map<string, number>
}

interface TypeSwitcherProps {
  types: DocumentType[]
  /** 'all', 'unclassified' or a type id */
  active: string
  /** undefined while loading */
  counts: TypeCounts | undefined
  /** href for a given ?type= value (null = All); keeps other URL params */
  hrefFor: (type: string | null) => string
}

interface Tab {
  value: string
  label: string
  count: number
  countLabel: string
}

export const TypeSwitcher = ({ types, active, counts, hrefFor }: TypeSwitcherProps) => {
  if (!counts) return <TypeSwitcherSkeleton />
  const tabs: Tab[] = [
    { value: 'all', label: 'All', count: 0, countLabel: '' },
    ...types.map((type) => ({
      value: type.id,
      label: type.name,
      count: counts.needsReviewByType.get(type.id) ?? 0,
      countLabel: 'need review',
    })),
    { value: 'unclassified', label: 'Unclassified', count: counts.unclassified, countLabel: 'to classify' },
  ]
  return (
    <nav aria-label="Document type" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 border-b">
        {tabs.map((tab) => {
          const isActive = tab.value === active
          return (
            <li key={tab.value}>
              <Link
                to={hrefFor(tab.value === 'all' ? null : tab.value)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.count > 0 ? `${tab.label}, ${tab.count} ${tab.countLabel}` : undefined}
                className={cn(
                  '-mb-px flex min-h-touch items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-warning-soft px-2 text-xs tabular-nums text-warning-soft-foreground"
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
