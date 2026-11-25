import { DIAGRAM_IDS, type DiagramDef, type DiagramId } from './diagram-def'
import { CONTEXT_DIAGRAM, CONTEXT_ITEMS } from './context'
import { DELIVERY_DIAGRAM, DELIVERY_ITEMS } from './delivery'
import { DEPLOYMENT_DIAGRAM, DEPLOYMENT_ITEMS } from './deployment'
import { DOCUMENT_FLOW_DIAGRAM, DOCUMENT_FLOW_ITEMS } from './document-flow'
import { DOMAIN_DIAGRAM, DOMAIN_ITEMS } from './domain'
import { LIFECYCLE_DIAGRAM, LIFECYCLE_ITEMS } from './lifecycle'
import { PIPELINE_DIAGRAM, PIPELINE_ITEMS } from './pipeline'
import { SCREENS_DIAGRAM, SCREENS_ITEMS } from './screens'
import { STRUCTURE_DIAGRAM, STRUCTURE_ITEMS } from './structure'
import { USER_FLOW_DIAGRAM, USER_FLOW_ITEMS } from './user-flow'

export const DEFAULT_DIAGRAM_ID: DiagramId = 'context'

export const DIAGRAMS: DiagramDef[] = [
  {
    id: 'context',
    label: 'System context',
    kind: 'Context diagram (C4 style)',
    description:
      'DocSpread (web app and API) in the middle, the user, and the four outside systems it depends on: Vercel, Supabase, Anthropic and GitHub. One labelled arrow per relationship.',
    sources: ['CLAUDE.md', 'docs/product.md', 'apps/web/vercel.json', 'services/api/src/', 'apps/web/api/', '.github/workflows/migrate.yml'],
    code: CONTEXT_DIAGRAM,
    items: CONTEXT_ITEMS,
  },
  {
    id: 'structure',
    label: 'Structure',
    kind: 'Package diagram',
    description:
      'Workspaces and the layers inside apps/web/src, with the allowed import directions. The rules live in conventions.md.',
    sources: ['pnpm-workspace.yaml', 'docs/conventions.md', 'apps/web/src/', 'evals/', 'services/api/scripts/eval-extract.ts'],
    code: STRUCTURE_DIAGRAM,
    items: STRUCTURE_ITEMS,
  },
  {
    id: 'domain',
    label: 'Domain model',
    kind: 'Class diagram',
    description: 'The domain types with their key attributes and multiplicities. The truth lives in types.ts; ownership by the company comes from the mock database.',
    sources: ['apps/web/src/lib/mock/types.ts', 'apps/web/src/lib/mock/api.ts'],
    code: DOMAIN_DIAGRAM,
    items: DOMAIN_ITEMS,
  },
  {
    id: 'screens',
    label: 'Screens',
    kind: 'Navigation diagram',
    description: 'Every route, grouped as public, auth and app shell, with the links between screens.',
    sources: ['apps/web/src/app/router.tsx', 'docs/product.md'],
    code: SCREENS_DIAGRAM,
    items: SCREENS_ITEMS,
  },
  {
    id: 'user-flow',
    label: 'User flow',
    kind: 'Activity diagram',
    description:
      'A user from sign-up to a downloaded spreadsheet, in swimlanes User, Web app and Backend, with the error branches. Only the real path with mocks off is drawn.',
    sources: ['apps/web/src/app/router.tsx', 'apps/web/src/lib/api/', 'apps/web/src/lib/real/', 'services/api/src/signup.ts', 'docs/product.md'],
    code: USER_FLOW_DIAGRAM,
    items: USER_FLOW_ITEMS,
  },
  {
    id: 'lifecycle',
    label: 'Document lifecycle',
    kind: 'State diagram',
    description: 'Every document status and the transitions between them, labelled with what causes each one.',
    sources: [
      'apps/web/src/lib/mock/types.ts',
      'apps/web/src/lib/mock/api.ts',
      'docs/specs/006-inbox.md',
      'docs/specs/007-upload.md',
      'docs/specs/008-review.md',
      'docs/specs/009-export.md',
    ],
    code: LIFECYCLE_DIAGRAM,
    items: LIFECYCLE_ITEMS,
  },
  {
    id: 'document-flow',
    label: 'Document flow',
    kind: 'Activity diagram',
    description:
      'One file from upload to download across the browser, Vercel Functions, Supabase and Anthropic, each step labelled with the document status it sets.',
    sources: ['services/api/src/', 'apps/web/api/', 'supabase/migrations/', 'apps/web/src/lib/mock/types.ts'],
    code: DOCUMENT_FLOW_DIAGRAM,
    items: DOCUMENT_FLOW_ITEMS,
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    kind: 'Sequence diagram',
    description: 'One document from sign-in and upload through OCR and Claude, review and approval to the spreadsheet export, across the browser, Vercel Functions and Supabase.',
    sources: ['docs/specs/022-vercel-supabase.md', 'docs/specs/023-first-real-flow.md', 'docs/specs/026-extraction-evals.md'],
    code: PIPELINE_DIAGRAM,
    items: PIPELINE_ITEMS,
  },
  {
    id: 'deployment',
    label: 'Deployment',
    kind: 'Deployment diagram',
    description: 'What runs where on Vercel and Supabase: web, functions, storage, queues and the database, and what the browser talks to directly.',
    sources: ['docs/specs/022-vercel-supabase.md', 'docs/specs/023-first-real-flow.md', 'docs/product.md'],
    code: DEPLOYMENT_DIAGRAM,
    items: DEPLOYMENT_ITEMS,
  },
  {
    id: 'delivery',
    label: 'Delivery',
    kind: 'Activity diagram',
    description:
      'How a change reaches production: a branch per spec, a pull request and preview, the merge to main, the Vercel deploy, and the migrate workflow that applies database migrations to docspread-dev.',
    sources: ['.github/workflows/migrate.yml', 'CLAUDE.md', 'docs/setup.md', 'docs/process.md'],
    code: DELIVERY_DIAGRAM,
    items: DELIVERY_ITEMS,
  },
]

export const isDiagramId = (value: string | null): value is DiagramId =>
  DIAGRAM_IDS.some((id) => id === value)

export const resolveDiagramId = (value: string | null): DiagramId =>
  isDiagramId(value) ? value : DEFAULT_DIAGRAM_ID
