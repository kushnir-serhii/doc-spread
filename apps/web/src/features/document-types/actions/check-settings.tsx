import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FieldDef } from '@/lib/mock/types'
import { generatedLabel, type CheckForm } from './action-form'
import { SeverityRadio } from './severity-radio'

interface CheckSettingsProps {
  form: CheckForm
  fields: readonly FieldDef[]
  /** 'money' / 'number' when the left side allows a tolerance */
  toleranceFor: 'money' | 'number' | null
  /** the label shown: typed, or generated from the expression */
  label: string
  onChange: (patch: Partial<CheckForm>) => void
}

/** Tolerance, severity and label of a check. */
export const CheckSettings = ({ form, fields, toleranceFor, label, onChange }: CheckSettingsProps) => {
  const id = useId()
  return (
    <div className="flex flex-col gap-4">
      {toleranceFor && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-tolerance`}>Tolerance</Label>
          <Input
            id={`${id}-tolerance`}
            inputMode="decimal"
            value={form.tolerance}
            placeholder="0"
            aria-describedby={`${id}-tolerance-help`}
            onChange={(event) => onChange({ tolerance: event.target.value })}
            className="min-h-touch max-w-40 md:min-h-9"
          />
          <p id={`${id}-tolerance-help`} className="text-xs text-muted-foreground">
            {toleranceFor === 'money'
              ? 'Allowed difference in the document’s currency, e.g. 0.01 for one cent. Covers rounding.'
              : 'Allowed difference between the two numbers.'}
          </p>
        </div>
      )}
      <SeverityRadio value={form.severity} onChange={(severity) => onChange({ severity })} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-label`}>Label</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={`${id}-label`}
            value={label}
            aria-describedby={`${id}-label-help`}
            onChange={(event) => onChange({ label: event.target.value, labelTouched: true })}
            className="min-h-touch min-w-0 flex-1 md:min-h-9"
          />
          {form.labelTouched && (
            <Button
              type="button"
              variant="outline"
              className="min-h-touch md:min-h-9"
              onClick={() => onChange({ label: generatedLabel(form, fields), labelTouched: false })}
            >
              Reset to generated
            </Button>
          )}
        </div>
        <p id={`${id}-label-help`} className="text-xs text-muted-foreground">
          Shown in Review when the check fails. Follows the expression until you edit it.
        </p>
      </div>
    </div>
  )
}
