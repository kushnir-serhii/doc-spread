import type { SupabaseClient } from '@supabase/supabase-js'
import { createClaudeClient } from './claude.js'
import { downloadDocument, failOn, setDocumentError } from './db.js'
import { classifyAndExtract, type TypeChoice } from './extract-core.js'
import type { Token } from './page-types.js'
import { servePipeline, type PipelineContext } from './pipeline-http.js'
import { documentIdOf, PermanentError, type WorkResult } from './queue.js'

/** The company's types, each with its latest version. */
const loadTypes = async (supabase: SupabaseClient, companyId: string): Promise<TypeChoice[]> => {
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

const processDocument = async ({ env, supabase }: PipelineContext, documentId: string): Promise<WorkResult> => {
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, company_id, file_type, storage_path, status')
    .eq('id', documentId)
    .maybeSingle()
  failOn('document lookup', error)
  if (!doc) return 'orphan'
  if (doc.status === 'error') return 'done' // a failed document stays failed; a redelivered message must not revive it
  const companyId = String(doc.company_id)
  const claude = createClaudeClient(env.anthropicApiKey)

  const { data: pageRows, error: pagesError } = await supabase
    .from('document_pages')
    .select('page_index, tokens')
    .eq('document_id', documentId)
    .order('page_index', { ascending: true })
  failOn('load pages', pagesError)
  const pages = (pageRows ?? []).map((row) => ({ index: Number(row.page_index), tokens: Array.isArray(row.tokens) ? (row.tokens as Token[]) : [] })) // our own OCR output

  const types = await loadTypes(supabase, companyId)
  const fileKind = doc.file_type === 'png' ? 'png' : doc.file_type === 'jpg' ? 'jpg' : 'pdf'
  const { result, costUsd } = await classifyAndExtract({
    documentId,
    pages,
    types,
    claude,
    models: { classify: env.modelClassify, extract: env.modelExtract },
    minConfidence: env.classifyMinConfidence,
    companyCurrency: async () => {
      const { data: company, error: companyError } = await supabase.from('companies').select('default_currency').eq('id', companyId).single()
      failOn('load company', companyError)
      return company?.default_currency
    },
    file: async () => ({
      kind: fileKind,
      base64: (await downloadDocument(supabase, env.documentsBucket, String(doc.storage_path))).toString('base64'),
    }),
  })

  if (result.outcome === 'unclassified') {
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'unclassified', classification_confidence: result.classificationConfidence, type_id: null, type_version: null })
      .eq('id', documentId)
    failOn('set unclassified', updateError)
    console.log(JSON.stringify({ event: 'extract_done', documentId, outcome: 'unclassified' }))
    return 'done'
  }
  if (result.outcome === 'refused') {
    await setDocumentError(supabase, documentId, 'refused')
    console.warn(JSON.stringify({ event: 'extract_refused', documentId }))
    return 'done'
  }

  const { error: saveError } = await supabase
    .from('documents')
    .update({
      status: 'needs_review',
      type_id: result.type.id,
      type_version: result.type.version,
      classification_confidence: result.classificationConfidence,
      values: result.values,
      overall_confidence: result.overallConfidence,
      error_message: null,
    })
    .eq('id', documentId)
  failOn('save values', saveError)
  console.log(
    JSON.stringify({
      event: 'extract_done',
      documentId,
      outcome: 'needs_review',
      fields: result.fieldCount,
      assumedCurrencies: result.assumedCurrencies,
      totalCostUsd: Math.round(costUsd * 1e6) / 1e6,
    }),
  )
  return 'done'
}

/** POST /api/pipeline/extract: drains the `extract` queue (see apps/web/api/pipeline/extract.ts). */
export const handleExtract = (request: Request): Promise<Response> =>
  servePipeline(request, 'extract', {
    work: async (ctx, message) => {
      const documentId = documentIdOf(message.message)
      try {
        return await processDocument(ctx, documentId)
      } catch (failure) {
        if (!(failure instanceof PermanentError)) throw failure
        // The document cannot be extracted (bad request, cut-off or invalid answer): mark it and consume the message.
        await setDocumentError(ctx.supabase, documentId, failure.message)
        console.warn(JSON.stringify({ event: 'extract_failed_permanently', documentId, reason: failure.message }))
        return 'done'
      }
    },
    onGiveUp: ({ supabase }, message) => setDocumentError(supabase, documentIdOf(message.message), 'processing failed'),
  })
