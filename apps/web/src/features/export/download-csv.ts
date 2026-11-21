import type { ExportDownload } from '@/lib/mock/types'
import type { CsvFile } from './build-csv'

const clickLink = (href: string, name: string): void => {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
}

/** Browser download through a temporary link; call from an event handler. */
export const downloadCsv = (file: CsvFile): void => {
  const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }))
  clickLink(url, file.name)
  URL.revokeObjectURL(url)
}

/** Download of a file the server built, from its signed link (served as an attachment). */
export const downloadFromUrl = (download: ExportDownload): void => clickLink(download.url, download.name)
