import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Programs from '../admin/Programs.jsx'

const mockAuth = vi.hoisted(() => ({ profile: null }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))
vi.mock('../../components/ProgramBuilder.jsx', () => ({ default: ({ programId }) => <div data-testid="builder">{programId}</div> }))

const calls = vi.hoisted(() => ({ inserted: [] }))
const list = vi.hoisted(() => ({ programs: [] }))

vi.mock('../../lib/supabase.js', () => {
  const chain = () => {
    const b = {}
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.is = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.insert = vi.fn((p) => { calls.inserted.push(p); return b })
    b.single = vi.fn(() => Promise.resolve({ data: { id: 'newp' }, error: null }))
    b.then = (res, rej) => Promise.resolve({ data: list.programs, error: null }).then(res, rej)
    return b
  }
  return { supabase: { from: vi.fn(() => chain()) } }
})

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Programs /></QueryClientProvider>)

beforeEach(() => { calls.inserted = []; list.programs = [{ id: 'p1', title: 'برنامه A' }] })

describe('admin Programs', () => {
  it('renders nothing for member', () => {
    mockAuth.profile = { role: 'member' }
    const { container } = ui()
    expect(container.innerHTML).toBe('')
  })
  it('lists programs and opens builder on select', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }; ui()
    fireEvent.click(await screen.findByText('برنامه A'))
    expect(await screen.findByTestId('builder')).toBeTruthy()
  })
  it('creates a global program without an owner', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }; ui()
    fireEvent.change(screen.getByLabelText('عنوان برنامه'), { target: { value: 'سراسری' } })
    fireEvent.click(screen.getByRole('button', { name: /برنامه جدید/ }))
    await screen.findByRole('status')
    expect(calls.inserted.some((p) => p.title === 'سراسری' && p.created_by === 'a1' && p.owner_id === null)).toBe(true)
  })
})
