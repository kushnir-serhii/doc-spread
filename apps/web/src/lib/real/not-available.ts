/** A feature with no backend yet (mocks off): the message is shown to the user as is. */
export const notAvailableYet = (feature: string): Error => new Error(`${feature} is not available yet.`)
