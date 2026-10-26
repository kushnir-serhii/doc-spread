import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FieldDef, FunctionId } from '@/lib/mock/types'
import type { ExprNode } from './expr-node'
import { columnsForSlot, constTypesForSlot, fieldsForSlot, functionsForSlot, type Allowed } from './expr-typing'
import { FunctionMenu } from './function-menu'

type PlainKind = 'field' | 'column' | 'const'

const PLAIN_KINDS: { kind: PlainKind; label: string }[] = [
  { kind: 'field', label: 'Field' },
  { kind: 'column', label: 'Column' },
  { kind: 'const', label: 'Constant' },
]

interface KindButtonsProps {
  label: string
  node: ExprNode
  fields: readonly FieldDef[]
  allowed: Allowed
  onKind: (kind: PlainKind) => void
  onFunction: (fn: FunctionId) => void
}

/** What goes in a slot: a field, a column, a constant or a function. Only the kinds that have an option are offered. */
export const KindButtons = ({ label, node, fields, allowed, onKind, onFunction }: KindButtonsProps) => {
  const offered: Record<PlainKind, boolean> = {
    field: fieldsForSlot(fields, allowed).length > 0,
    column: columnsForSlot(fields, allowed).length > 0,
    const: constTypesForSlot(allowed).length > 0,
  }
  const functions = functionsForSlot(allowed)
  return (
    <div role="group" aria-label={`${label}: what goes here`} className="flex flex-wrap gap-2">
      {PLAIN_KINDS.filter(({ kind }) => offered[kind] || node.kind === kind).map(({ kind, label: text }) => (
        <Button
          key={kind}
          type="button"
          variant={node.kind === kind ? 'secondary' : 'outline'}
          aria-pressed={node.kind === kind}
          className={cn('min-h-touch md:min-h-9', node.kind === kind && 'border border-primary')}
          onClick={() => node.kind !== kind && onKind(kind)}
        >
          {text}
        </Button>
      ))}
      {(functions.length > 0 || node.kind === 'call') && (
        <FunctionMenu
          label={label}
          functions={functions}
          current={node.kind === 'call' ? node.fn : null}
          onSelect={onFunction}
        />
      )}
    </div>
  )
}
