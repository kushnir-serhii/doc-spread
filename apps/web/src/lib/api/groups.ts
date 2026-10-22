export const groupKeys = {
  all: ['groups'] as const,
  values: (typeId: string, fieldId: string) =>
    [...groupKeys.all, typeId, fieldId] as const,
}
