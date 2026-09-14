import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ProgramBuilder from '../ProgramBuilder.jsx'

const mockAuth = vi.hoisted(() => ({ profile: { id: 'u1', role: 'member', weight_kg: 70 } }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const state = vi.hoisted(() => ({ days: [], sections: [], exercises: [] }))
const calls = vi.hoisted(() => ({ inserted: [], updated: [], deleted: [] }))

vi.mock('../../lib/supabase.js', () => {
  const chain = (rows) => {
    const b = {
      select: vi.fn(() => b), eq: vi.fn(() => b), order: vi.fn(() => b),
      insert: vi.fn((p) => {
        calls.inserted.push(p)
        return { select: vi.fn(() => ({ single: async () => ({ data: { id: 'x1', ...p }, error: null }) })) }
      }),
      update: vi.fn((p) => {
        calls.updated.push(p)
        return { eq: vi.fn(() => Promise.resolve({ error: null })) }
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => { calls.deleted.push(true); return Promise.resolve({ error: null }) }),
      })),
      then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
    }
    return b
  }
  return {
    supabase: {
      from: vi.fn((t) => {
        if (t === 'program_days') return chain(state.days)
        if (t === 'exercises') return chain(state.exercises)
        if (t === 'program_sections') return chain(state.sections)
        if (t === 'program_items') return chain([])
        throw new Error('unexpected ' + t)
      }),
    },
  }
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ProgramBuilder programId="p1" />
  </QueryClientProvider>
)

beforeEach(() => {
  calls.inserted = []; calls.updated = []; calls.deleted = []
  state.sections = [{ id: 'S1', day_id: 'd1', name: 'بخش ۱', sort: 0 }]
  state.exercises = [
    { id: 'e1', name_fa: 'پرس سینه', met: 5, sec_per_rep: 4 },
    { id: 'e2', name_fa: 'اسکوات', met: 5, sec_per_rep: 4 },
  ]
  state.days = [{
    id: 'd1', program_id: 'p1', day_key: 'sat', day_label: 'شنبه', title: 'روز پا', sub: '', focus: '', sort: 1,
    sections: [{ id: 'S1', day_id: 'd1', name: 'بخش ۱', sort: 0 }],
    items: [
      { id: 'i1', day_id: 'd1', section_id: 'S1', exercise_id: 'e1', exercise: { name_fa: 'پرس سینه', met: 5, sec_per_rep: 4 }, sets: 3, reps: 12, rest_sec: 45, sort: 1 },
    ],
  }]
})

describe('ProgramBuilder', () => {
  it('renders day sections by dynamic name and existing items', async () => {
    ui()
    expect(await screen.findByText('بخش ۱')).toBeTruthy()
    expect((await screen.findAllByText('پرس سینه')).length).toBeGreaterThan(0)
  })
  it('shows a kcal preview for an item', async () => {
    ui()
    await screen.findAllByText('پرس سینه')
    // work_min = 3*12*4/60 = 2.4 ; kcal = 5*3.5*70/200*2.4 = 14.7 (fa() keeps the Latin '.')
    expect(await screen.findByText(/۱۴\.۷ کیلوکالری/)).toBeTruthy()
  })
  it('adds a section (insert into program_sections)', async () => {
    ui()
    const add = await screen.findByLabelText('افزودن بخش')
    fireEvent.change(add, { target: { value: 'بخش جدید' } })
    fireEvent.keyDown(add, { key: 'Enter', code: 'Enter' })
    await screen.findByRole('status')
    expect(calls.inserted.some((p) => p.day_id === 'd1' && p.name === 'بخش جدید')).toBe(true)
  })
  it('deletes an item after confirm', async () => {
    vi.stubGlobal('confirm', () => true)
    ui()
    const del = await screen.findByLabelText('حذف حرکت')
    fireEvent.click(del)
    await screen.findByRole('status')
    expect(calls.deleted.length).toBeGreaterThan(0)
    vi.unstubAllGlobals()
  })
})
