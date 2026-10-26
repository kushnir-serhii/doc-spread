const CONTROLS = 'input, [role="combobox"], [role="switch"], button'

/** The control inside a row (a table's active cell first), or the row itself when it holds none. */
export const focusFieldControl = (target: HTMLElement | null | undefined) => {
  if (!target) return
  // a row is never the control: its input is. Anything else (a cell, a box target) is.
  if (!target.hasAttribute('data-field-id') && target.matches(`${CONTROLS}, [tabindex]`)) return target.focus()
  const control = target.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]') ?? target.querySelector<HTMLElement>(CONTROLS)
  ;(control ?? target).focus()
}
