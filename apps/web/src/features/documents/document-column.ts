import type { ReactNode } from 'react'
import type { Document } from '@/lib/mock/types'

export interface DocumentColumn {
  /** field id for type columns, a fixed name otherwise */
  id: string
  header: string
  align?: 'right'
  cell: (doc: Document) => ReactNode
}
