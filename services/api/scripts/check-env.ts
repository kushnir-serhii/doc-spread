// Startup check (spec 022, slice 3): a missing variable is named in the error and the log, and no secret
// value ever reaches a log line.
import { loadEnv } from '../src/env.ts'
import { reportScan } from './scan-logs.ts'

// Fake values shaped like the real ones, so the log scan has something to find if the code leaked them.
const complete: Record<string, string> = {
  SUPABASE_URL: 'http://127.0.0.1:1',
  SUPABASE_JWKS_URL: 'http://127.0.0.1:1/auth/v1/.well-known/jwks.json',
  SUPABASE_SECRET_KEY: 'sb_secret_FAKEFAKEFAKEFAKEFAKE',
  STORAGE_DOCUMENTS_BUCKET: 'documents',
  UPLOAD_MAX_BYTES: '1024',
}

let failed = 0
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
  if (!ok) failed += 1
}

for (const name of Object.keys(complete)) {
  const source = { ...complete }
  delete source[name]
  const message = (() => {
    try {
      loadEnv(source)
      return ''
    } catch (error) {
      return error instanceof Error ? error.message : ''
    }
  })()
  check(`loadEnv names missing ${name}`, message.includes(name))
}
check('complete env loads', loadEnv(complete).uploadMaxBytes === 1024)
check('a non-numeric UPLOAD_MAX_BYTES is rejected', (() => {
  try {
    loadEnv({ ...complete, UPLOAD_MAX_BYTES: 'lots' })
    return false
  } catch (error) {
    return error instanceof Error && error.message.includes('UPLOAD_MAX_BYTES')
  }
})())

// Through the router: each missing variable gives a 500 whose log line names it, and the logs hold no secret.
const { handle } = await import('../src/handler.js')
const logged: string[] = []
const originalError = console.error
console.error = (...args: unknown[]) => {
  logged.push(args.map(String).join(' '))
}
const saved = { ...process.env }
const names = Object.keys(complete)
for (const name of names) {
  for (const other of names) process.env[other] = complete[other]
  delete process.env[name]
  const response = await handle(
    new Request('http://localhost/api/uploads', {
      method: 'POST',
      headers: { authorization: 'Bearer eyJfake.fake.fake' },
      body: '{}',
    }),
  )
  const body = await response.text()
  check(`router returns 500 for missing ${name} without echoing it`, response.status === 500 && !body.includes(name))
  check(`router logs the name ${name}`, logged.some((line) => line.includes(`Missing env variable ${name}`)))
}
// With everything set, a bad token is a 401 and logs nothing.
Object.assign(process.env, complete)
const before = logged.length
const unauthorized = await handle(
  new Request('http://localhost/api/uploads', { method: 'POST', headers: { authorization: 'Bearer eyJfake.fake.fake' }, body: '{}' }),
)
check('a bad token returns 401', unauthorized.status === 401)
check('a bad token writes no log line', logged.length === before)
console.error = originalError
for (const name of names) if (saved[name] === undefined) delete process.env[name]
else process.env[name] = saved[name]

console.log(`captured ${logged.length} log lines`)
check('log scan finds no secret pattern', reportScan(logged) === 0)
check('no fake secret value appears in the logs', !logged.some((line) => line.includes('FAKEFAKE')))
process.exit(failed === 0 ? 0 : 1)
