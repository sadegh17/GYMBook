import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import Today from '../Today.jsx'

const mockAuth = vi.hoisted(() => ({ profile: { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' } }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))
const lib = vi.hoisted(() => ({ fetchSelectablePrograms: vi.fn(), setDefaultProgram: vi.fn() }))
vi.mock('../../lib/programs.js', () => lib)
const api = vi.hoisted(() => ({ fetchProgramTree: vi.fn(), fetchChecks: vi.fn(), toggleCheck: vi.fn() }))
vi.mock('../../lib/api.js', () => api)
vi.mock('../../components/TimerBar.jsx', () => ({ default: () => null }))

const day = {
  id: 'd1', day_key: 'sat', day_label: 'شنبه', title: 'پا', sub: '', focus: '', sort: 1,
  sections: [{ id: 'S1', name: 'بخش ۱', sort: 0 }],
  items: [{ id: 'i1', section_id: 'S1', sets: 3, reps: 12, rest_sec: 45, sort: 1, exercise: { id: 'e1', name_fa: 'پرس سینه', met: 5, sec_per_rep: 4 } }],
}

beforeEach(() => {
  mockAuth.profile = { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' }
  lib.fetchSelectablePrograms.mockResolvedValue([{ id: 'p1', title: 'الف', isOwned: true, isDefault: true }])
  api.fetchProgramTree.mockResolvedValue([day])
  api.fetchChecks.mockResolvedValue([])
  api.toggleCheck.mockResolvedValue(null)
})

const ui = () => render(
  <MemoryRouter>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Today />
    </QueryClientProvider>
  </MemoryRouter>
)

describe('Today', () => {
  it('renders dynamic section name and exercise', async () => {
    ui()
    expect(await screen.findByText('بخش ۱')).toBeTruthy()
    expect(await screen.findByText('پرس سینه')).toBeTruthy()
  })
  it('shows the program picker', async () => {
    ui()
    expect(await screen.findByLabelText('انتخاب برنامه')).toBeTruthy()
  })
  it('prompts to create when the user has no program', async () => {
    mockAuth.profile.program_id = null
    lib.fetchSelectablePrograms.mockResolvedValue([])
    ui()
    expect(await screen.findByText(/هنوز برنامه‌ای نداری/)).toBeTruthy()
  })
})
