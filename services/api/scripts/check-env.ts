// Startup check (spec 020, slice 5, criterion 4): removing any required variable must fail and name it.
import { loadEnv } from '../src/env.ts'

const complete: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_JWKS_URL: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
  S3_DOCUMENTS_BUCKET: 'bucket',
  UPLOAD_MAX_BYTES: '1024',
  SUPABASE_SECRET_KEY: 'not-a-real-secret',
}
const fakeSecret = () => Promise.resolve('not-a-real-secret')

let failed = 0
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
  if (!ok) failed += 1
}

for (const name of Object.keys(complete)) {
  const source = { ...complete }
  delete source[name]
  const message = await loadEnv(source, fakeSecret).then(
    () => '',
    (error: unknown) => (error instanceof Error ? error.message : ''),
  )
  check(`missing ${name} is named in the error`, message.includes(name))
}
check('complete env loads', (await loadEnv(complete, fakeSecret)).uploadMaxBytes === 1024)

const withoutSecret = { ...complete }
delete withoutSecret.SUPABASE_SECRET_KEY
const fromSsm = await loadEnv({ ...withoutSecret, SSM_SUPABASE_SECRET_KEY_PARAM: '/p' }, fakeSecret)
check('secret read through the SSM parameter name', fromSsm.supabaseSecretKey === 'not-a-real-secret')
process.exit(failed === 0 ? 0 : 1)
