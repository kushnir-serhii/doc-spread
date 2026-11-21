import type { GlossaryKey } from './glossary'

/** Package diagram: workspaces, folders of apps/web/src and the allowed import directions (docs/conventions.md). */
export const STRUCTURE_DIAGRAM = `flowchart TB
  subgraph web["apps/web (@docspread/web), folders of src"]
    main["main.tsx"]
    app["app (router, providers)"]
    pages["pages"]
    features["features"]
    hooks["hooks"]
    styles["styles"]
    subgraph components["components"]
      layout["layout"]
      domain["domain"]
      ui["ui"]
    end
    subgraph lib["lib"]
      api["api"]
      fields["fields"]
      mock["mock (domain types, fake backend)"]
      real["real (Supabase client with RLS, /api calls)"]
      theme["theme"]
      locale["format-locale"]
    end
  end
  subgraph shared["packages/shared (@docspread/shared)"]
    sharedsrc["src (raw TypeScript, no build step)"]
  end
  subgraph fn["apps/web/api (Vercel Functions)"]
    health["health.ts"]
    router["router.ts"]
    ocrfn["pipeline/ocr.ts"]
    extractfn["pipeline/extract.ts"]
  end
  subgraph apisvc["services/api (@docspread/api)"]
    apisrc["handlers, token check, signup.ts, signed upload, export/ (XLSX, CSV), OCR and extract steps; seed and smoke scripts"]
  end
  subgraph supabase["supabase (folder, not a workspace)"]
    migrations["migrations, seed, tests"]
  end

  main --> app
  app -->|lazy| pages
  app --> layout
  app --> theme
  pages --> features
  pages --> components
  pages --> api
  features --> components
  features --> api
  features --> fields
  features --> locale
  features --> hooks
  layout --> ui
  domain --> ui
  api -->|"only importer of mock functions"| mock
  api -->|"only importer of real functions"| real
  real -->|"domain types only"| mock
  real --> fields
  mock --> fields
  web -->|workspace dependency| shared
  fn -->|"imports by relative path"| apisvc
  apisvc -->|"secret key, SQL"| supabase
`

/** Mermaid node id → glossary entry. */
export const STRUCTURE_ITEMS: Record<string, GlossaryKey> = {
  main: 'srcMain',
  app: 'srcApp',
  pages: 'srcPages',
  features: 'srcFeatures',
  hooks: 'srcHooks',
  styles: 'srcStyles',
  layout: 'componentsLayout',
  domain: 'componentsDomain',
  ui: 'componentsUi',
  api: 'libApi',
  fields: 'libFields',
  mock: 'libMock',
  real: 'libReal',
  theme: 'libTheme',
  locale: 'libFormatLocale',
  sharedsrc: 'sharedPackage',
  health: 'fnHealth',
  router: 'fnApiRouter',
  ocrfn: 'fnPipelineOcr',
  extractfn: 'fnPipelineExtract',
  apisrc: 'servicesApi',
  migrations: 'supabaseMigrations',
}
