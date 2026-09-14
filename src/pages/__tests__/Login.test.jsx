import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'

const auth = vi.hoisted(() => ({
  session: null, profile: null, loading: false,
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), refresh: vi.fn(),
}))
const rpc = vi.hoisted(() => vi.fn())

vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => auth }))
vi.mock('../../lib/supabase.js', () => ({
  supabase: { rpc },
}))

import Login from '../Login.jsx'

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>home</div>} />
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
  rpc.mockReset()
})

describe('Login', () => {
  it('shows only the login form when setup_needed is false', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    expect(screen.queryByText('ساخت اکانت ادمین اولیه')).toBeNull()
  })

  it('exposes the initial-admin tab when setup_needed is true', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByText('ساخت اکانت ادمین اولیه')).toBeTruthy())
  })

  it('navigates to / on successful sign-in', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    auth.signIn.mockResolvedValue({ data: { session: {} }, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'a@b.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByText('ورود'))
    })
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy())
    expect(auth.signIn).toHaveBeenCalledWith('a@b.c', 'secret')
  })

  it('shows a Persian error when sign-in fails', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    auth.signIn.mockResolvedValue({ data: { session: null }, error: { message: 'bad' } })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'a@b.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByText('ورود'))
    })
    await waitFor(() => expect(screen.getByText('ایمیل یا رمز عبور اشتباه است')).toBeTruthy())
    expect(screen.queryByText('home')).toBeNull()
  })

  it('creates the first admin via sign-up and navigates to /', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    auth.signUp.mockResolvedValue({ data: { user: {}, session: {} }, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByText('ساخت اکانت ادمین اولیه')).toBeTruthy())
    fireEvent.click(screen.getByText('ساخت اکانت ادمین اولیه'))
    fireEvent.change(screen.getByPlaceholderText('نام'), { target: { value: 'Root' } })
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'admin@g.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'pw12345' } })
    await act(async () => {
      fireEvent.click(screen.getByText('ساخت اکانت'))
    })
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy())
    expect(auth.signUp).toHaveBeenCalledWith('admin@g.c', 'pw12345', 'Root')
  })
})
