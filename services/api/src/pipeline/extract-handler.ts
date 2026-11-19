import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClaudeClient } from './claude.ts'
import { createAdminClient, failOn, setDocumentError } from './db.ts'
import { FALLBACK_CURRENCY, mapExtraction, type MapContext } from './extract-map.ts'
import { buildExtractionSchema, CLASSIFY_SCHEMA, CLASSIFY_SYSTEM, EXTRACT_SYSTEM, planExtractionCalls } from './extract-schema.ts'
import { parseFieldDefs } from './field-types.ts'
import type { Token } from './page-types.ts'
import { loadExtractEnv } from './pipeline-env.ts'
import { PermanentError, runBatch, type SqsBatchResponse, type SqsEvent, type SqsRecord } from './sqs.ts'

// Top-level await: a missing variable fails the cold start and the error names it.
const env = await loadExtractEnv()
const supabase: SupabaseClient = createAdminClient(env.supabaseUrl, env.supabaseSecretKey)
const s3 = new S3Client({})
const claude = createClaudeClient(env.anthropicApiKey ?? '')
const modelClassify = env.modelClassify ?? ''
const modelExtract = env.modelExtract ?? ''
const minConfidence = env.classifyMinConfidence ?? 1

/** How much of the first page's text the classifier sees. */
const CLASSIFY_TEXT_CHARS = 6000

interface TypeChoice {
  id: string
  name: string
  description: string
  version: number
  fields: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const parseMessage = (record: SqsRecord): { documentId: string; companyId: string } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(record.body)
  } catch {
    throw new PermanentError('message is not JSON')
  }
  if (!isObject(parsed) || typeof parsed.documentId !== 'string' || typeof parsed.companyId !== 'string') {
    throw new PermanentError('message has no document')
  }
  return { documentId: parsed.documentId, companyId: parsed.companyId }
}

/** The company's types, each with its latest version. */
const loadTypes = async (companyId: string): Promise<TypeChoice[]> => {
  const { data: types, error } = await supabase.from('document_types').select('id, name, description').eq('company_id', companyId)
  failOn('load types', error)
  const { data: versions, error: versionsError } = await supabase
    .from('document_type_versions')
    .select('type_id, version, fields')
    .eq('company_id', companyId)
  failOn('load type versions', versionsError)
  const latest = new Map<string, { version: number; fields: unknown }>()
  for (const row of versions ?? []) {
    const known = latest.get(String(row.type_id))
    if (!known || Number(row.version) > known.version) latest.set(String(row.type_id), { version: Number(row.version), fields: row.fields })
  }
  return (types ?? []).flatMap((type) => {
    const version = latest.get(String(type.id))
    return version ? [{ id: String(type.id), name: String(type.name), description: String(type.description ?? ''), ...version }] : []
  })
}

