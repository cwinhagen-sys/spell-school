/**
 * Leveling module using a geometric progression for XP requirements.
 * Default config targets ~500,000 total XP to reach max level 100 with growth 1.06.
 *
 * Formulas:
 *   deltaXP(L) = round(B * r^(L-1))
 *   B = T * (r - 1) / (r^Lmax - 1)
 *   cumulative(L) ≈ round(B * (r^L - 1) / (r - 1))
 *
 * We use closed-form for cumulative for efficiency and acceptable rounding error
 * (<= ~0.5 per term). The acceptance allows ±0.2% tolerance on total.
 */

export type LevelingConfig = {
  totalXp: number
  maxLevel: number
  growth: number
}

const DEFAULT_CONFIG: LevelingConfig = {
  totalXp: 2_000_000,
  maxLevel: 100,
  growth: 1.10,
}

function resolveConfig(cfg?: Partial<LevelingConfig>): LevelingConfig {
  const base = DEFAULT_CONFIG
  return {
    totalXp: cfg?.totalXp ?? base.totalXp,
    maxLevel: cfg?.maxLevel ?? base.maxLevel,
    growth: cfg?.growth ?? base.growth,
  }
}

/**
 * Compute B given config.
 */
function computeBase(cfg: LevelingConfig): number {
  const { totalXp: T, growth: r, maxLevel: Lmax } = cfg
  if (r <= 1) return T / Lmax // fallback to linear-ish if misconfigured
  const denom = Math.pow(r, Lmax) - 1
  if (denom === 0) return T / Lmax
  return (T * (r - 1)) / denom
}

/**
 * Return the XP needed to advance from (level) to (level + 1).
 * Level is 1-indexed.
 */
export function deltaXp(level: number, cfg?: Partial<LevelingConfig>): number {
  const c = resolveConfig(cfg)
  const B = computeBase(c)
  if (level < 1) return 0
  const raw = B * Math.pow(c.growth, level - 1)
  return Math.round(raw)
}

/**
 * Return cumulative XP required to reach the start of a given level (i.e., sum of deltas up to L).
 * Uses closed-form geometric sum and rounds the result.
 */
export function cumulativeXp(level: number, cfg?: Partial<LevelingConfig>): number {
  // Return XP required to reach the START of a given level.
  // By definition, start of level 1 is 0 XP.
  const c = resolveConfig(cfg)
  if (level <= 1) return 0
  const B = computeBase(c)
  const r = c.growth
  if (r === 1) return Math.round(B * (level - 1))
  const sum = B * (Math.pow(r, level - 1) - 1) / (r - 1)
  return Math.round(sum)
}

/**
 * Determine the current level for a given XP, progress to next, and the next delta.
 * progressToNext is in [0, 1]. For maxLevel, progressToNext is 1 and nextDelta is 0.
 */
export function levelForXp(xp: number, cfg?: Partial<LevelingConfig>): { level: number; progressToNext: number; nextDelta: number } {
  const c = resolveConfig(cfg)
  const maxL = c.maxLevel
  if (xp <= 0) {
    const next = deltaXp(1, c)
    return { level: 1, progressToNext: 0, nextDelta: next }
  }

  // Binary search over levels to find highest L with cumulative(L) <= xp
  let lo = 1, hi = maxL, ans = 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const cum = cumulativeXp(mid, c)
    if (cum <= xp) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  // If we've reached max level
  if (ans >= maxL) {
    return { level: maxL, progressToNext: 1, nextDelta: 0 }
  }

  const curCum = cumulativeXp(ans, c)
  const nextDelta = deltaXp(ans + 1, c)
  const gained = Math.max(0, xp - curCum)
  const progressToNext = nextDelta > 0 ? Math.max(0, Math.min(1, gained / nextDelta)) : 0
  return { level: ans, progressToNext, nextDelta }
}

import { titleForLevel } from './wizardTitles'

/**
 * Build the full leveling table (1..maxLevel), with optional wizard title/image per step.
 */
export function fullTable(cfg?: Partial<LevelingConfig>): Array<{ level: number; delta: number; cumulative: number; title?: string; image?: string }> {
  const c = resolveConfig(cfg)
  const out: Array<{ level: number; delta: number; cumulative: number; title?: string; image?: string }> = []
  for (let L = 1; L <= c.maxLevel; L++) {
    const delta = deltaXp(L, c)
    const cumulative = cumulativeXp(L, c)
    const { title, image } = titleForLevel(L)
    out.push({ level: L, delta, cumulative, ...(title ? { title } : {}), ...(image ? { image } : {}) })
  }
  return out
}

export const DEFAULT_LEVELING_CONFIG = DEFAULT_CONFIG






