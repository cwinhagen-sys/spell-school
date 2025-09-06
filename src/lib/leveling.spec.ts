import { deltaXp, cumulativeXp, levelForXp, fullTable, DEFAULT_LEVELING_CONFIG } from './leveling'

describe('leveling module', () => {
  test('deltaXp is strictly increasing with level (monotonic)', () => {
    let prev = deltaXp(1)
    for (let L = 2; L <= 100; L++) {
      const cur = deltaXp(L)
      expect(cur).toBeGreaterThan(prev)
      prev = cur
    }
  })

  test('cumulative at 100 is within 0.2% of 2_000_000', () => {
    const total = cumulativeXp(100)
    const target = 2_000_000
    const diff = Math.abs(total - target)
    expect(diff / target).toBeLessThanOrEqual(0.002)
  })

  test('levelForXp around level 10 boundary', () => {
    const c9 = cumulativeXp(9)
    const d10 = deltaXp(10)
    const justBefore10 = levelForXp(c9 + d10 - 1)
    expect(justBefore10.level).toBe(9)

    const at10 = levelForXp(c9 + d10)
    expect(at10.level).toBe(10)
    expect(at10.progressToNext).toBeGreaterThanOrEqual(0)
    expect(at10.progressToNext).toBeLessThanOrEqual(1)
  })

  test('titles only mapped on 10-step levels', () => {
    const table = fullTable()
    for (const row of table) {
      if (row.level % 10 === 0) {
        expect(row.title).toBeTruthy()
        expect(row.image).toBeTruthy()
      } else {
        expect(row.title).toBeUndefined()
        expect(row.image).toBeUndefined()
      }
    }
  })

  test('changing growth keeps API intact', () => {
    const g105 = cumulativeXp(100, { growth: 1.05 })
    const g108 = cumulativeXp(100, { growth: 1.08 })
    expect(typeof g105).toBe('number')
    expect(typeof g108).toBe('number')
  })
})






