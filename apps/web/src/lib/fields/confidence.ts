/** The only place the low-confidence threshold lives: a score below this needs a human check. */
export const LOW_CONFIDENCE = 0.9

export const isLowConfidence = (score: number): boolean => score < LOW_CONFIDENCE
