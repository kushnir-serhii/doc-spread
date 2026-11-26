import { FilePlus2, LayoutTemplate, ScanSearch } from 'lucide-react'

/** `needsAi`: creating a type from a sample has no backend yet, so it is disabled with mocks off. */
export const NEW_TYPE_OPTIONS = [
  {
    id: 'template',
    label: 'From a template',
    hint: 'Invoice, receipt, contract and more',
    to: '/types/new?from=template',
    icon: LayoutTemplate,
    needsAi: false,
  },
  {
    id: 'sample',
    label: 'From a sample',
    hint: 'Upload a document, AI suggests fields',
    to: '/types/new?from=sample',
    icon: ScanSearch,
    needsAi: true,
  },
  {
    id: 'blank',
    label: 'Blank',
    hint: 'Define every field yourself',
    to: '/types/new',
    icon: FilePlus2,
    needsAi: false,
  },
] as const
