const TYPING_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="combobox"], [role="textbox"], [role="listbox"], [role="grid"]'

/** True where letter keys belong to the control: text inputs, selects, comboboxes and the table grid with its own keys. */
export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(TYPING_SELECTOR) !== null
