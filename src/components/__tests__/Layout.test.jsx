import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

const auth = vi.hoisted(() => ({
  session: null, profile: null, loading: false,
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), refresh: vi.fn(), updateTheme: vi.fn(),
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
  auth.updateTheme.mockReset()
})

describe('Layout', () => {
  it('renders a single-row header with brand, nav links and the user chip', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'sadeq', approved: true }
    render(<MemoryRouter><Layout><div>content</div></Layout></MemoryRouter>)
    expect(screen.getByText('GYMBook')).toBeTruthy()
    expect(screen.getByText('Ali')).toBeTruthy()
    expect(screen.getByText('امروز')).toBeTruthy()
    expect(screen.getByText('گزارش')).toBeTruthy()
    expect(screen.getByText('content')).toBeTruthy()
    // profile & sign-out are NOT shown as separate top-level nav items
    expect(screen.queryByText('پروفایل')).toBeNull()
    expect(screen.queryByText('خروج')).toBeNull()
  })

  it('opens the user menu on click, revealing profile link and sign-out', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'sadeq', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Ali/ }))
    expect(screen.getByText('پروفایل')).toBeTruthy()
    fireEvent.click(screen.getByText('خروج'))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('does not show admin link for member', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'sadeq', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(screen.queryByText('پنل ادمین')).toBeNull()
  })

  it('shows admin link when role is admin', () => {
    auth.profile = { id: 'u1', name: 'Root', role: 'admin', theme: 'sadeq', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(screen.getByText('پنل ادمین')).toBeTruthy()
  })

  it('offers all six themes in the menu and calls updateTheme on select', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'sadeq', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Ali/ }))
    for (const label of ['آبی', 'صورتی', 'مشکی', 'قرمز', 'بنفش', 'سبز']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    fireEvent.click(screen.getByText('قرمز'))
    expect(auth.updateTheme).toHaveBeenCalledWith('red')
  })

  it('sets body.dataset.theme from a known profile theme', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'saghar', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(document.body.dataset.theme).toBe('saghar')
  })

  it('applies a newly added theme key', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'green', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(document.body.dataset.theme).toBe('green')
  })

  it('falls back to "sadeq" for unknown or missing theme', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'neon', approved: true }
    const { unmount } = render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(document.body.dataset.theme).toBe('sadeq')
    unmount()
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    expect(document.body.dataset.theme).toBe('sadeq')
  })

  it('links to the legacy simple version', () => {
    auth.profile = { id: 'u1', name: 'Ali', role: 'member', theme: 'sadeq', approved: true }
    render(<MemoryRouter><Layout><div>c</div></Layout></MemoryRouter>)
    const link = screen.getByText('نسخه ساده قدیمی')
    expect(link.getAttribute('href')).toBe('/GYMBook/legacy.html')
  })
})
