/**
 * Mock API layer. Every function here will be replaced by Supabase queries.
 *
 * The backend must provide:
 *  - Tables: document_types (every version kept and readable: one row per id + version), documents
 *    (linked to the type id AND version they were extracted with), document values (rows or jsonb),
 *    export_jobs (per type), companies, team_members. RLS per company.
 *  - Templates served by the API (editable without a frontend deploy), read-only for members.
 *  - File storage for uploads (one object per document, signed URLs), plus per-page data: page size,
 *    an optional page image, and OCR tokens with bboxes normalized 0..1 to the page AFTER rotation,
 *    origin top-left. The pages endpoint returns the same shape as the OCR JSON in public/mock.
 *  - A pipeline upload -> OCR -> classification -> extraction that moves status
 *    uploaded -> processing -> needs_review | unclassified | error. Classification uses the type
 *    names and descriptions and returns a confidence; extraction writes a value per field of the
 *    chosen type version, with per-value confidence (0..1) and an optional source page + bbox.
 *    Status changes should be pushed (realtime) or pollable.
 *  - Value storage: amounts as integer minor units + ISO currency, dates as ISO strings, tables as
 *    rows with stable row ids. Edits set confidence to 1 and are validated against the type version.
 *  - Server-side filtering by type and status, text search (file name + text-like values) and
 *    grouping: documents whose value for a groupable field matches after normalization (trim +
 *    lowercase), and a group listing (value, count, last document date) per type + field.
 *  - Transitions with validation: approve (needs_review | rejected -> approved), reject with a
 *    reason, reassign type (re-runs extraction with the current version -> needs_review).
 *    Whether approval is blocked while required fields are empty is an open question.
 *  - Type-from-sample: an endpoint that proposes fields (with examples) from one document, and a
 *    test-extract endpoint that runs extraction of a draft field list on one document, saving nothing.
 *  - Field examples are guidance for the AI, not schema: adding one does not raise the type version.
 *  - Export generation per document type (csv/xlsx/pdf bundle) with a download URL or email
 *    delivery, marking exported documents, and role checks (owner/admin/member).
 */
import {
  findValueMismatches,
  seedCompany,
  seedDocuments,
  seedDocumentTypeVersions,
  seedExportJobs,
  seedTeam,
} from './data'
import { DOCUMENT_TEMPLATES } from './templates'
import type { DocumentTemplate } from './templates'
import { fakeExtractFields } from './fake-extract'
import { seedDocumentPages } from './pages'
import type { PageSource } from './pages'
import { proposeFieldsFromPages } from './propose-fields'
import { overallConfidence } from './value-builders'
import type {
  BBox,
  Company,
  CreateDocumentTypeInput,
  CreateExportJobInput,
  Document,
  DocumentPage,
  DocumentType,
  ExportJob,
  FieldDef,
  FieldExample,
  FieldValue,
  FileType,
  GroupValue,
  ListDocumentsParams,
  TeamMember,
  TestExtractInput,
  Token,
  UpdateDocumentTypeInput,
} from './types'

function copy<T>(v: T): T {
  return structuredClone(v)
}

const db = {
  /** every version of every type */
  documentTypes: copy(seedDocumentTypeVersions),
  documents: copy(seedDocuments),
  pages: copy(seedDocumentPages),
  exportJobs: copy(seedExportJobs),
  company: copy(seedCompany),
  team: copy(seedTeam),
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 300)))
}

