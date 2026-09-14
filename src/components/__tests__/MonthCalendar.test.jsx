import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import MonthCalendar from '../MonthCalendar.jsx'

describe('MonthCalendar', () => {
  it('renders correct cell count for Sept 2026 and full-green on 100% day', () => {
    const byDate = new Map([
      ['2026-09-01', { date: '2026-09-01', main_done: 2, main_total: 2, kcal: 45.6 }],
      ['2026-09-02', { date: '2026-09-02', main_done: 1, main_total: 4, kcal: 10 }],
    ])
    const { container } = render(<MonthCalendar year={2026} month={8} byDate={byDate} />)
    const cells = container.querySelectorAll('[data-cal-cell]')
    expect(cells.length).toBe(35)
    const full = container.querySelector('[data-cal-cell="2026-09-01"]')
    expect(full.className).toContain('full')
    expect(full.getAttribute('title')).toContain('۱۰۰٪')
    expect(full.getAttribute('title')).toContain('kcal')
    const partial = container.querySelector('[data-cal-cell="2026-09-02"]')
    expect(partial.className).toContain('partial')
    expect(partial.className).not.toContain('full')
  })
})
