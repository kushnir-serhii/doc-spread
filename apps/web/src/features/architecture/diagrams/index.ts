import { DIAGRAM_IDS, type DiagramDef, type DiagramId } from './diagram-def'
import { DEPLOYMENT_DIAGRAM } from './deployment'
import { DOMAIN_DIAGRAM } from './domain'
import { LIFECYCLE_DIAGRAM } from './lifecycle'
import { PIPELINE_DIAGRAM } from './pipeline'
import { SCREENS_DIAGRAM } from './screens'
import { STRUCTURE_DIAGRAM } from './structure'

export const DEFAULT_DIAGRAM_ID: DiagramId = 'structure'

export const DIAGRAMS: DiagramDef[] = [
  {
    id: 'structure',
    label: 'Structure',
    kind: 'Package diagram',
    description:
      'Workspaces and the layers inside apps/web/src, with the allowed import directions. The rules live in conventions.md.',
    sources: ['pnpm-workspace.yaml', 'docs/conventions.md', 'apps/web/src/'],
    code: STRUCTURE_DIAGRAM,
  },
  {
    id: 'domain',
    label: 'Domain model',
    kind: 'Class diagram',
    description: 'The domain types with their key attributes and multiplicities. The truth lives in types.ts; ownership by the company comes from the mock database.',
    sources: ['apps/web/src/lib/mock/types.ts', 'apps/web/src/lib/mock/api.ts'],
    code: DOMAIN_DIAGRAM,
  },
  {
    id: 'screens',
    label: 'Screens',
    kind: 'Navigation diagram',
    description: 'Every route, grouped as public, auth and app shell, with the links between screens.',
    sources: ['apps/web/src/app/router.tsx', 'docs/product.md'],
    code: SCREENS_DIAGRAM,
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
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    kind: 'Sequence diagram',
    description: 'One document from sign-in and upload through OCR and Claude, review and approval to the spreadsheet export, across the browser, Vercel Functions and Supabase.',
    sources: ['docs/specs/022-vercel-supabase.md', 'docs/specs/023-first-real-flow.md'],
    code: PIPELINE_DIAGRAM,
  },
  {
    id: 'deployment',
    label: 'Deployment',
    kind: 'Deployment diagram',
    description: 'What runs where on Vercel and Supabase: web, functions, storage, queues and the database, and what the browser talks to directly.',
    sources: ['docs/specs/022-vercel-supabase.md', 'docs/specs/023-first-real-flow.md', 'docs/product.md'],
    code: DEPLOYMENT_DIAGRAM,
  },
]

export const isDiagramId = (value: string | null): value is DiagramId =>
  DIAGRAM_IDS.some((id) => id === value)

export const resolveDiagramId = (value: string | null): DiagramId =>
  isDiagramId(value) ? value : DEFAULT_DIAGRAM_ID
