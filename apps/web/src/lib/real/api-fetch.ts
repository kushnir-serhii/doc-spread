import { readBackendEnv } from '@/lib/env'
import { getSupabase } from './client'

/** A failed call to our API: the HTTP status and the `error` code the API sent (empty when the body had none). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export interface ApiFetchInit {
  method?: string
  /** Sent as JSON. */
  body?: unknown
}

const errorFields = (body: unknown): { code: string; message: string } => {
  if (typeof body === 'object' && body !== null) {
    const code = 'error' in body && typeof body.error === 'string' ? body.error : ''
    const message = 'message' in body && typeof body.message === 'string' ? body.message : ''
    return { code, message }
  }
  return { code: '', message: '' }
}

/**
 * Calls `VITE_API_BASE_URL + path` with the session's access token (when there is a session), JSON in and out.
 * Resolves with the parsed body (`unknown`: the caller narrows it) or throws an `ApiError`.
 */
export const apiFetch = async (path: string, init: ApiFetchInit = {}): Promise<unknown> => {
  const base = readBackendEnv().VITE_API_BASE_URL.replace(/\/$/, '')
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
  }
  const response = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await response.text()
  let body: unknown = undefined
  try {
    body = text === '' ? undefined : JSON.parse(text)
  } catch {
    // not JSON (for example an HTML error page): keep `undefined`
  }
  if (!response.ok) {
    const { code, message } = errorFields(body)
    throw new ApiError(response.status, code, message || `Request failed with status ${response.status}`)
  }
  return body
}
