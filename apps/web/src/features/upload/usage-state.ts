import type { PlanUsage } from '@/lib/mock/types'

/** From this share of the limit the Upload screen warns. */
const WARNING_SHARE = 0.8

export type UsageState =
  | { level: 'ok'; line: string }
  | { level: 'warning'; line: string; detail: string }
  | { level: 'limit'; line: string; resetsOn: string }

/** The reset day: the first day of the month after `periodStart`, formatted in the user's locale (UTC day, as counted). */
export const formatResetDate = (periodStart: string, locale: string | undefined): string => {
  const start = new Date(periodStart)
  const reset = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(reset)
}

export const describeUsage = (usage: PlanUsage, locale: string | undefined): UsageState => {
  const number = new Intl.NumberFormat(locale)
  const used = usage.documentsThisMonth
  const limit = usage.plan.documentsPerMonth
  const line = `${number.format(used)} of ${number.format(limit)} documents this month`
  const resetsOn = formatResetDate(usage.periodStart, locale)
  if (used >= limit) return { level: 'limit', line, resetsOn }
  if (used / limit >= WARNING_SHARE) {
    const left = limit - used
    return { level: 'warning', line: `${line}.`, detail: `${number.format(left)} left until ${resetsOn}.` }
  }
  return { level: 'ok', line }
}
