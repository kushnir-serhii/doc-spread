import type { CsvFile } from './build-csv'

/** Browser download through a temporary link; call from an event handler. */
export const downloadCsv = (file: CsvFile): void => {
  const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
