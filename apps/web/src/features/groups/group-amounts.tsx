import { useFormatLocale } from '@/lib/format-locale/use-format-locale'
import { formatMoney } from '@/lib/mock/format'
import type { Money } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

interface GroupAmountsProps {
  /** one per currency, sorted by currency code */
  amounts: Money[]
  className?: string
}

/** One line per currency; "—" when nothing was summed. */
export const GroupAmounts = ({ amounts, className }: GroupAmountsProps) => {
  const locale = useFormatLocale()
  if (amounts.length === 0) {
    return (
      <span aria-label="No amounts" className={cn('text-muted-foreground', className)}>
        —
      </span>
    )
  }
  return (
    <span className={cn('flex flex-col tabular-nums', className)}>
      {amounts.map(({ amount, currency }) => (
        <span key={currency}>{formatMoney(amount, currency, locale)}</span>
      ))}
    </span>
  )
}
