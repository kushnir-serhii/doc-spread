import type { GlossaryKey } from './glossary'

/** System context in C4 style, drawn as a flowchart (Mermaid's C4Context is experimental). */
export const CONTEXT_DIAGRAM = `flowchart TB
  user["User (company member): person"]

  subgraph docspread["DocSpread (the system)"]
    web["Web app: React SPA, apps/web"]
    api["API and pipeline: Vercel Functions, services/api"]
  end

  vercel["Vercel: hosting and functions"]
  supabase["Supabase: Auth, Postgres, Storage, queues, cron"]
  anthropic["Anthropic: Claude API"]
  github["GitHub: code, pull requests, Actions"]

  user -->|"uploads files, reviews, exports (browser)"| web
  web -->|"HTTPS /api requests"| api
  web -->|"sign in, signed file upload"| supabase
  api -->|"verify token, SQL, signed URLs, queues"| supabase
  supabase -->|"pg_cron + pg_net: POST to pipeline functions"| api
  api -->|"HTTPS: classify, extract"| anthropic
  vercel -->|"serves the static SPA"| web
  vercel -->|"runs the functions (region fra1)"| api
  github -->|"Git integration: deploys on push"| vercel
  github -->|"Actions migrate.yml: supabase db push"| supabase
`

/** Mermaid node id → glossary entry. */
export const CONTEXT_ITEMS: Record<string, GlossaryKey> = {
  user: 'endUser',
  web: 'webApp',
  api: 'servicesApi',
  vercel: 'vercelPlatform',
  supabase: 'supabasePlatform',
  anthropic: 'anthropicPlatform',
  github: 'githubPlatform',
}
