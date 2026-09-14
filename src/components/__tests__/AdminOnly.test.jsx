import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react'

const auth = vi.hoisted(() => ({
  session: null, profile: null, loading: false,
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), refresh: vi.fn(),
}))

vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => auth }))

import AdminOnly from '../AdminOnly.jsx'

beforeEach(() => {
  auth.session = null
  auth.profile = null
  auth.loading = false
  auth.signIn.mockReset()
  auth.signUp.mockReset()
  auth.signOut.mockReset()
  auth.refresh.mockReset()
})

describe('AdminOnly', () => {
  it('redirects to / when profile is missing or not admin', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/admin/*" element={<AdminOnly><div>admin-content</div></AdminOnly>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('home')).toBeTruthy()
    expect(screen.queryByText('admin-content')).toBeNull()
  })

  it('redirects to / when role is member', () => {
    auth.session = { user: { id: 'u1' } }
    auth.profile = { id: 'u1', role: 'member', approved: true }
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/admin/*" element={<AdminOnly><div>admin-content</div></AdminOnly>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('home')).toBeTruthy()
    expect(screen.queryByText('admin-content')).toBeNull()
  })

  it('renders children when profile.role === admin', () => {
    auth.session = { user: { id: 'u1' } }
    auth.profile = { id: 'u1', role: 'admin', approved: true }
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/admin/*" element={<AdminOnly><div>admin-content</div></AdminOnly>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('admin-content')).toBeTruthy()
    expect(screen.queryByText('home')).toBeNull()
  })
})