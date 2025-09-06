// Global scoring settings
export const XP_MULTIPLIER = 0.25

export function scalePoints(rawPoints: number): number {
  return Math.max(0, Math.round((rawPoints || 0) * XP_MULTIPLIER))
}

// Normalize session points by item count so very large sets don't explode points
// Example: with targetItems=10, a set of 50 words yields at most ~20% of raw points
export function normalizeBySetSize(rawPoints: number, itemCount: number, targetItems = 10): number {
  const items = Math.max(1, Math.floor(itemCount || 0))
  const target = Math.max(1, Math.floor(targetItems))
  const factor = Math.min(1, target / items)
  return Math.max(0, Math.round(rawPoints * factor))
}







