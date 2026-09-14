import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    ResponsiveContainer: ({ children }) => <div data-rc={children?.type?.name}>{children}</div>,
  }
})

const { default: WeekChart, buildWeeks } = await import('../WeekChart.jsx')

const REF = '2026-09-12' // Saturday: weeks are 08-22..08-28, 08-29..09-04, 09-05..09-11, 09-12..09-18

describe('buildWeeks', () => {
  it('groups Saturday-anchored weeks with kcal sum and capped day percentage', () => {
    const rows = [
      { date: '2026-09-12', kcal: 100, main_done: 1 },
      { date: '2026-09-13', kcal: 50, main_done: 1 },
      { date: '2026-09-14', kcal: 0, main_done: 0 },
      { date: '2026-09-05', kcal: 200, main_done: 1 },
      { date: '2026-09-06', kcal: 30, main_done: 1 },
    ]
    const weeks = buildWeeks(rows, REF)
    expect(weeks.length).toBe(4)
    weeks.forEach((w) => {
      expect(w.label.length).toBeGreaterThan(0)
      expect(w.pct).toBeLessThanOrEqual(100)
    })

    const current = weeks[3]
    expect(current.kcal).toBe(150)
    expect(current.pct).toBe(40)

    const prev = weeks[2]
    expect(prev.kcal).toBe(230)
    expect(prev.pct).toBe(40)

    expect(weeks[0].kcal).toBe(0)
    expect(weeks[0].pct).toBe(0)
  })

  it('caps percentage at 100 when more than 5 days trained', () => {
    const rows = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date('2026-09-12T00:00:00Z'); dt.setUTCDate(12 + d)
      rows.push({ date: dt.toISOString().slice(0, 10), kcal: 10, main_done: 1 })
    }
    const weeks = buildWeeks(rows, REF)
    expect(weeks[3].pct).toBe(100)
  })

  it('ignores warmup-only ticks for the percentage', () => {
    const rows = [{ date: '2026-09-12', kcal: 20, main_done: 0 }]
    const weeks = buildWeeks(rows, REF)
    expect(weeks[3].kcal).toBe(20)
    expect(weeks[3].pct).toBe(0)
  })
})

describe('WeekChart render', () => {
  it('renders without throwing with sample rows', () => {
    const rows = [{ date: '2026-09-12', kcal: 100, main_done: 1 }]
    const { container } = render(<WeekChart rows={rows} today={REF} />)
    expect(container.querySelector('[data-week-chart]')).toBeTruthy()
  })
})
