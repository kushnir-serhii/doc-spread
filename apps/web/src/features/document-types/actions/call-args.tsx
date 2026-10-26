import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FUNCTIONS } from '@/lib/fields/functions'
import type { FieldDef } from '@/lib/mock/types'
import { argLabel } from './arg-labels'
import { EMPTY_NODE, type CallNode, type ExprNode } from './expr-node'
import { argAllowed, getArity, type Allowed } from './expr-typing'
import { ExprSlot } from './expr-slot'

interface CallArgsProps {
  /** the name of the slot this call sits in */
  label: string
  node: CallNode
  fields: readonly FieldDef[]
  /** what the call itself may produce */
  allowed: Allowed
  onChange: (node: ExprNode) => void
}

/** The argument slots of a function; "+ argument" and remove for the variadic ones (never below the minimum). */
export const CallArgs = ({ label: parentLabel, node, fields, allowed, onChange }: CallArgsProps) => {
  const fn = FUNCTIONS[node.fn]
  const arity = getArity(fn)
  const setArg = (index: number, arg: ExprNode) =>
    onChange({ ...node, args: node.args.map((current, i) => (i === index ? arg : current)) })

  return (
    <div className="flex flex-col gap-3 border-l-2 pl-3">
      <p className="text-xs text-muted-foreground">{fn.description}</p>
      {node.args.map((arg, index) => {
        const title = argLabel(node.fn, index)
        const label = `${parentLabel} › ${fn.label} › ${title}`
        // Arguments are positional and have no identity of their own, so the index is the key.
        return (
          <div key={index} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ExprSlot
                label={label}
                title={title}
                node={arg}
                allowed={argAllowed(node, index, fields, allowed)}
                fields={fields}
                onChange={(next) => setArg(index, next)}
              />
            </div>
            {arity.variadic && node.args.length > arity.count && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-touch shrink-0 md:size-9"
                aria-label={`Remove ${label}`}
                onClick={() => onChange({ ...node, args: node.args.filter((_, i) => i !== index) })}
              >
                <X aria-hidden />
              </Button>
            )}
          </div>
        )
      })}
      {arity.variadic && (
        <Button
          type="button"
          variant="outline"
          className="min-h-touch self-start md:min-h-9"
          onClick={() => onChange({ ...node, args: [...node.args, EMPTY_NODE] })}
        >
          <Plus aria-hidden />
          Argument
        </Button>
      )}
    </div>
  )
}
