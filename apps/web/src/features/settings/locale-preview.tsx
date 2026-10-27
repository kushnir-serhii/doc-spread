import { formatDate, formatMoney } from '@/lib/mock/format'
import type { CurrencyCode } from '@/lib/mock/types'

interface LocalePreviewProps {
  /** the chosen tag; `undefined` = the browser's */
  locale: string | undefined
  currency: CurrencyCode
}

const SAMPLE_NUMBER = 1234567.89
const SAMPLE_MINOR = 123456789

/** Today's date, a number and an amount in the chosen locale, before it is saved. */
export const LocalePreview = ({ locale, currency }: LocalePreviewProps) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border bg-muted/40 p-3 text-sm">
    <dt className="text-muted-foreground">Date</dt>
    <dd className="tabular-nums">{formatDate(new Date().toISOString(), locale)}</dd>
    <dt className="text-muted-foreground">Number</dt>
    <dd className="tabular-nums">{new Intl.NumberFormat(locale).format(SAMPLE_NUMBER)}</dd>
    <dt className="text-muted-foreground">Amount</dt>
    <dd className="tabular-nums">{formatMoney(SAMPLE_MINOR, currency, locale)}</dd>
  </dl>
)
