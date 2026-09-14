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
  it('shows login and register tabs (no setup tab) when setup_needed is false', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    expect(screen.getByText('ثبت‌نام')).toBeTruthy()
    expect(screen.queryByText('ساخت اکانت ادمین اولیه')).toBeNull()
  })

  it('exposes the initial-admin tab when setup_needed is true', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByText('ساخت اکانت ادمین اولیه')).toBeTruthy())
  })

  it('navigates to / on successful sign-in', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    auth.signIn.mockResolvedValue({ ok: true })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'a@b.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }))
    })
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy())
    expect(auth.signIn).toHaveBeenCalledWith('a@b.c', 'secret')
  })

  it('shows a credential error when sign-in fails', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    auth.signIn.mockResolvedValue({ error: 'INVALID_CREDENTIALS' })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'a@b.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }))
    })
    await waitFor(() => expect(screen.getByText('ایمیل یا رمز عبور اشتباه است')).toBeTruthy())
    expect(screen.queryByText('home')).toBeNull()
  })

  it('shows a not-approved message when sign-in is blocked pending admin approval', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    auth.signIn.mockResolvedValue({ error: 'NOT_APPROVED' })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('ایمیل')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'a@b.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }))
    })
    await waitFor(() => expect(screen.getByText(/تایید نشده/)).toBeTruthy())
    expect(screen.queryByText('home')).toBeNull()
  })

  it('creates an account via register and returns to login with a pending notice', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    auth.signUp.mockResolvedValue({ ok: true, status: 'pending' })
    renderLogin()
    await waitFor(() => expect(screen.getByText('ثبت‌نام')).toBeTruthy())
    fireEvent.click(screen.getByText('ثبت‌نام'))
    fireEvent.change(screen.getByPlaceholderText('نام'), { target: { value: 'Ali' } })
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'ali@g.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'pw123456' } })
    fireEvent.change(screen.getByPlaceholderText('تکرار رمز عبور'), { target: { value: 'pw123456' } })
    await act(async () => {
      fireEvent.click(screen.getByText('ساخت حساب'))
    })
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith('ali@g.c', 'pw123456', 'Ali'))
    expect(screen.getByText(/پس از تأیید ادمین/)).toBeTruthy()
    expect(screen.queryByText('home')).toBeNull()
  })

  it('rejects register when passwords do not match, without calling signUp', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    renderLogin()
    await waitFor(() => expect(screen.getByText('ثبت‌نام')).toBeTruthy())
    fireEvent.click(screen.getByText('ثبت‌نام'))
    fireEvent.change(screen.getByPlaceholderText('نام'), { target: { value: 'Ali' } })
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'ali@g.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'pw123456' } })
    fireEvent.change(screen.getByPlaceholderText('تکرار رمز عبور'), { target: { value: 'other' } })
    await act(async () => {
      fireEvent.click(screen.getByText('ساخت حساب'))
    })
    await waitFor(() => expect(screen.getByText('رمز عبور و تکرار آن یکسان نیستند')).toBeTruthy())
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('creates the first admin via setup tab and navigates to /', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    auth.signUp.mockResolvedValue({ ok: true, status: 'approved' })
    renderLogin()
    await waitFor(() => expect(screen.getByText('ساخت اکانت ادمین اولیه')).toBeTruthy())
    fireEvent.click(screen.getByText('ساخت اکانت ادمین اولیه'))
    fireEvent.change(screen.getByPlaceholderText('نام'), { target: { value: 'Root' } })
    fireEvent.change(screen.getByPlaceholderText('ایمیل'), { target: { value: 'admin@g.c' } })
    fireEvent.change(screen.getByPlaceholderText('رمز عبور'), { target: { value: 'pw123456' } })
    await act(async () => {
      fireEvent.click(screen.getByText('ساخت اکانت'))
    })
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy())
    expect(auth.signUp).toHaveBeenCalledWith('admin@g.c', 'pw123456', 'Root')
  })
})
