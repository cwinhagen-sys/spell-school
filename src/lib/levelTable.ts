/**
 * Build a level table using a geometric progression and force exact total XP at max level.
 * Default: T=1,000,000, LMAX=100, r=1.06.
 */

export type LevelTableConfig = {
  totalXp?: number
  maxLevel?: number
  growth?: number
}

type Row = { level: number; deltaXp: number; cumulativeXp: number }

const DEFAULTS = { totalXp: 1_000_000, maxLevel: 100, growth: 1.06 }

export function generateLevelTable(config?: LevelTableConfig): Row[] {
  const T = config?.totalXp ?? DEFAULTS.totalXp
  const LMAX = config?.maxLevel ?? DEFAULTS.maxLevel
  const r = config?.growth ?? DEFAULTS.growth

  const denom = Math.pow(r, LMAX) - 1
  const B = denom !== 0 ? (T * (r - 1)) / denom : T / LMAX

  const deltas: number[] = []
  let cumulative = 0
  const rows: Row[] = []

  for (let L = 1; L <= LMAX; L++) {
    const d = Math.round(B * Math.pow(r, L - 1))
    deltas.push(d)
    cumulative += d
    rows.push({ level: L, deltaXp: d, cumulativeXp: cumulative })
  }

  // Adjust the last delta so that cumulativeXp at LMAX is exactly T
  const diff = T - cumulative
  if (diff !== 0) {
    const last = deltas[LMAX - 1] + diff
    const adjusted = Math.max(1, last) // keep positive
    const adjustDiff = adjusted - deltas[LMAX - 1]
    deltas[LMAX - 1] = adjusted
    // rebuild rows cumulative
    cumulative = 0
    for (let i = 0; i < LMAX; i++) {
      cumulative += deltas[i]
      rows[i].deltaXp = deltas[i]
      rows[i].cumulativeXp = cumulative
    }
  }

  return rows
}


























