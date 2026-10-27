import type { ReactNode } from 'react'
import { FormatLocaleContext } from './format-locale-context'

interface FormatLocaleProviderProps {
  /** the company's locale; `undefined` = the browser's */
  locale: string | undefined
  children: ReactNode
}

export const FormatLocaleProvider = ({ locale, children }: FormatLocaleProviderProps) => (
  <FormatLocaleContext.Provider value={locale}>{children}</FormatLocaleContext.Provider>
)
