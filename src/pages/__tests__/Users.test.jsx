import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Users from '../admin/Users.jsx'

const mockAuth = vi.hoisted(() => ({ profile: null, refresh: vi.fn() }))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

vi.mock('../../lib/supabase.js', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), setSession: vi.fn() } },
}))

const ui = () => render(<QueryClientProvider client={new QueryClient()}><Users /></QueryClientProvider>)

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
