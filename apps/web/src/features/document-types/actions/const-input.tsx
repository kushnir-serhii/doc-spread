import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { parseIsoDate, type ExprType } from '@/lib/fields/functions'
import type { ConstNode } from './expr-node'
import { SlotSelect } from './slot-select'

const TYPE_NAME: Record<ExprType, string> = {
  text: 'Text',
  number: 'Number',
  money: 'Amount',
  date: 'Date',
  boolean: 'Yes/No',
}

/** The typed text as a constant value; null while it isn't a valid value of the type. */
const parseRaw = (type: ExprType, raw: string): unknown => {
  const text = raw.trim()
  switch (type) {
    case 'text':
      return raw === '' ? null : raw
    case 'number':
    case 'money': {
      const value = Number(text.replace(',', '.'))
      if (text === '' || !Number.isFinite(value)) return null
      // money is typed in major units (12.50) and stored as typed; the evaluator converts it once the currency is known
      return value
    }
    case 'date':
      return parseIsoDate(text) === null ? null : text
    case 'boolean':
      return text === 'true' ? true : text === 'false' ? false : null
    default: {
      const unreachable: never = type
      throw new Error(`Unknown type: ${String(unreachable)}`)
    }
  }
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

interface ConstInputProps {
  label: string
  node: ConstNode
  /** the constant types this slot can take; more than one shows a type select */
  types: readonly ExprType[]
  onChange: (node: ConstNode) => void
}

/** A constant: the input matches its type. Money is an amount in major units, in the document's currency. */
export const ConstInput = ({ label, node, types, onChange }: ConstInputProps) => {
  const id = useId()
  const type = exprTypeOf(node)
  // What the user typed; shown as long as it still means the node's value (a removed sibling re-uses this component).
  const [raw, setRaw] = useState(() => formatValue(node.value))
  const shown = parseRaw(type, raw) === node.value ? raw : formatValue(node.value)
  const set = (next: string) => {
    setRaw(next)
    onChange({ ...node, value: parseRaw(type, next) })
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {types.length > 1 && (
          <SlotSelect
            aria-label={`${label}: constant type`}
            value={type}
            onChange={(event) => {
              const next = types.find((t) => t === event.target.value)
              if (next) onChange({ kind: 'const', type: next, value: null })
            }}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_NAME[t]}
              </option>
            ))}
          </SlotSelect>
        )}
        {type === 'boolean' ? (
          <SlotSelect
            aria-label={`${label}: value`}
            value={node.value === true ? 'true' : node.value === false ? 'false' : ''}
            onChange={(event) => set(event.target.value)}
            className="flex-1"
          >
            <option value="">Choose…</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </SlotSelect>
        ) : (
          <Input
            id={id}
            aria-label={`${label}: ${TYPE_NAME[type].toLowerCase()} constant`}
            type={type === 'date' ? 'date' : 'text'}
            inputMode={type === 'number' || type === 'money' ? 'decimal' : undefined}
            value={shown}
            placeholder={type === 'text' ? 'Text' : type === 'date' ? undefined : '0'}
            aria-describedby={type === 'money' ? `${id}-note` : undefined}
            onChange={(event) => set(event.target.value)}
            className="min-h-touch min-w-32 flex-1 md:min-h-9"
          />
        )}
      </div>
      {type === 'money' && (
        <p id={`${id}-note`} className="text-xs text-muted-foreground">
          In the document’s currency, e.g. 12.50.
        </p>
      )}
    </div>
  )
}

const exprTypeOf = (node: ConstNode): ExprType => {
  switch (node.type) {
    case 'number':
    case 'money':
    case 'date':
    case 'boolean':
      return node.type
    default:
      return 'text'
  }
}
