import { createContext } from 'react'

/** The locale dates, numbers and amounts are formatted in. `undefined` = the browser's. */
export const FormatLocaleContext = createContext<string | undefined>(undefined)
