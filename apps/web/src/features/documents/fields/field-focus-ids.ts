/** Ids shared by viewer highlights and form elements (data-focus-id), so each points at the other. */
export const fieldFocusId = (documentId: string, fieldId: string) => `${documentId}:${fieldId}`

export const cellFocusId = (fieldId: string, rowId: string, columnId: string) => `${fieldId}:${rowId}:${columnId}`
