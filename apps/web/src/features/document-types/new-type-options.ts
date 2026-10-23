import { FilePlus2, LayoutTemplate, ScanSearch } from 'lucide-react'

// Template gallery (`/types/new?template`) comes in a later slice; for now it links to /types/new.
export const NEW_TYPE_OPTIONS = [
  {
    id: 'template',
    label: 'From a template',
    hint: 'Invoice, receipt, contract and more',
    to: '/types/new',
    icon: LayoutTemplate,
  },
  {
    id: 'sample',
    label: 'From a sample',
    hint: 'Upload a document, AI suggests fields',
    to: '/types/new?from=sample',
    icon: ScanSearch,
  },
  {
    id: 'blank',
    label: 'Blank',
    hint: 'Define every field yourself',
    to: '/types/new',
    icon: FilePlus2,
  },
] as const
