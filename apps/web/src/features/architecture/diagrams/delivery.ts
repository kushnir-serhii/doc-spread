import type { GlossaryKey } from './glossary'

/** Activity diagram with swimlanes: how code reaches production (CLAUDE.md, docs/setup.md section 7, migrate.yml). */
export const DELIVERY_DIAGRAM = `flowchart TB
  subgraph dev["Developer"]
    branch["Branch per spec"]
    commits["Commits on the branch"]
    manual["vercel deploy --prod from apps/web (Claude, before a merge)"]
    owner["Owner merges the PR into main"]
    dbpush["Owner by hand: supabase db push --password"]
  end

  subgraph gh["GitHub"]
    repo["Repository"]
    pr["Pull request"]
    trigger{"Push to main changed supabase/migrations/** (or manual run)?"}
    env["Environment dev: secrets"]
    migrate["Actions migrate.yml: supabase db push via the session pooler"]
  end

  subgraph vc["Vercel"]
    preview["Preview deployment"]
    prod["Production deployment"]
    vercelenv["Vercel env: secrets"]
  end

  subgraph sb["Supabase"]
    devdb[("Project docspread-dev: Postgres")]
  end

  branch --> commits
  commits -->|"git push"| repo
  repo --> pr
  commits -.-> manual
  manual -->|"deploys"| prod
  pr -->|"Git integration builds"| preview
  pr --> owner
  owner -->|"merge to main"| repo
  repo -->|"Git integration builds main"| prod
  repo --> trigger
  trigger -->|"yes"| migrate
  env -.->|"secrets for the job"| migrate
  migrate -->|"applies new migrations"| devdb
  dbpush -->|"applies new migrations"| devdb
  vercelenv -.->|"variables at build and run"| prod
`

/** Mermaid node id → glossary entry. */
export const DELIVERY_ITEMS: Record<string, GlossaryKey> = {
  branch: 'gitBranch',
  commits: 'gitBranch',
  manual: 'vercelCliDeploy',
  owner: 'ownerMerge',
  dbpush: 'supabaseCliPush',
  repo: 'githubRepo',
  pr: 'githubPullRequest',
  trigger: 'githubActionsMigrate',
  env: 'githubEnvDev',
  migrate: 'githubActionsMigrate',
  preview: 'vercelPreview',
  prod: 'vercelProduction',
  vercelenv: 'vercelEnvVars',
  devdb: 'supabaseDevProject',
}
