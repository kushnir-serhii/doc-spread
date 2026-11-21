import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RadioOptionProps {
  name: string
  label: string
  description?: string
  checked: boolean
  /** no backend yet (mocks off): the option can't be picked */
  disabled?: boolean
  onSelect: () => void
  /** extra content (an input) shown under the text while checked */
  children?: ReactNode
  className?: string
}

/** Native radio in a 44px row. */
export const RadioOption = ({ name, label, description, checked, disabled, onSelect, children, className }: RadioOptionProps) => {
  const id = useId()
  return (
    <div
      className={cn(
        'rounded-md border has-[:checked]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        className,
      )}
    >
      <label
        htmlFor={id}
        className="flex min-h-touch cursor-pointer items-start gap-3 px-3 py-2.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 md:min-h-9"
      >
        <input
          id={id}
          type="radio"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          {description && <span className="block text-sm text-muted-foreground">{description}</span>}
        </span>
      </label>
      {checked && children && <div className="px-3 pb-3 pl-10">{children}</div>}
    </div>
  )
}
