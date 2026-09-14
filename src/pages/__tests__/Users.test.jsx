import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Users from '../admin/Users.jsx'

const mockAuth = vi.hoisted(() => ({ profile: null, refresh: vi.fn() }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

// Programmable chainable supabase mock (modeled on api.test.js).
const state = vi.hoisted(() => ({
  profiles: [],
  programs: [],
  updateErr: null,
  updated: [],
}))
vi.mock('../../lib/supabase.js', () => {
  const query = (fetchResult) => {
    const selectB = {
      order: vi.fn(() => selectB),
      eq: vi.fn(() => selectB),
      then: (res, rej) => Promise.resolve(fetchResult).then(res, rej),
    }
    const b = {
      select: vi.fn(() => selectB),
      order: vi.fn(() => selectB),
      update: vi.fn((patch) => {
        state.updated.push(patch)
        return { eq: vi.fn(async () => ({ error: state.updateErr })) }
      }),
      then: (res, rej) => Promise.resolve(fetchResult).then(res, rej),
    }
    return b
  }
  return {
    supabase: {
      auth: { getSession: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), setSession: vi.fn() },
      from: vi.fn((table) => {
        if (table === 'profiles') return query({ data: state.profiles, error: null })
        if (table === 'programs') return query({ data: state.programs, error: null })
        return query({ data: null, error: { message: 'unexpected ' + table } })
      }),
    },
  }
})

import { supabase } from '../../lib/supabase.js'

const ui = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <Users />
  </QueryClientProvider>
)

beforeEach(() => {
  state.profiles = [
    { id: 'a1', name: 'Admin', email: 'a@g.t', role: 'admin', approved: true, weight_kg: 80, theme: 'sadeq', program_id: null, created_at: '1' },
    { id: 'm1', name: 'Member', email: 'm@g.t', role: 'member', approved: false, weight_kg: 70, theme: 'sadeq', program_id: null, created_at: '2' },
  ]
  state.programs = []
  state.updateErr = null
  state.updated = []
  mockAuth.refresh.mockClear()
})

describe('Users guard', () => {
  it('renders nothing for non-admin', () => {
    mockAuth.profile = { id: 'u1', role: 'member' }
    const { container } = ui()
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when profile is missing', () => {
    mockAuth.profile = null
    const { container } = ui()
    expect(container.innerHTML).toBe('')
  })

  it('role select renders for admin', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    const { container } = ui()
    expect(container.innerHTML).toContain('ساخت کاربر')
  })
})

describe('Users inline edit — self demote/lockout guard (R18)', () => {
  it('blocks changing own role and does not call the update API', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    const ownRole = await screen.findByLabelText('نقش Admin')
    fireEvent.change(ownRole, { target: { value: 'member' } })
    await waitFor(() => expect(
      screen.getByText('نمی‌توانید دسترسی یا تایید حساب خودتان را تغییر دهید')
    ).toBeTruthy())
    expect(state.updated).toHaveLength(0)
  })

  it('blocks unapproving own account and does not call the update API', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    const ownApproved = await screen.findByLabelText('تأیید Admin')
    fireEvent.click(ownApproved)
    await waitFor(() => expect(
      screen.getByText('نمی‌توانید دسترسی یا تایید حساب خودتان را تغییر دهید')
    ).toBeTruthy())
    expect(state.updated).toHaveLength(0)
  })

  it('still allows another admin changing a different user role', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    const otherRole = await screen.findByLabelText('نقش Member')
    fireEvent.change(otherRole, { target: { value: 'admin' } })
    await waitFor(() => expect(state.updated).toEqual([{ role: 'admin' }]))
  })

  it('allows admin editing own weight', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    ui()
    const ownWeight = await screen.findByLabelText('وزن Admin')
    fireEvent.change(ownWeight, { target: { value: '85' } })
    fireEvent.blur(ownWeight)
    await waitFor(() => expect(state.updated).toEqual([{ weight_kg: 85 }]))
  })
})

describe('Users inline edit — error handling', () => {
  it('shows a Persian error and refreshes local state when update fails', async () => {
    mockAuth.profile = { id: 'a1', role: 'admin' }
    state.updateErr = { message: 'nope' }
    ui()
    const otherRole = await screen.findByLabelText('نقش Member')
    fireEvent.change(otherRole, { target: { value: 'admin' } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('ذخیره'))
    // refresh local list from server so controlled inputs never desync
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('profiles'))
    expect(mockAuth.refresh).not.toHaveBeenCalled()
  })
})
