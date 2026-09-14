import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Programs from '../admin/Programs.jsx'

const mockAuth = vi.hoisted(() => ({ profile: null, refresh: vi.fn() }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const state = vi.hoisted(() => ({
  programs: [],
  days: [],
  items: [],
  exercises: [],
}))

const calls = vi.hoisted(() => ({ updated: [], inserted: [], deleted: [] }))

vi.mock('../../lib/supabase.js', () => {
  const chainable = (rows) => {
    const b = {
      select: vi.fn(() => b),
      insert: vi.fn((payload) => {
        calls.inserted.push(payload)
        const sel = { single: async () => ({ data: { id: 'new-id', ...payload }, error: null }) }
        return { select: vi.fn(() => sel) }
      }),
      update: vi.fn((patch) => {
        calls.updated.push(patch)
        return { eq: vi.fn(() => Promise.resolve({ error: null })) }
      }),
      delete: vi.fn(() => ({ eq: vi.fn(() => {
        calls.deleted.push(true)
        return Promise.resolve({ error: null })
      }) })),
      eq: vi.fn(() => b),
      order: vi.fn(() => b),
      then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
    }
    return b
  }
  return {
    supabase: {
      auth: { getSession: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), setSession: vi.fn() },
      from: vi.fn((table) => {
        if (table === 'programs') return chainable(state.programs)
        if (table === 'program_days') return chainable(state.days)
        if (table === 'program_items') return chainable(state.items)
        if (table === 'exercises') return chainable(state.exercises)
        throw new Error('unexpected table ' + table)
      }),
    },
  }
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Programs />
  </QueryClientProvider>
)

beforeEach(() => {
  calls.updated = []
  calls.inserted = []
  calls.deleted = []
  state.exercises = [
    { id: 'e1', name_fa: 'پرس سینه' },
    { id: 'e2', name_fa: 'اسکوات' },
  ]
  state.programs = [{ id: 'p1', title: 'برنامه A', description: 'شرح', created_by: 'a1' }]
  state.days = [
    {
      id: 'd1', program_id: 'p1', day_key: 'sat', day_label: 'شنبه', focus: 'پا',
      title: 'روز پا', sub: 'سنگین', sort: 1,
      items: [
        { id: 'i1', day_id: 'd1', exercise_id: 'e1', exercise: { name_fa: 'پرس سینه' }, section: 'main', sets: 3, reps: 12, rest_sec: 60, sort: 1 },
        { id: 'i2', day_id: 'd1', exercise_id: 'e2', exercise: { name_fa: 'اسکوات' }, section: 'main', sets: 4, reps: 10, rest_sec: 90, sort: 2 },
        { id: 'i3', day_id: 'd1', exercise_id: 'e1', exercise: { name_fa: 'پرس سینه' }, section: 'warm', sets: 2, reps: 15, rest_sec: 30, sort: 1 },
      ],
    },
    { id: 'd2', program_id: 'p1', day_key: 'sun', day_label: 'یکشنبه', focus: '', title: '', sub: '', sort: 2, items: [] },
  ]
  state.items = []
})

describe('Programs guard', () => {
  it('renders nothing for non-admin', () => {
    mockAuth.profile = { id: 'u1', role: 'member' }
    const { container } = ui()
    expect(container.innerHTML).toBe('')
  })
})

describe('Programs builder', () => {
  it('shows loading, program list and sections on select', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    expect(await screen.findByText('برنامه‌ها')).toBeTruthy()
    fireEvent.click(await screen.findByText('برنامه A'))
    expect(await screen.findAllByText('پرس سینه')).toBeTruthy()
    expect((await screen.findAllByText('گرم‌کردن')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('اصلی')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('سردکردن')).length).toBeGreaterThan(0)
  })

  it('shows empty state when no programs exist', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    state.programs = []
    ui()
    expect(await screen.findByText(/برنامه‌ای وجود ندارد/)).toBeTruthy()
  })

  it('saves sets on blur via update call', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    await screen.findByLabelText(/ست \(اسکوات\)/)
    const setsInputs = screen.getAllByLabelText(/^ست/)
    fireEvent.change(setsInputs[0], { target: { value: '5' } })
    fireEvent.blur(setsInputs[0])
    await screen.findByRole('status')
    expect(calls.updated.some((p) => p.sets === 5)).toBe(true)
  })

  it('move up button issues sort updates within the same section', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    const up = await screen.findByLabelText(/بالا \(اسکوات\)/)
    fireEvent.click(up)
    await screen.findByRole('status')
    expect(calls.updated.length).toBeGreaterThan(0)
  })

  it('deletes an item row after confirm', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    vi.stubGlobal('confirm', () => true)
    ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    const del = await screen.findByLabelText(/حذف \(اسکوات\)/)
    fireEvent.click(del)
    expect(calls.deleted.length).toBe(1)
    vi.unstubAllGlobals()
  })

  it('day header title edit saves on blur', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    const dayTitle = await screen.findByLabelText('عنوان روز')
    fireEvent.change(dayTitle, { target: { value: 'روز جدید' } })
    fireEvent.blur(dayTitle)
    await screen.findByRole('status')
    expect(calls.updated.some((p) => p.title === 'روز جدید')).toBe(true)
  })

  it('add-move dropdown lists bank exercises', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    const add = await screen.findByLabelText(/افزودن حرکت \(گرم‌کردن\)/)
    const opts = within(add).getAllByRole('option').map((o) => o.textContent)
    expect(opts).toContain('پرس سینه')
    expect(opts).toContain('اسکوات')
  })

  it('inserts a chosen exercise into its section with next sort', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    const add = await screen.findByLabelText(/افزودن حرکت \(سردکردن\)/)
    fireEvent.change(add, { target: { value: 'e2' } })
    await screen.findByRole('status')
    const ins = calls.inserted.find((p) => p.day_id === 'd1' && p.exercise_id === 'e2')
    expect(ins).toBeTruthy()
    expect(ins.section).toBe('cool')
    expect(ins.sort).toBe(1)
  })
})