const processDocument = async (documentId: string, companyId: string): Promise<void> => {
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, file_type, storage_path, status')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .maybeSingle()
  failOn('document lookup', error)
  if (!doc) return
  if (doc.status === 'error') return // a failed document stays failed; a redelivered message must not revive it

  const { data: pageRows, error: pagesError } = await supabase
    .from('document_pages')
    .select('page_index, tokens')
    .eq('document_id', documentId)
    .order('page_index', { ascending: true })
  failOn('load pages', pagesError)
  const pages = (pageRows ?? []).map((row) => ({ index: Number(row.page_index), tokens: Array.isArray(row.tokens) ? (row.tokens as Token[]) : [] })) // our own OCR output
  const firstPageText = (pages[0]?.tokens ?? []).map((token) => token.text).join(' ').slice(0, CLASSIFY_TEXT_CHARS)

  const types = await loadTypes(companyId)
  const unclassified = async (confidence: number | null): Promise<void> => {
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'unclassified', classification_confidence: confidence, type_id: null, type_version: null })
      .eq('id', documentId)
    failOn('set unclassified', updateError)
    console.log(JSON.stringify({ event: 'extract_done', documentId, outcome: 'unclassified' }))
  }
  if (types.length === 0 || firstPageText.trim() === '') return unclassified(null)

  // 1. Classify (Haiku, effort low).
  const typeList = types.map((type) => `- id: ${type.id}\n  name: ${type.name}\n  description: ${type.description}`).join('\n')
  const classification = await claude.classify({
    documentId,
    model: modelClassify,
    system: CLASSIFY_SYSTEM,
    schema: CLASSIFY_SCHEMA,
    prompt: `Document types:\n${typeList}\n\nText of the first page:\n${firstPageText}`,
  })
  const answer = isObject(classification.answer) ? classification.answer : {}
  const chosen = types.find((type) => type.id === answer.typeId)
  const classConfidence = typeof answer.confidence === 'number' && Number.isFinite(answer.confidence) ? Math.min(1, Math.max(0, answer.confidence)) : null
  if (classification.refused || !chosen || classConfidence === null || classConfidence < minConfidence) {
    return unclassified(classification.refused ? null : classConfidence)
  }

  // 2. Extract (Opus, effort medium, server-side fallback).
  const fields = parseFieldDefs(chosen.fields)
  if (fields.length === 0) throw new PermanentError('the document type has no fields')
  const { data: company, error: companyError } = await supabase.from('companies').select('default_currency').eq('id', companyId).single()
  failOn('load company', companyError)
  const companyCurrency = company?.default_currency
  const tokenMap: MapContext['tokens'] = new Map()
  const lines: string[] = []
  for (const page of pages) {
    for (const token of page.tokens) {
      tokenMap.set(token.id, { page: page.index, token })
      lines.push(`${token.id}|${page.index}|${token.text}`)
    }
  }
  const object = await s3.send(new GetObjectCommand({ Bucket: env.documentsBucket, Key: String(doc.storage_path) }))
  if (!object.Body) throw new PermanentError('empty object')
  const fileKind = doc.file_type === 'png' ? 'png' : doc.file_type === 'jpg' ? 'jpg' : 'pdf'
  const base64 = Buffer.from(await object.Body.transformToByteArray()).toString('base64')

  const tokenList = lines.join('\n')
  const answers: Record<string, unknown> = {}
  let extractionCost = 0
  for (const chunk of planExtractionCalls(fields)) {
    const extraction = await claude.extract({
      documentId,
      model: modelExtract,
      system: EXTRACT_SYSTEM,
      schema: buildExtractionSchema(chunk),
      file: { kind: fileKind, base64 },
      tokenList,
    })
    extractionCost += extraction.costUsd
    if (extraction.refused) {
      await setDocumentError(supabase, documentId, 'refused')
      console.warn(JSON.stringify({ event: 'extract_refused', documentId }))
      return
    }
    if (isObject(extraction.answer)) Object.assign(answers, extraction.answer)
  }
  const context: MapContext = {
    tokens: tokenMap,
    companyCurrency: typeof companyCurrency === 'string' && companyCurrency !== '' ? companyCurrency : FALLBACK_CURRENCY,
    stats: { assumedCurrencies: 0 },
  }
  const mapped = mapExtraction(fields, answers, context)

  const { error: saveError } = await supabase
    .from('documents')
    .update({
      status: 'needs_review',
      type_id: chosen.id,
      type_version: chosen.version,
      classification_confidence: classConfidence,
      values: mapped.values,
      overall_confidence: mapped.overallConfidence,
      error_message: null,
    })
    .eq('id', documentId)
  failOn('save values', saveError)
  console.log(
    JSON.stringify({
      event: 'extract_done',
      documentId,
      outcome: 'needs_review',
      fields: fields.length,
      assumedCurrencies: context.stats.assumedCurrencies,
      totalCostUsd: Math.round((classification.costUsd + extractionCost) * 1e6) / 1e6,
    }),
  )
}

export const handler = async (event: SqsEvent): Promise<SqsBatchResponse> =>
  runBatch(
    event,
    async (record) => {
      const { documentId, companyId } = parseMessage(record)
      try {
        await processDocument(documentId, companyId)
      } catch (failure) {
        if (!(failure instanceof PermanentError)) throw failure
        // The document cannot be extracted (bad request, cut-off or invalid answer): mark it and consume the message.
        await setDocumentError(supabase, documentId, failure.message)
        console.warn(JSON.stringify({ event: 'extract_failed_permanently', documentId, reason: failure.message }))
      }
    },
    // Last receive before the dead-letter queue: show the failure on the document.
    async (record) => {
      await setDocumentError(supabase, parseMessage(record).documentId, 'processing failed')
    },
  )
