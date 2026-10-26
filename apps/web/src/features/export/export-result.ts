import type { ExportFormat } from '@/lib/mock/types'
import type { CsvFile } from './build-csv'

/** What the success panel needs; kept above the form because exported documents leave the approved list. */
export interface ExportResult {
  typeId: string
  typeName: string
  count: number
  format: ExportFormat
  /** the address an email export went to; undefined for a download */
  recipient?: string
  /** the generated file, only for a single CSV file */
  file?: CsvFile
}
