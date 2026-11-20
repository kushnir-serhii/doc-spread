import type { GlossaryKey } from './glossary'

/** Deployment diagram: what runs where, from the Architecture table of spec 022. */
export const DEPLOYMENT_DIAGRAM = `flowchart LR
  subgraph user["User device"]
    browser["Browser (web app)"]
  end

  subgraph vercel["Vercel project (region fra1)"]
    spa["Static SPA (rewrite to index.html)"]
    fns["Functions /api/*: API (signup, uploads, exports), pipeline/ocr, pipeline/extract"]
  end

  subgraph supa["Supabase project docspread-dev (Frankfurt)"]
    pg[("Postgres with row-level security")]
    auth["Auth (JWKS)"]
    docs[("Storage: documents, private")]
    exports[("Storage: exports, private")]
    pgmq["pgmq queues: ocr, extract"]
    cron["pg_cron (every 30 s)"]
    net["pg_net"]
    vault["Vault: pipeline_base_url, pipeline_secret"]
  end

  subgraph anth["Anthropic"]
    claude["Claude API"]
  end

  subgraph gh["GitHub"]
    repo["Repository"]
    actions["GitHub Actions: supabase db push (slice 7, planned)"]
  end

  browser -->|"HTTPS: app files"| spa
  browser -->|"HTTPS: /api/signup, /api/uploads, /api/exports (bearer token)"| fns
  browser -->|"sign in, session (publishable key)"| auth
  browser -->|"reads and edits with the session, under RLS"| pg
  browser -->|"signed upload, signed file and export links"| docs
  browser -->|"signed download"| exports
  fns -->|"verify token (JWKS)"| auth
  fns -->|"SQL"| pg
  fns -->|"signed URLs"| docs
  fns -->|"signed downloads"| exports
  fns -->|"HTTPS: classify, extract"| claude
  pg --- pgmq
  cron -->|"runs"| net
  net -->|"POST with x-pipeline-secret"| fns
  cron -.->|"read settings"| vault
  repo -->|"Vercel Git integration: deploy"| vercel
  repo --> actions
  actions -->|"migrations"| pg
`

/** Mermaid node id → glossary entry. */
export const DEPLOYMENT_ITEMS: Record<string, GlossaryKey> = {
  browser: 'browserApp',
  spa: 'vercelStaticSpa',
  fns: 'vercelFunctions',
  pg: 'supabasePostgres',
  auth: 'supabaseAuth',
  docs: 'storageDocuments',
  exports: 'storageExports',
  pgmq: 'pgmq',
  cron: 'pgCron',
  net: 'pgNet',
  vault: 'supabaseVault',
  claude: 'claudeApi',
  repo: 'githubRepo',
  actions: 'githubActionsMigrate',
}
