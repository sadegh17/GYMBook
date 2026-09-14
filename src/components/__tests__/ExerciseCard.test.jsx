import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ExerciseCard from '../ExerciseCard.jsx'

const exercise = {
  id: 'e1', name_fa: 'اسکات', name_en: 'Squat', gif_url: 'https://x/g.gif',
  page_url: 'https://x/page/', how_to: 'صاف بایست.', tip: 'کمر صاف.', met: 8, sec_per_rep: 4,
}
const item = { id: 'i1', sets: 3, reps: 12, rest_sec: 45, section: 'main', sort: 0 }

const renderCard = (over = {}) => {
  const props = {
    item, exercise, index: 1, done: false, check: null, weightKg: 70,
    onToggle: vi.fn(), ...over,
  }
  const result = render(<ExerciseCard {...props} />)
  return { props, ...result }
}

describe('ExerciseCard', () => {
  it('calls onToggle when the check button is clicked', () => {
    const { props: { onToggle } } = renderCard()
    fireEvent.click(screen.getByLabelText('تکمیل شد'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('adds the done class when the item is checked', () => {
    renderCard({ done: true, check: { id: 'c1', item_id: 'i1', kcal: 30 } })
    expect(screen.getByRole('heading', { name: 'اسکات' }).closest('.ex').classList.contains('done')).toBe(true)
  })

  it('shows the predicted kcal label before ticking', () => {
    const { container } = renderCard()
    const kcal = container.querySelector('.kcal')
    expect(kcal).toBeTruthy()
    expect(kcal.textContent).toContain('کیلوکالری')
    expect(kcal.textContent).toContain('≈')
    expect(kcal.textContent).toContain('۲۳.۵')
  })

  it('shows the stored kcal without the estimate sign when done', () => {
    const { container } = renderCard({ done: true, check: { id: 'c1', item_id: 'i1', kcal: 30 } })
    const kcal = container.querySelector('.kcal')
    expect(kcal.textContent).toContain('۳۰')
    expect(kcal.textContent).not.toContain('≈')
  })
})
