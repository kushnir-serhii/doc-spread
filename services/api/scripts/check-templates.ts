// Checks that every product template (apps/web/src/lib/fields/templates.ts) is readable by the pipeline's own
// parseFieldDefs (spec 030). Exits 1 naming the template that fails.
//
//   pnpm --filter @docspread/api check-templates
//
// The web file is loaded with a runtime path (tsx compiles it and drops its type-only imports), so this package's
// typecheck does not pull the web app's `@/` aliases into its program.
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseFieldDefs } from '../src/pipeline/field-types.js'

const TEMPLATES_FILE = fileURLToPath(new URL('../../../apps/web/src/lib/fields/templates.ts', import.meta.url))

interface TemplateLike {
  id: string
  name: string
  fields: unknown
}

const { DOCUMENT_TEMPLATES } = (await import(pathToFileURL(TEMPLATES_FILE).href)) as {
  DOCUMENT_TEMPLATES: readonly TemplateLike[]
}

let failed = 0
for (const template of DOCUMENT_TEMPLATES) {
  try {
    const fields = parseFieldDefs(template.fields)
    if (fields.length === 0) throw new Error('no fields')
    console.log(`ok    ${template.name} (${fields.length} fields)`)
  } catch (error) {
    failed++
    console.error(`FAIL  ${template.name} (${template.id}): ${error instanceof Error ? error.message : String(error)}`)
  }
}
if (DOCUMENT_TEMPLATES.length === 0) {
  console.error('FAIL  no templates found')
  failed++
}
process.exit(failed === 0 ? 0 : 1)
