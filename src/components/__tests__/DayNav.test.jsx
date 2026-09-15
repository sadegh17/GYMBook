import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DayNav from '../DayNav.jsx'

const days = [
  { id: 'd1', day_key: 'sat', day_label: 'شنبه', focus: 'بازو' },
  { id: 'd2', day_key: 'sun', day_label: 'یکشنبه', focus: 'پشت' },
]

describe('DayNav', () => {
  it('marks the current day active and calls onSelect on click', () => {
    const onSelect = vi.fn()
    render(<DayNav days={days} current={1} onSelect={onSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[1].className).toContain('active')
    expect(buttons[0].className).not.toContain('active')
    expect(buttons[1].getAttribute('aria-current')).toBe('true')
    fireEvent.click(buttons[0])
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('renders the Jalali date (day + month) under each day label', () => {
    const dates = { sat: '2026-09-12', sun: '2026-09-13' }
    render(<DayNav days={days} current={1} dates={dates} onSelect={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0].textContent).toContain('شنبه')
    expect(buttons[0].textContent).toContain('۲۱ شهریور')
    expect(buttons[1].textContent).toContain('یکشنبه')
    expect(buttons[1].textContent).toContain('۲۲ شهریور')
  })

  it('does not render a date when none is provided', () => {
    render(<DayNav days={days} current={1} onSelect={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0].textContent).not.toMatch(/[۰-۹]/)
  })
})
