import { useContext } from 'react'
import { FormatLocaleContext } from './format-locale-context'

/** Locale to pass to formatMoney / formatDate / formatFieldValue / formatEvalValue. `undefined` = the browser's. */
export const useFormatLocale = (): string | undefined => useContext(FormatLocaleContext)
