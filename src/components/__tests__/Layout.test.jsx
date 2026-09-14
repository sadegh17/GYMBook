import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

const auth = vi.hoisted(() => ({
  session: null, profile: null, loading: false,
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), refresh: vi.fn(),
}))

vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => auth }))

import Layout from '../Layout.jsx'

beforeEach(() => {
  auth.session = null
  auth.profile = null
  auth.loading = false
  auth.signIn.mockReset()
  auth.signUp.mockReset()
  auth.signOut.mockReset()
  auth.refresh.mockReset()
})

describe('Layout', () => {
  it('renders user name and main nav links for a member', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'dark', approved: true }
    render(<MemoryRouter><Layout><div>content</div></Layout></MemoryRouter>)
    expect(screen.getByText('Ali')).toBeTruthy()
    expect(screen.getByText('امروز')).toBeTruthy()
    expect(screen.getByText('گزارش')).toBeTruthy()
    expect(screen.getByText('پروفایل')).toBeTruthy()
    expect(screen.getByText('content')).toBeTruthy()
  })

  it('does not show admin link for member', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'dark', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(screen.queryByText('پنل ادمین')).toBeNull()
  })

  it('shows admin link when role is admin', () => {
    auth.profile = { id: 'u1', name: 'Root', role: 'admin', theme: 'light', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(screen.getByText('پنل ادمین')).toBeTruthy()
  })

  it('sets body.dataset.theme from profile.theme', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'light', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(document.body.dataset.theme).toBe('light')
  })

  it('has a sign-out button that calls signOut', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'dark', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    fireEvent.click(screen.getByText('خروج'))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })
})
