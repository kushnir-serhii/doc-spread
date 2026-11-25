import type { CallResult, CallStep, CallUsage, ClaudeClient } from './claude.js'
import { FALLBACK_CURRENCY, mapExtraction, type MapContext } from './extract-map.js'
import { buildExtractionSchema, CLASSIFY_SCHEMA, CLASSIFY_SYSTEM, EXTRACT_SYSTEM, planExtractionCalls } from './extract-schema.js'
import { parseFieldDefs, type StoredValue } from './field-types.js'
import type { OcrPage } from './page-types.js'
import { PermanentError } from './queue.js'

/** How much of the first page's text the classifier sees. */
const CLASSIFY_TEXT_CHARS = 6000

export interface TypeChoice {
  id: string
  name: string
  description: string
  version: number
  fields: unknown
}

/** One Claude call, as the eval reports it. */
export interface CallRecord extends CallUsage {
  step: CallStep
  requestedModel: string
  model: string
  costUsd: number
  ms: number
  stopReason: string | null
}

export type ExtractOutcome =
  /** `pickedTypeId`: the type the classifier named, kept for diagnosis even when it was unknown or below the threshold. */
  | { outcome: 'unclassified'; classificationConfidence: number | null; pickedTypeId: string | null }
  /** The extraction model declined; the type had been chosen. */
  | { outcome: 'refused'; type: TypeChoice; classificationConfidence: number }
  | {
      outcome: 'needs_review'
      type: TypeChoice
      classificationConfidence: number
      /** Keyed by field id (table cells by column id), as the handler stores them. */
      values: Record<string, StoredValue>
      overallConfidence: number
      fieldCount: number
      assumedCurrencies: number
    }

export interface ClassifyAndExtractInput {
  documentId: string
  pages: Pick<OcrPage, 'index' | 'tokens'>[]
  /** Called only once a type is chosen (the handler downloads the original from Storage). */
  file: () => Promise<{ kind: 'pdf' | 'jpg' | 'png'; base64: string }>
  types: TypeChoice[]
  /** Called only once a type is chosen; a missing or empty value falls back to FALLBACK_CURRENCY. */
  companyCurrency: () => Promise<unknown>
  claude: ClaudeClient
  models: { classify: string; extract: string }
  minConfidence: number
  /** Every call made is pushed here, also when the core ends in a refusal or throws. */
  calls?: CallRecord[]
}

export interface ClassifyAndExtractResult {
  result: ExtractOutcome
  calls: CallRecord[]
  /** Sum of the cost of all calls. */
  costUsd: number
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const record = (calls: CallRecord[], step: CallStep, result: CallResult): void => {
  calls.push({ step, requestedModel: result.requestedModel, model: result.model, ...result.usage, costUsd: result.costUsd, ms: result.ms, stopReason: result.stopReason })
}

/** The pure part of the extract step: classify the document, then extract its values. No database, no queue. */
export const classifyAndExtract = async (input: ClassifyAndExtractInput): Promise<ClassifyAndExtractResult> => {
  const { documentId, pages, types, claude, models, minConfidence } = input
  const calls = input.calls ?? []
  const done = (result: ExtractOutcome): ClassifyAndExtractResult => ({
    result,
    calls,
    costUsd: calls.reduce((sum, call) => sum + call.costUsd, 0),
  })
  const firstPageText = (pages[0]?.tokens ?? []).map((token) => token.text).join(' ').slice(0, CLASSIFY_TEXT_CHARS)
  if (types.length === 0 || firstPageText.trim() === '') return done({ outcome: 'unclassified', classificationConfidence: null, pickedTypeId: null })

  // 1. Classify (Haiku, effort low).
  const typeList = types.map((type) => `- id: ${type.id}\n  name: ${type.name}\n  description: ${type.description}`).join('\n')
  const classification = await claude.classify({
    documentId,
    model: models.classify,
    system: CLASSIFY_SYSTEM,
    schema: CLASSIFY_SCHEMA,
    prompt: `Document types:\n${typeList}\n\nText of the first page:\n${firstPageText}`,
  })
  record(calls, 'classify', classification)
  const answer = isObject(classification.answer) ? classification.answer : {}
  const chosen = types.find((type) => type.id === answer.typeId)
  const classConfidence = typeof answer.confidence === 'number' && Number.isFinite(answer.confidence) ? Math.min(1, Math.max(0, answer.confidence)) : null
  if (classification.refused || !chosen || classConfidence === null || classConfidence < minConfidence) {
    const pickedTypeId = typeof answer.typeId === 'string' && answer.typeId !== '' ? answer.typeId : null
    return done({ outcome: 'unclassified', classificationConfidence: classification.refused ? null : classConfidence, pickedTypeId })
  }

  // 2. Extract (Opus, effort medium, server-side fallback).
  const fields = parseFieldDefs(chosen.fields)
  if (fields.length === 0) throw new PermanentError('the document type has no fields')
  const companyCurrency = await input.companyCurrency()
  const tokenMap: MapContext['tokens'] = new Map()
  const lines: string[] = []
  for (const page of pages) {
    for (const token of page.tokens) {
      tokenMap.set(token.id, { page: page.index, token })
      lines.push(`${token.id}|${page.index}|${token.text}`)
    }
  }
  const file = await input.file()

  const tokenList = lines.join('\n')
  const answers: Record<string, unknown> = {}
  for (const chunk of planExtractionCalls(fields)) {
    const extraction = await claude.extract({
      documentId,
      model: models.extract,
      system: EXTRACT_SYSTEM,
      schema: buildExtractionSchema(chunk),
      file,
      tokenList,
    })
    record(calls, 'extract', extraction)
    if (extraction.refused) return done({ outcome: 'refused', type: chosen, classificationConfidence: classConfidence })
    if (isObject(extraction.answer)) Object.assign(answers, extraction.answer)
  }
  const context: MapContext = {
    tokens: tokenMap,
    companyCurrency: typeof companyCurrency === 'string' && companyCurrency !== '' ? companyCurrency : FALLBACK_CURRENCY,
    stats: { assumedCurrencies: 0 },
  }
  const mapped = mapExtraction(fields, answers, context)
  return done({
    outcome: 'needs_review',
    type: chosen,
    classificationConfidence: classConfidence,
    values: mapped.values,
    overallConfidence: mapped.overallConfidence,
    fieldCount: fields.length,
    assumedCurrencies: context.stats.assumedCurrencies,
  })
}
