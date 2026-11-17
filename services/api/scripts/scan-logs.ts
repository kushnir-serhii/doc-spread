// Scans the api function's recent CloudWatch log events for secret-looking text. Prints only counts.
import { execFileSync } from 'node:child_process'

const LOG_GROUP = '/aws/lambda/docspread-dev-api'
const PATTERNS: Record<string, RegExp> = {
  'sb_secret_': /sb_secret_/,
  'sk-ant-': /sk-ant-/,
  'JWT (eyJ)': /eyJ/,
  'Bearer ': /Bearer /,
}

const sinceMs = Date.now() - 3 * 60 * 60 * 1000
const raw = execFileSync(
  'aws',
  ['logs', 'filter-log-events', '--log-group-name', LOG_GROUP, '--start-time', String(sinceMs), '--region', 'eu-north-1', '--profile', 'docspread', '--output', 'json'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' },
)
const parsed: { events: { message: string }[] } = JSON.parse(raw) // AWS CLI output shape
console.log(`log events scanned: ${parsed.events.length}`)
let total = 0
for (const [label, pattern] of Object.entries(PATTERNS)) {
  const count = parsed.events.filter((event) => pattern.test(event.message)).length
  total += count
  console.log(`${count === 0 ? 'PASS' : 'FAIL'} events containing ${label}: ${count}`)
}
console.log(parsed.events.length > 0 ? 'scan covered real events' : 'FAIL no events to scan')
process.exit(total === 0 && parsed.events.length > 0 ? 0 : 1)
