import Anthropic from '@anthropic-ai/sdk'
import { PermanentError } from './sqs.ts'

/** USD per million tokens. The one place prices live; update it when the models or their prices change. */
export const PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-opus-5-5': { input: 4, output: 20 },
}
const CACHE_WRITE_MULTIPLIER = 1.25
const CACHE_READ_MULTIPLIER = 0.1

export type CallStep = 'classify' | 'extract'

export interface CallUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

/** Estimated cost of one call. A model without a known price is priced as the model that was requested (flagged). */
export const estimateCostUsd = (usage: CallUsage, ranModel: string, requestedModel: string): { costUsd: number; priceAssumed: boolean } => {
  const exact = Object.entries(PRICES_PER_MILLION).find(([name]) => ranModel.startsWith(name))
  const price = exact?.[1] ?? PRICES_PER_MILLION[requestedModel] ?? { input: 0, output: 0 }
  const costUsd =
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheWriteTokens * price.input * CACHE_WRITE_MULTIPLIER +
      usage.cacheReadTokens * price.input * CACHE_READ_MULTIPLIER) /
    1e6
  return { costUsd, priceAssumed: exact === undefined }
}

export interface CallResult {
  /** The structured answer, parsed; undefined on a refusal. */
  answer: unknown
  refused: boolean
  costUsd: number
}

/** Logs one line per call: ids, token counts and cost only. Never document text, values or keys. */
const logCall = (documentId: string, step: CallStep, requestedModel: string, ranModel: string, usage: CallUsage, stopReason: string | null) => {
  const { costUsd, priceAssumed } = estimateCostUsd(usage, ranModel, requestedModel)
  console.log(
    JSON.stringify({
      event: 'claude_call',
      documentId,
      step,
      requestedModel,
      model: ranModel,
      stopReason,
      ...usage,
      costUsd: Math.round(costUsd * 1e6) / 1e6,
      ...(priceAssumed ? { priceAssumed: true } : {}),
    }),
  )
  return costUsd
}

/** 400/413/422 mean this request can never work (permanent); 429, 5xx and network problems are worth a retry. */
const rethrow = (error: unknown): never => {
  if (error instanceof Anthropic.APIError && error.status !== undefined && [400, 413, 422].includes(error.status)) {
    throw new PermanentError(`request rejected by the model API (${error.status})`)
  }
  throw error
}

const parseAnswer = (content: { type: string; text?: string }[]): unknown => {
  const text = content.find((block) => block.type === 'text')?.text
  if (text === undefined) throw new PermanentError('model returned no answer')
  try {
    return JSON.parse(text)
  } catch {
    throw new PermanentError('model answer was not valid JSON')
  }
}

export interface ClaudeClient {
  classify: (input: { documentId: string; model: string; prompt: string; schema: Record<string, unknown>; system: string }) => Promise<CallResult>
  extract: (input: {
    documentId: string
    model: string
    system: string
    schema: Record<string, unknown>
    file: { kind: 'pdf' | 'jpg' | 'png'; base64: string }
    tokenList: string
  }) => Promise<CallResult>
}

export const createClaudeClient = (apiKey: string): ClaudeClient => {
  // The SDK retries 429 and 5xx twice by default; what still fails after that is rethrown for SQS to retry.
  const client = new Anthropic({ apiKey })
  return {
    classify: async ({ documentId, model, prompt, schema, system }) => {
      try {
        const response = await client.messages.create({
          model,
          max_tokens: 2000,
          system,
          output_config: { effort: 'low', format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content: prompt }],
        })
        const usage: CallUsage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        }
        const costUsd = logCall(documentId, 'classify', model, response.model, usage, response.stop_reason)
        // Haiku has no server-side fallback: a refusal leaves the document unclassified.
        if (response.stop_reason === 'refusal') return { answer: undefined, refused: true, costUsd }
        if (response.stop_reason === 'max_tokens') throw new PermanentError('classification answer was cut off')
        return { answer: parseAnswer(response.content), refused: false, costUsd }
      } catch (error) {
        return rethrow(error)
      }
    },
    extract: async ({ documentId, model, system, schema, file, tokenList }) => {
      try {
        const source =
          file.kind === 'pdf'
            ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.base64 } } as const)
            : ({ type: 'image', source: { type: 'base64', media_type: file.kind === 'png' ? 'image/png' : 'image/jpeg', data: file.base64 } } as const)
        const response = await client.beta.messages.create({
          model,
          max_tokens: 20000,
          system,
          betas: ['server-side-fallback-2026-07-01'],
          // If the model declines, the API re-runs the same request on the fallback model inside this call.
          fallbacks: 'default',
          output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content: [source, { type: 'text', text: `OCR tokens (id|page|text):\n${tokenList}` }] }],
        })
        const usage: CallUsage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        }
        const costUsd = logCall(documentId, 'extract', model, response.model, usage, response.stop_reason)
        if (response.stop_reason === 'refusal') return { answer: undefined, refused: true, costUsd }
        if (response.stop_reason === 'max_tokens') throw new PermanentError('extraction answer was cut off')
        return { answer: parseAnswer(response.content), refused: false, costUsd }
      } catch (error) {
        return rethrow(error)
      }
    },
  }
}
