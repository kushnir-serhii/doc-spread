/** Deployment diagram: what runs where, from the Architecture table of spec 022. */
export const DEPLOYMENT_DIAGRAM = `flowchart LR
  subgraph user["User device"]
    browser["Browser (web app)"]
  end

  subgraph vercel["Vercel project (region fra1)"]
    spa["Static SPA (rewrite to index.html)"]
    fns["Functions /api/*: API, pipeline/ocr, pipeline/extract"]
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
  browser -->|"HTTPS: API calls"| fns
  browser -->|"sign in"| auth
  browser -->|"signed upload"| docs
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
