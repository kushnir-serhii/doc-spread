import { cn } from '@/lib/utils'

interface SelectCheckboxProps {
  label: string
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  className?: string
}

/** Native checkbox in a 44px hit area; sits above the stretched row link. */
export const SelectCheckbox = ({ label, checked, indeterminate = false, onChange, className }: SelectCheckboxProps) => (
  <label className={cn('relative z-10 flex size-touch cursor-pointer items-center justify-center', className)}>
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate
      }}
      onChange={onChange}
      className="size-4 cursor-pointer accent-primary"
    />
  </label>
)
