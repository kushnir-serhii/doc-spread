import { appendFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Local secret files that the scripts read programmatically. Values are never printed. */
export const API_ENV_FILE = fileURLToPath(new URL('../.env.local', import.meta.url))
export const WEB_ENV_FILE = fileURLToPath(new URL('../../../apps/web/.env.local', import.meta.url))

export const readEnvFile = (path: string): Record<string, string> => {
  const values: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match?.[1]) continue
    values[match[1]] = (match[2] ?? '').replace(/^(['"])(.*)\1$/, '$2')
  }
  return values
}

export const requireValue = (values: Record<string, string>, name: string, file: string): string => {
  const value = values[name]
  if (!value) throw new Error(`Missing ${name} in ${file}`)
  return value
}

export const appendEnvValues = (path: string, entries: Record<string, string>): void => {
  const current = readFileSync(path, 'utf8')
  const prefix = current.endsWith('\n') ? '' : '\n'
  appendFileSync(path, `${prefix}${Object.entries(entries).map(([k, v]) => `${k}=${v}`).join('\n')}\n`)
}
