import { describe, it, expect } from 'vitest'
import { fa, calcKcal, computeStreak, bestStreak, dayPercent } from '../calc.js'

describe('calcKcal', () => {
  const ex = { met: 8, sec_per_rep: 4 }
  it('rep-based: 3 sets x 12 reps x 4s at 70kg', () => {
    // work_min = 3*12*4/60 = 2.4 ; kcal = 8*3.5*70/200*2.4 = 23.52
    expect(calcKcal(ex, { sets: 3, reps: 12 }, 70)).toBeCloseTo(23.5, 1)
  })
  it('time-based (plank): reps are seconds, sec_per_rep=1', () => {
    // work_min = 3*40/60 = 2 ; kcal = 3.5*3.5*63/200*2 = 7.72
    expect(calcKcal({ met: 3.5, sec_per_rep: 1 }, { sets: 3, reps: 40 }, 63)).toBeCloseTo(7.7, 1)
  })
  it('rounds down to one decimal, never negative', () => {
    expect(calcKcal({ met: 0, sec_per_rep: 0 }, { sets: 0, reps: 0 }, 70)).toBe(0)
  })
})

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const s = new Set(['2026-09-12', '2026-09-13', '2026-09-14'])
    expect(computeStreak(s, '2026-09-14')).toBe(3)
  })
  it('today missing but yesterday chain intact still counts (grace)', () => {
    const s = new Set(['2026-09-11', '2026-09-12', '2026-09-13'])
    expect(computeStreak(s, '2026-09-14')).toBe(3)
  })
  it('gap breaks streak', () => {
    const s = new Set(['2026-09-13', '2026-09-14'])
    expect(computeStreak(s.add('2026-09-10'), '2026-09-14')).toBe(2)
  })
  it('empty set is zero', () => expect(computeStreak(new Set(), '2026-09-14')).toBe(0))
})

describe('bestStreak', () => {
  it('longest run ignoring gaps', () => {
    const s = new Set(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-08', '2026-09-09'])
    expect(bestStreak(s)).toBe(3)
  })
})

describe('dayPercent', () => {
  it('100 when all done', () => expect(dayPercent(5, 5)).toBe(100))
  it('0 when no items scheduled', () => expect(dayPercent(0, 0)).toBe(0))
  it('rounds to nearest int', () => expect(dayPercent(2, 6)).toBe(33))
})

it('fa() converts digits', () => expect(fa('۰ check 45%')).toBe('۰ check ۴۵٪'))