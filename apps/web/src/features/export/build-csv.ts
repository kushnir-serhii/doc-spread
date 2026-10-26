import type { Document, ExportFormat } from '@/lib/mock/types'
import type { ExportPlan } from './export-plan'

export interface CsvFile {
  name: string
  content: string
}

const BOM = '﻿'

/** RFC 4180: quote a field holding a quote, comma, CR or LF; double the quotes inside. */
export const csvField = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

/** CRLF line endings, UTF-8 BOM first so Excel reads the encoding right. */
export const buildCsv = (headers: string[], rows: string[][]): string =>
  BOM + [headers, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n'

/** True when the export is one CSV file: no table goes to a separate file. */
export const isSingleCsvFile = (plan: ExportPlan, format: ExportFormat): boolean =>
  format === 'csv' && plan.separate.length === 0

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const isoDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `<type-slug>-<yyyy-mm-dd>.csv` */
export const csvFileName = (typeName: string, date: Date): string =>
  `${slugify(typeName) || 'export'}-${isoDate(date)}.csv`

export const buildCsvFile = (plan: ExportPlan, documents: Document[], typeName: string, date: Date): CsvFile => ({
  name: csvFileName(typeName, date),
  content: buildCsv(
    plan.headers,
    documents.flatMap((doc) => plan.rowsFor(doc)),
  ),
})
