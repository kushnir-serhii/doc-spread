// Scans log lines for secret-looking text. Prints only counts, never the lines.
// As a CLI it reads lines from stdin, e.g. `vercel logs <deployment-url> | pnpm scan-logs`.
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

export const SECRET_PATTERNS: Record<string, RegExp> = {
  'sb_secret_': /sb_secret_/,
  'sk-ant-': /sk-ant-/,
  'JWT (eyJ)': /eyJ/,
  'Bearer ': /Bearer /,
}

/** Number of lines that match each secret pattern. */
export const scanLines = (lines: readonly string[]): Record<string, number> =>
  Object.fromEntries(
    Object.entries(SECRET_PATTERNS).map(([label, pattern]) => [label, lines.filter((line) => pattern.test(line)).length]),
  )

/** Prints one PASS/FAIL line per pattern and returns the total number of matching lines. */
export const reportScan = (lines: readonly string[]): number => {
  console.log(`log lines scanned: ${lines.length}`)
  let total = 0
  for (const [label, count] of Object.entries(scanLines(lines))) {
    total += count
    console.log(`${count === 0 ? 'PASS' : 'FAIL'} lines containing ${label}: ${count}`)
  }
  return total
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lines: string[] = []
  for await (const line of createInterface({ input: process.stdin })) lines.push(line)
  const total = reportScan(lines)
  if (lines.length === 0) console.log('FAIL no log lines to scan')
  process.exit(total === 0 && lines.length > 0 ? 0 : 1)
}
