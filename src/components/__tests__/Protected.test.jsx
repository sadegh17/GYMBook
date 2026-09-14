import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'

const auth = vi.hoisted(() => ({
  session: null, profile: null, loading: false,
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), refresh: vi.fn(),
}))

vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => auth }))

import Protected from '../Protected.jsx'

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/secret" element={<Protected><div>secret-content</div></Protected>} />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  auth.session = null
  auth.profile = null
  auth.loading = false
  auth.signIn.mockReset()
  auth.signUp.mockReset()
  auth.signOut.mockReset()
  auth.refresh.mockReset()
})

describe('Protected', () => {
  it('shows a spinner while loading', () => {
    auth.loading = true
    renderAt()
    expect(screen.queryByText('secret-content')).toBeNull()
    expect(screen.getByText(/در حال بارگذاری/)).toBeTruthy()
  })

  it('redirects to /login when there is no session', () => {
    renderAt()
    expect(screen.getByText('login-page')).toBeTruthy()
    expect(screen.queryByText('secret-content')).toBeNull()
  })

  it('waits and retries when session exists but profile is missing (trigger lag)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    auth.session = { user: { id: 'u1' } }
    auth.profile = null
    auth.loading = false
    renderAt()
    expect(screen.queryByText('secret-content')).toBeNull()
    expect(screen.queryByText('login-page')).toBeNull()
    await vi.advanceTimersByTimeAsync(2000)
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('stops retrying once the profile arrives', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    auth.session = { user: { id: 'u1' } }
    auth.profile = null
    auth.loading = false
    const { rerender } = renderAt()
    await vi.advanceTimersByTimeAsync(2000)
    auth.profile = { id: 'u1', role: 'member', approved: true }
    rerender(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/secret" element={<Protected><div>secret-content</div></Protected>} />
        </Routes>
      </MemoryRouter>
    )
    await vi.advanceTimersByTimeAsync(4000)
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByText('secret-content')).toBeTruthy()
    vi.useRealTimers()
  })

  it('shows pending-approval screen with sign-out when not approved', () => {
    auth.session = { user: { id: 'u1' } }
    auth.profile = { id: 'u1', role: 'member', approved: false }
    renderAt()
    expect(screen.getByText('در انتظار تایید ادمین')).toBeTruthy()
    expect(screen.queryByText('secret-content')).toBeNull()
    fireEvent.click(screen.getByText('خروج'))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('renders children when session + approved profile', () => {
    auth.session = { user: { id: 'u1' } }
    auth.profile = { id: 'u1', role: 'member', approved: true }
    renderAt()
    expect(screen.getByText('secret-content')).toBeTruthy()
  })
})
