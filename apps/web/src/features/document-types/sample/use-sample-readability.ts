import { useDocumentPages } from '@/lib/api'

/** The mock gives an uploaded file one blank page with no words: nothing on it can be pointed at or read. */
export const useUnreadableSample = (documentId: string): boolean => {
  const pages = useDocumentPages(documentId)
  return pages.data !== undefined && pages.data.length > 0 && pages.data.every((page) => page.tokens.length === 0)
}
