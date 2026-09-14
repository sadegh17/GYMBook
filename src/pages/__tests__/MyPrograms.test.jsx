import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Programs from '../Programs.jsx'

const mockAuth = vi.hoisted(() => ({ profile: { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' } }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const lib = vi.hoisted(() => ({
  fetchSelectablePrograms: vi.fn(), createProgramWithDays: vi.fn(),
  softDeleteProgram: vi.fn(), setDefaultProgram: vi.fn(),
}))
vi.mock('../../lib/programs.js', () => lib)
vi.mock('../../components/ProgramBuilder.jsx', () => ({ default: ({ programId }) => <div data-testid="builder">{programId}</div> }))

beforeEach(() => {
  mockAuth.profile = { id: 'u1', role: 'member', weight_kg: 70, program_id: 'p1' }
  lib.fetchSelectablePrograms.mockResolvedValue([{ id: 'p1', title: 'الف', isOwned: true, isDefault: false }])
  lib.createProgramWithDays.mockResolvedValue({ id: 'p2' })
  lib.softDeleteProgram.mockResolvedValue(undefined)
  lib.setDefaultProgram.mockResolvedValue(undefined)
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Programs />
  </QueryClientProvider>
)

describe('My Programs', () => {
  it('lists programs and slot counter', async () => {
    ui()
    expect(await screen.findByText('الف')).toBeTruthy()
    expect(await screen.findByText(/از ۳/)).toBeTruthy()
  })
  it('blocks the 4th create with Persian limit error', async () => {
    lib.fetchSelectablePrograms.mockResolvedValue([
      { id: 'a', title: '۱', isOwned: true, isDefault: false },
      { id: 'b', title: '۲', isOwned: true, isDefault: false },
      { id: 'c', title: '۳', isOwned: true, isDefault: false },
    ])
    ui()
    await screen.findByText('۱')
    fireEvent.change(screen.getByLabelText('اسم برنامه'), { target: { value: 'چهارم' } })
    fireEvent.click(screen.getByRole('button', { name: /ساخت برنامه/ }))
    expect(await screen.findByText(/حداکثر ۳ برنامه/)).toBeTruthy()
    expect(lib.createProgramWithDays).not.toHaveBeenCalled()
  })
  it('sets default via star', async () => {
    ui()
    await screen.findByText('الف')
    fireEvent.click(screen.getByLabelText(/پیش‌فرض/))
    expect(lib.setDefaultProgram).toHaveBeenCalledWith('u1', 'p1')
  })
})
