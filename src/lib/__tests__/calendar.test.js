import { describe, it, expect } from 'vitest'
import { monthMatrix } from '../calendar.js'

describe('monthMatrix', () => {
  it('Sept 2026: 30 days, Sep 1 = Tuesday -> 3 leading nulls (Sat/Sun/Mon)', () => {
    const cells = monthMatrix(2026, 8)
    expect(new Date(2026, 8, 1).getDay()).toBe(2)
    expect(cells.slice(0, 3)).toEqual([null, null, null])
    expect(cells[3]).toBe('2026-09-01')
    expect(cells).toContain('2026-09-30')
    expect(cells.filter(Boolean)).toHaveLength(30)
    expect(cells.length % 7).toBe(0)
  })
  it('month starting Saturday has no leading nulls (Aug 2026)', () => {
    expect(new Date(2026, 7, 1).getDay()).toBe(6)
    const cells = monthMatrix(2026, 7)
    expect(cells[0]).toBe('2026-08-01')
    expect(cells.filter(Boolean)).toHaveLength(31)
    expect(cells.length % 7).toBe(0)
  })
  it('pads trailing nulls to full weeks (Feb 2026, 28 days from Sunday)', () => {
    const cells = monthMatrix(2026, 1)
    expect(cells[0]).toBeNull()
    expect(cells[1]).toBe('2026-02-01')
    expect(cells.filter(Boolean)).toHaveLength(28)
    expect(cells.length % 7).toBe(0)
  })
})
