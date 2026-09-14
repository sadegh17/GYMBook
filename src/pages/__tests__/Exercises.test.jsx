import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Exercises from '../admin/Exercises.jsx'

const mockAuth = vi.hoisted(() => ({ profile: null, refresh: vi.fn() }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const state = vi.hoisted(() => ({ exercises: [], items: [] }))
vi.mock('../../lib/supabase.js', () => {
  const query = (fetchResult) => {
    const selectB = {
      order: vi.fn(() => selectB),
      eq: vi.fn(() => selectB),
      single: vi.fn(async () => ({ data: fetchResult.data?.[0] ?? null, error: null })),
      then: (res, rej) => Promise.resolve(fetchResult).then(res, rej),
    }
    const insertChain = {
      select: vi.fn(() => insertChain),
      single: vi.fn(async () => ({ data: fetchResult.data?.[0] ?? null, error: null })),
      then: (res, rej) => Promise.resolve(fetchResult).then(res, rej),
    }
    return {
      select: vi.fn(() => selectB),
      order: vi.fn(() => selectB),
      insert: vi.fn(() => insertChain),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      then: (res, rej) => Promise.resolve(fetchResult).then(res, rej),
    }
  }
  return {
    supabase: {
      auth: { getSession: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), setSession: vi.fn() },
      from: vi.fn((table) => {
        if (table === 'exercises') return query({ data: state.exercises, error: null })
        if (table === 'program_items') return query({ data: state.items, error: null })
        return query({ data: null, error: { message: 'unexpected ' + table } })
      }),
    },
  }
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Exercises />
  </QueryClientProvider>
)

beforeEach(() => {
  state.exercises = [
    { id: 'e1', name_fa: 'پرس سینه', name_en: 'Bench Press', met: 6, sec_per_rep: 3 },
    { id: 'e2', name_fa: 'اسکوات', name_en: 'Squat', met: 7, sec_per_rep: 2.5 },
  ]
  state.items = [{ id: 'i1', exercise_id: 'e1' }]
})

describe('Exercises guard', () => {
  it('renders nothing for non-admin', () => {
    mockAuth.profile = { id: 'u1', role: 'member' }
    const { container } = ui()
    expect(container.innerHTML).toBe('')
  })
})

describe('Exercises table', () => {
  it('renders mocked rows with met and usage count', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    expect(await screen.findByText('پرس سینه')).toBeTruthy()
    expect(await screen.findByText('اسکوات')).toBeTruthy()
    expect(screen.getByText('Bench Press')).toBeTruthy()
    expect(screen.getByText(/استفاده/)).toBeTruthy()
    expect(screen.getByText('۱')).toBeTruthy()
    expect(screen.getByText('۰')).toBeTruthy()
  })

  it('blocks deleting a used exercise with a Persian message', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    await screen.findByText('پرس سینه')
    fireEvent.click(screen.getAllByText('حذف')[0])
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('برنامه')
  })
})
