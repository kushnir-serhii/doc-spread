import { ArrowDown, ArrowRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOC_LINES = [
  { id: 'a', width: 'w-full' },
  { id: 'b', width: 'w-4/5' },
  { id: 'c', width: 'w-full' },
  { id: 'd', width: 'w-3/5' },
] as const
const TABLE_ROWS = [
  { id: 'a', width: 'w-3/4' },
  { id: 'b', width: 'w-2/3' },
  { id: 'c', width: 'w-4/5' },
  { id: 'd', width: 'w-1/2' },
] as const

export const HeroIllustration = () => {
  return (
    <div
      aria-hidden="true"
      className="flex w-full max-w-md flex-col items-center gap-4 sm:flex-row lg:max-w-none"
    >
      <div className="w-full flex-1 rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <div className="h-2.5 w-1/3 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex flex-col gap-2.5">
          {DOC_LINES.map(({ id, width }) => (
            <div key={id} className={cn('h-2 rounded-full bg-muted', width)} />
          ))}
        </div>
      </div>
      <ArrowDown className="size-6 shrink-0 text-muted-foreground sm:hidden" />
      <ArrowRight className="hidden size-6 shrink-0 text-muted-foreground sm:block" />
      <div className="w-full flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-2 gap-3 border-b bg-muted px-4 py-3">
          <div className="h-2.5 w-2/3 rounded-full bg-muted-foreground/30" />
          <div className="h-2.5 w-1/2 rounded-full bg-muted-foreground/30" />
        </div>
        {TABLE_ROWS.map(({ id, width }) => (
          <div key={id} className="grid grid-cols-2 gap-3 border-b px-4 py-3 last:border-b-0">
            <div className={cn('h-2 rounded-full bg-muted', width)} />
            <div className="h-2 w-1/3 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
