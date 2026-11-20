import { crc32, deflateRawSync } from 'node:zlib'
import type { Sheet } from './types.js'

const BOM = '﻿'

/** RFC 4180: quote a field holding a quote, comma, CR or LF; double the quotes inside. */
const csvField = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

/** CRLF line endings, UTF-8 BOM first so Excel reads the encoding right. */
export const buildCsv = (sheet: Sheet): Buffer => {
  const lines = [sheet.headers, ...sheet.rows.map((row) => row.map((cell) => cell.text))]
  return Buffer.from(BOM + lines.map((line) => line.map(csvField).join(',')).join('\r\n') + '\r\n', 'utf8')
}

// ---------- zip (stored entries, deflate) for a CSV with separate tables ----------

const u16 = (value: number): Buffer => {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}
const u32 = (value: number): Buffer => {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value >>> 0)
  return buffer
}

/** A minimal zip writer: deflated entries, UTF-8 names, no zip64 (exports are far below 4 GB). */
export const buildZip = (entries: { name: string; data: Buffer }[]): Buffer => {
  const locals: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8')
    const packed = deflateRawSync(data)
    const crc = crc32(data)
    const common = [u16(20), u16(0x0800), u16(8), u16(0), u16(0x21), u32(crc), u32(packed.length), u32(data.length), u16(nameBytes.length), u16(0)]
    const local = Buffer.concat([u32(0x04034b50), ...common, nameBytes, packed])
    central.push(Buffer.concat([u32(0x02014b50), u16(20), ...common, u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]))
    locals.push(local)
    offset += local.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(directory.length), u32(offset), u16(0)])
  return Buffer.concat([...locals, directory, end])
}

// ---------- xlsx ----------

/** Excel sheet names: at most 31 characters, none of []:*?/\, unique ignoring case. */
const sheetNames = (names: string[]): string[] => {
  const used = new Set<string>()
  return names.map((raw) => {
    const base = raw.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet'
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n += 1) {
      const suffix = ` ${n}`
      name = base.slice(0, 31 - suffix.length) + suffix
    }
    used.add(name.toLowerCase())
    return name
  })
}

/** Money as numbers with the currency's decimals, dates as dates, text as text; a bold, frozen header row. */
export const buildXlsx = async (sheets: Sheet[]): Promise<Buffer> => {
  const { default: ExcelJS } = await import('exceljs') // loaded on use: other routes don't pay for it
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  const names = sheetNames(sheets.map((sheet) => sheet.name))
  sheets.forEach((sheet, index) => {
    const worksheet = workbook.addWorksheet(names[index], { views: [{ state: 'frozen', ySplit: 1 }] })
    const header = worksheet.addRow(sheet.headers)
    header.font = { bold: true }
    const widths = sheet.headers.map((text) => Math.min(Math.max(text.length + 2, 10), 40))
    for (const row of sheet.rows) {
      const added = worksheet.addRow(row.map((cell) => cell.value))
      row.forEach((cell, column) => {
        if (cell.format) added.getCell(column + 1).numFmt = cell.format
        widths[column] = Math.min(Math.max(widths[column] ?? 10, cell.text.length + 2), 40)
      })
    }
    widths.forEach((width, column) => {
      worksheet.getColumn(column + 1).width = width
    })
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