function later(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const normalize = (text: string) => text.trim().toLowerCase()

// ---------- lookups ----------
function currentVersions(): DocumentType[] {
  return db.documentTypes.filter(
    (t) => !db.documentTypes.some((other) => other.id === t.id && other.version > t.version),
  )
}

function findCurrentType(id: string): DocumentType {
  const type = currentVersions().find((t) => t.id === id)
  if (!type) throw new Error(`Document type not found: ${id}`)
  return type
}

function findDocument(id: string): Document {
  const doc = db.documents.find((d) => d.id === id)
  if (!doc) throw new Error(`Document not found: ${id}`)
  return doc
}

function assertTypeShape(type: Pick<DocumentType, 'fields' | 'titleFieldId' | 'listColumnIds'>): void {
  const keys = new Set<string>()
  for (const field of type.fields) {
    if (keys.has(field.key)) throw new Error(`Duplicate field key: ${field.key}`)
    keys.add(field.key)
    const columnKeys = new Set<string>()
    for (const column of field.columns ?? []) {
      if (columnKeys.has(column.key)) throw new Error(`Duplicate column key in ${field.key}: ${column.key}`)
      columnKeys.add(column.key)
    }
  }
  const ids = new Set(type.fields.map((f) => f.id))
  if (type.titleFieldId !== null && !ids.has(type.titleFieldId)) {
    throw new Error(`Title field not found: ${type.titleFieldId}`)
  }
  for (const id of type.listColumnIds) {
    if (!ids.has(id)) throw new Error(`List column not found: ${id}`)
  }
}

// ---------- values ----------
/** Text of a scalar value, for grouping and search. Null when empty (and for tables). */
function scalarText(value: FieldValue): string | null {
  switch (value.type) {
    case 'table':
      return null
    case 'text':
    case 'select':
    case 'email':
    case 'phone':
    case 'tax_id':
    case 'date':
      return value.value
    case 'number':
    case 'boolean':
      return value.value === null ? null : String(value.value)
    case 'money':
      return value.value === null ? null : `${(value.value.amount / 100).toFixed(2)} ${value.value.currency}`
    default: {
      const unreachable: never = value
      throw new Error(`Unknown value: ${String(unreachable)}`)
    }
  }
}

const SEARCHABLE_TYPES: string[] = ['text', 'select', 'email', 'phone', 'tax_id']

/** A person confirmed these values: confidence 1 on the scalar, or on every cell of the table. */
function confirm(value: FieldValue): FieldValue {
  if (value.type !== 'table') return { ...value, confidence: 1 }
  return {
    ...value,
    rows: value.rows.map((row) => ({
      ...row,
      cells: Object.fromEntries(Object.entries(row.cells).map(([id, cell]) => [id, { ...cell, confidence: 1 }])),
    })),
  }
}

// ---------- document types ----------
export async function listDocumentTypes(): Promise<DocumentType[]> {
  await delay()
  return copy(currentVersions().sort((a, b) => a.name.localeCompare(b.name)))
}

export async function getDocumentType(id: string, version?: number): Promise<DocumentType> {
  await delay()
  const type =
    version === undefined
      ? currentVersions().find((t) => t.id === id)
      : db.documentTypes.find((t) => t.id === id && t.version === version)
  if (!type) throw new Error(`Document type not found: ${id}${version === undefined ? '' : ` v${version}`}`)
  return copy(type)
}

export async function createDocumentType(input: CreateDocumentTypeInput): Promise<DocumentType> {
  await delay()
  assertTypeShape(input)
  const type: DocumentType = {
    ...copy(input),
    id: `type-${crypto.randomUUID().slice(0, 8)}`,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
  db.documentTypes.push(type)
  return copy(type)
}

/** Pushes a new version; the previous one stays readable. */
export async function updateDocumentType(id: string, patch: UpdateDocumentTypeInput): Promise<DocumentType> {
  await delay()
  const current = findCurrentType(id)
  const next: DocumentType = {
    ...copy(current),
    ...copy(patch),
    id,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  }
  assertTypeShape(next)
  db.documentTypes.push(next)
  return copy(next)
}

export async function listTemplates(): Promise<DocumentTemplate[]> {
  await delay()
  return copy([...DOCUMENT_TEMPLATES])
}

// ---------- documents ----------
export async function listDocuments(params: ListDocumentsParams = {}): Promise<Document[]> {
  await delay()
  const q = params.search?.trim().toLowerCase()
  const group = params.group
  const result = db.documents.filter((doc) => {
    if (params.typeId && doc.typeId !== params.typeId) return false
    if (params.status && doc.status !== params.status) return false
    if (group) {
      const value = doc.values[group.fieldId]
      const text = value ? scalarText(value) : null
      if (text === null || normalize(text) !== normalize(group.value)) return false
    }
    if (!q) return true
    if (doc.file.name.toLowerCase().includes(q)) return true
    return Object.values(doc.values).some(
      (value) => SEARCHABLE_TYPES.includes(value.type) && (scalarText(value) ?? '').toLowerCase().includes(q),
    )
  })
  result.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  return copy(result)
}

export async function getDocument(id: string): Promise<Document> {
  await delay()
  return copy(findDocument(id))
}

// ---------- pages ----------
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isBBox = (v: unknown): v is BBox =>
  isRecord(v) && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.w === 'number' && typeof v.h === 'number'

const isToken = (v: unknown): v is Token =>
  isRecord(v) && typeof v.id === 'string' && typeof v.text === 'string' && isBBox(v.bbox)

const isPage = (v: unknown): v is DocumentPage =>
  isRecord(v) &&
  typeof v.index === 'number' &&
  typeof v.width === 'number' &&
  typeof v.height === 'number' &&
  (v.imageUrl === undefined || typeof v.imageUrl === 'string') &&
  Array.isArray(v.tokens) &&
  v.tokens.every(isToken)

function parsePages(json: unknown): DocumentPage[] {
  if (!Array.isArray(json) || !json.every(isPage)) throw new Error('Invalid page data')
  return json
}

async function loadPages(id: string): Promise<DocumentPage[]> {
  const source: PageSource | undefined = db.pages[id]
  if (!source) throw new Error(`Pages not found: ${id}`)
  if (source.kind === 'synthetic') return copy(source.pages)
  const response = await fetch(source.tokensUrl)
  if (!response.ok) throw new Error(`Could not load pages for ${id}: ${response.status}`)
  const json: unknown = await response.json()
  return parsePages(json)
}

export async function getDocumentPages(id: string): Promise<DocumentPage[]> {
  await delay()
  findDocument(id)
  return loadPages(id)
}

// ---------- editing and transitions ----------
const EDITABLE_STATUSES: string[] = ['needs_review', 'approved', 'rejected']

export async function updateDocumentValues(id: string, patch: Record<string, FieldValue>): Promise<Document> {
  await delay()
  const doc = findDocument(id)
  if (!EDITABLE_STATUSES.includes(doc.status)) throw new Error(`Document can't be edited in status ${doc.status}`)
  const type = db.documentTypes.find((t) => t.id === doc.typeId && t.version === doc.typeVersion)
  const values = { ...doc.values }
  for (const [fieldId, value] of Object.entries(copy(patch))) values[fieldId] = confirm(value)
  const problems = findValueMismatches({ ...doc, values }, type)
  if (problems.length > 0) throw new Error(`Invalid values: ${problems.join('; ')}`)
  doc.values = values
  doc.overallConfidence = overallConfidence(values)
  return copy(doc)
}

/** Empty required fields don't block approval yet (open question in spec 012). */
export async function approveDocuments(ids: string[]): Promise<Document[]> {
  await delay()
  const out: Document[] = []
  for (const id of ids) {
    const doc = findDocument(id)
    if (doc.status === 'needs_review' || doc.status === 'rejected') {
      doc.status = 'approved'
      delete doc.rejectionReason
    }
    out.push(copy(doc))
  }
  return out
}

export async function rejectDocument(id: string, reason: string): Promise<Document> {
  await delay()
  const doc = findDocument(id)
  if (!['needs_review', 'unclassified', 'approved'].includes(doc.status)) {
    throw new Error(`Document can't be rejected in status ${doc.status}`)
  }
  doc.status = 'rejected'
  doc.rejectionReason = reason
  return copy(doc)
}

function applyExtraction(doc: Document, type: DocumentType, classificationConfidence: number): void {
  const values = fakeExtractFields(doc.id, type.fields)
  doc.typeId = type.id
  doc.typeVersion = type.version
  doc.classification = { confidence: classificationConfidence }
  doc.values = values
  doc.overallConfidence = overallConfidence(values)
  doc.status = 'needs_review'
  delete doc.rejectionReason
  delete doc.errorMessage
}

/**
 * Sets the new type at once with status processing (returned), then re-extracts with the
 * current version of that type on a timer: processing -> needs_review.
 */
export async function reassignDocumentType(id: string, typeId: string): Promise<Document> {
  await delay()
  const doc = findDocument(id)
  if (doc.status === 'uploaded' || doc.status === 'processing' || doc.status === 'exported') {
    throw new Error(`Document type can't be changed in status ${doc.status}`)
  }
  const type = findCurrentType(typeId)
  doc.status = 'processing'
  doc.typeId = type.id
  doc.typeVersion = type.version
  const result = copy(doc)
  void later(randomBetween(1500, 2500)).then(() => {
    const current = db.documents.find((d) => d.id === id)
    if (current) applyExtraction(current, type, 1)
  })
  return result
}

// ---------- upload ----------
const FILE_TYPE_BY_EXTENSION: Record<string, FileType | undefined> = {
  pdf: 'pdf',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
}

/** File name keywords the fake classifier recognizes, by type name. */
const CLASSIFIER_KEYWORDS: { typeName: string; keywords: string[] }[] = [
  { typeName: 'Invoice', keywords: ['invoice', 'faktura', 'fv'] },
  { typeName: 'Receipt', keywords: ['receipt', 'paragon'] },
  { typeName: 'Contract', keywords: ['contract', 'umowa', 'agreement'] },
]

const nextDocumentNumber = () =>
  Math.max(0, ...db.documents.map((d) => Number(d.id.replace(/^doc-/, '')) || 0)) + 1

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

/** uploaded -> processing -> needs_review | unclassified, mutating the document in db. */
async function runPipeline(id: string): Promise<void> {
  await later(randomBetween(1000, 2000))
  const processing = db.documents.find((d) => d.id === id)
  if (!processing) return
  processing.status = 'processing'
  await later(randomBetween(2000, 3000))
  const doc = db.documents.find((d) => d.id === id)
  if (!doc) return
  const name = doc.file.name.toLowerCase()
  const match = CLASSIFIER_KEYWORDS.find((c) => c.keywords.some((k) => name.includes(k)))
  const type = match && currentVersions().find((t) => t.name === match.typeName)
  if (type) {
    applyExtraction(doc, type, Math.round(randomBetween(0.85, 0.97) * 100) / 100)
  } else {
    doc.status = 'unclassified'
    doc.classification = { confidence: 0.3 }
  }
}

/** Returns the new document at once (status uploaded); its status then advances on timers. */
export async function uploadDocument(file: File): Promise<Document> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fileType = FILE_TYPE_BY_EXTENSION[extension]
  if (!fileType) throw new Error(`Unsupported file type: ${file.name}`)
  const id = `doc-${String(nextDocumentNumber()).padStart(3, '0')}`
  const doc: Document = {
    id,
    file: { name: file.name, type: fileType, pageCount: 1, url: URL.createObjectURL(file) },
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
    typeId: null,
    typeVersion: null,
    classification: null,
    values: {},
    overallConfidence: 0,
  }
  db.documents.push(doc)
  db.pages[id] = { kind: 'synthetic', pages: [{ index: 0, width: 595, height: 842, tokens: [] }] }
  void runPipeline(id)
  await delay()
  return copy(doc)
}

// ---------- type builder helpers ----------
export async function proposeFields(documentId: string): Promise<FieldDef[]> {
  await delay()
  findDocument(documentId)
  return proposeFieldsFromPages(documentId, await loadPages(documentId))
}

/** Saves nothing. Reuses the document's own value for a field when its type matches. */
export async function testExtract(input: TestExtractInput): Promise<Record<string, FieldValue>> {
  await delay()
  const doc = findDocument(input.documentId)
  const fake = fakeExtractFields(doc.id, input.fields)
  const out: Record<string, FieldValue> = {}
  for (const field of input.fields) {
    const existing = doc.values[field.id]
    out[field.id] = copy(existing && existing.type === field.type ? existing : fake[field.id])
  }
  return out
}

/** Examples are guidance for the AI, not schema: the current version changes in place, no new version. */
export async function addFieldExample(typeId: string, fieldId: string, example: FieldExample): Promise<DocumentType> {
  await delay()
  const type = findCurrentType(typeId)
  const field = type.fields.find((f) => f.id === fieldId)
  if (!field) throw new Error(`Field not found: ${fieldId}`)
  field.examples.push(copy(example))
  return copy(type)
}

export async function listGroupValues(typeId: string, fieldId: string): Promise<GroupValue[]> {
  await delay()
  const field = findCurrentType(typeId).fields.find((f) => f.id === fieldId)
  if (!field) throw new Error(`Field not found: ${fieldId}`)
  if (!field.groupable) throw new Error(`Field is not groupable: ${field.key}`)
  const groups = new Map<string, GroupValue>()
  for (const doc of db.documents) {
    if (doc.typeId !== typeId) continue
    const value = doc.values[fieldId]
    const text = value ? scalarText(value) : null
    if (text === null) continue
    const key = normalize(text)
    const group = groups.get(key)
    if (!group) {
      groups.set(key, { value: text, count: 1, lastDocumentAt: doc.uploadedAt })
    } else {
      group.count += 1
      if (doc.uploadedAt > group.lastDocumentAt) group.lastDocumentAt = doc.uploadedAt
    }
  }
  return copy([...groups.values()].sort((a, b) => b.count - a.count))
}

// ---------- export ----------
export async function listExportJobs(): Promise<ExportJob[]> {
  await delay()
  return copy([...db.exportJobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export async function createExportJob(input: CreateExportJobInput): Promise<ExportJob> {
  await delay()
  findCurrentType(input.typeId)
  const docs = input.documentIds.map(findDocument)
  const wrong = docs.find((d) => d.typeId !== input.typeId)
  if (wrong) throw new Error(`Document ${wrong.id} is not of type ${input.typeId}`)
  const job: ExportJob = {
    id: `exp_${String(db.exportJobs.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    format: input.format,
    typeId: input.typeId,
    documentIds: [...input.documentIds],
    destination: input.destination,
    recipient: input.recipient,
    status: 'completed',
  }
  db.exportJobs.push(job)
  for (const doc of docs) {
    if (doc.status === 'approved') doc.status = 'exported'
  }
  return copy(job)
}

// ---------- company & team ----------
export async function getCompany(): Promise<Company> {
  await delay()
  return copy(db.company)
}

export async function updateCompany(patch: Partial<Company>): Promise<Company> {
  await delay()
  Object.assign(db.company, patch)
  return copy(db.company)
}

export async function listTeam(): Promise<TeamMember[]> {
  await delay()
  return copy(db.team)
}
