import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ExerciseHistory, { groupHistory } from '../ExerciseHistory.jsx'

const SAMPLE = [
  { date: '2026-09-10', kcal: 20, item: { sets: 3, exercise: { name_fa: 'پرس سینه' } } },
  { date: '2026-09-11', kcal: 22, item: { sets: 4, exercise: { name_fa: 'پرس سینه' } } },
  { date: '2026-09-12', kcal: 15, item: { sets: 2, exercise: { name_fa: 'اسکوات' } } },
]

describe('groupHistory', () => {
  it('groups by exercise sorted by session count desc', () => {
    const rows = groupHistory(SAMPLE)
    expect(rows.length).toBe(2)
    expect(rows[0].name).toBe('پرس سینه')
    expect(rows[0].sessions).toBe(2) // two distinct dates
    expect(rows[0].sets).toBe(7)
    expect(rows[0].last).toBe('2026-09-11')
    expect(rows[1].name).toBe('اسکوات')
    expect(rows[1].sets).toBe(2)
  })

  it('skips checks without an exercise name', () => {
    const rows = groupHistory([{ date: '2026-09-12', kcal: 5, item: null }])
    expect(rows).toEqual([])
  })

  it('uses snapshot name/sets when the program item was deleted', () => {
    const rows = groupHistory([
      { date: '2026-09-01', item_id: null, exercise_name: 'پرس سینه', sets: 4, item: null },
      { date: '2026-09-02', item_id: null, exercise_name: 'پرس سینه', sets: 4, item: null },
    ])
    expect(rows).toEqual([{ name: 'پرس سینه', sessions: 2, sets: 8, last: '2026-09-02' }])
  })
})

const gteMock = vi.hoisted(() => vi.fn())
const eqMock = vi.hoisted(() => vi.fn())
const selectMock = vi.hoisted(() => vi.fn())
const fromMock = vi.hoisted(() => vi.fn())
vi.mock('../../lib/supabase.js', () => ({
  supabase: { from: fromMock },
}))
vi.mock('../../lib/auth.jsx', () => ({
  useAuth: () => ({ profile: { id: 'user1' } }),
}))

describe('ExerciseHistory render', () => {
  it('renders a table with per-exercise rows', async () => {
    gteMock.mockResolvedValue({ data: SAMPLE, error: null })
    eqMock.mockReturnValue({ gte: gteMock })
    selectMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })

    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <ExerciseHistory />
      </QueryClientProvider>
    )
    await waitFor(() => expect(screen.getByText('پرس سینه')).toBeTruthy())
    expect(screen.getByText('اسکوات')).toBeTruthy()
    expect(fromMock).toHaveBeenCalledWith('checks')
  })
})
