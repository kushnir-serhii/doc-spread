import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { REGION, STAGES, type StageName } from '../lib/stage-config.ts'

/** Copies the two secrets from services/api/.env.local to SSM. Values are never printed. */
const ENV_FILE = fileURLToPath(new URL('../../services/api/.env.local', import.meta.url))

const SECRETS = [
  { envName: 'SUPABASE_SECRET_KEY', parameter: 'supabase-secret-key' },
  { envName: 'ANTHROPIC_API_KEY', parameter: 'anthropic-api-key' },
] as const

function readStage(): StageName {
  const index = process.argv.indexOf('--stage')
  const value = index === -1 ? undefined : process.argv[index + 1]
  if (value !== 'dev' && value !== 'prod') {
    console.error('Usage: pnpm put-secrets --stage dev|prod')
    process.exit(1)
  }
  return value
}

function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const equals = line.indexOf('=')
    if (equals === -1) continue
    const key = line.slice(0, equals).trim()
    let value = line.slice(equals + 1).trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
    } else {
      // Unquoted values may carry a trailing comment: "sk-... # note".
      value = value.replace(/\s+#.*$/, '')
    }
    values.set(key, value)
  }
  return values
}

async function main() {
  const stage = readStage()
  if (!(stage in STAGES)) throw new Error(`unknown stage ${stage}`)

  let text: string
  try {
    text = readFileSync(ENV_FILE, 'utf8')
  } catch {
    console.error('Cannot read services/api/.env.local. Create it from services/api/.env.example first.')
    process.exit(1)
  }
  const env = parseEnv(text)
  const missing = SECRETS.filter(({ envName }) => (env.get(envName) ?? '') === '').map(({ envName }) => envName)
  if (missing.length > 0) {
    console.error(`Missing or empty in services/api/.env.local: ${missing.join(', ')}`)
    process.exit(1)
  }

  const client = new SSMClient({ region: REGION })
  for (const { envName, parameter } of SECRETS) {
    const name = `/docspread/${stage}/${parameter}`
    await client.send(
      new PutParameterCommand({ Name: name, Value: env.get(envName) ?? '', Type: 'SecureString', Overwrite: true }),
    )
    console.log(`${name}: saved`)
  }
}

main().catch((error: unknown) => {
  // Only the error name and message: SDK errors do not carry the parameter value.
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : 'put-secrets failed')
  process.exit(1)
})
