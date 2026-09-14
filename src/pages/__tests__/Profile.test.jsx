import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import Profile, { validateWeight } from '../Profile.jsx'

const mockAuth = vi.hoisted(() => ({
  profile: { id: 'user1', name: 'Test User', weight_kg: 70 },
  refresh: vi.fn(),
}))
vi.mock('../../lib/auth.jsx', () => ({ useAuth: () => mockAuth }))

const eqMock = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const updateMock = vi.hoisted(() => vi.fn().mockReturnValue({ eq: eqMock }))
const fromMock = vi.hoisted(() => vi.fn().mockReturnValue({ update: updateMock }))
const updateUserMock = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: fromMock,
    auth: { updateUser: updateUserMock },
  },
}))

describe('validateWeight', () => {
  it('returns null for in-range values', () => {
    expect(validateWeight('20')).toBeNull()
    expect(validateWeight('250')).toBeNull()
    expect(validateWeight('100')).toBeNull()
    expect(validateWeight('50.5')).toBeNull()
  })
  it('returns Persian error for out-of-range low', () => {
    expect(validateWeight('19')).toContain('وزن')
    expect(validateWeight('0')).toContain('وزن')
    expect(validateWeight('-5')).toContain('وزن')
  })
  it('returns Persian error for out-of-range high', () => {
    expect(validateWeight('251')).toContain('وزن')
    expect(validateWeight('300')).toContain('وزن')
    expect(validateWeight('1000')).toContain('وزن')
  })
  it('returns Persian error for non-numeric', () => {
    expect(validateWeight('abc')).toContain('وزن')
    expect(validateWeight('')).toContain('وزن')
    expect(validateWeight('20a')).toContain('وزن')
  })
})

describe('Profile component', () => {
  const renderProfile = () => {
    const qc = new QueryClient()
    return render(
      <QueryClientProvider client={qc}>
        <Profile />
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    fromMock.mockClear()
    updateMock.mockClear()
    eqMock.mockClear()
    updateUserMock.mockClear()
    mockAuth.refresh.mockClear()
  })

  it('renders both forms', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByText('پروفایل')).toBeTruthy())
    expect(screen.getByText('تغییر رمز عبور')).toBeTruthy()
  })

  it('shows current name and weight in inputs', async () => {
    renderProfile()
    await waitFor(() => {
      expect(screen.getByLabelText('نام').value).toBe('Test User')
      expect(screen.getByLabelText('وزن (کیلوگرم)').value).toBe('70')
    })
  })

  it('updates profile with valid weight and name', async () => {
    renderProfile()
    const nameInput = await screen.findByLabelText('نام')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    const weightInput = screen.getByLabelText('وزن (کیلوگرم)')
    fireEvent.change(weightInput, { target: { value: '75.5' } })

    await act(async () => {
      fireEvent.click(screen.getByText('ذخیره پروفایل'))
    })

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('profiles')
      expect(updateMock).toHaveBeenCalledWith({ name: 'New Name', weight_kg: 75.5 })
      expect(eqMock).toHaveBeenCalledWith('id', 'user1')
    })
    expect(mockAuth.refresh).toHaveBeenCalled()
  })

  it('shows Persian weight error for invalid weight', async () => {
    renderProfile()
    const weightInput = await screen.findByLabelText('وزن (کیلوگرم)')
    fireEvent.change(weightInput, { target: { value: '15' } })

    await act(async () => {
      fireEvent.click(screen.getByText('ذخیره پروفایل'))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('وزن')
    })
  })

  it('updates password when valid', async () => {
    renderProfile()
    const pw1 = await screen.findByLabelText('رمز عبور جدید')
    const pw2 = screen.getByLabelText('تکرار رمز عبور')
    fireEvent.change(pw1, { target: { value: 'newpassword123' } })
    fireEvent.change(pw2, { target: { value: 'newpassword123' } })

    await act(async () => {
      fireEvent.click(screen.getByText('تغییر رمز'))
    })

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: 'newpassword123' })
    })
    expect(screen.getByRole('status').textContent).toContain('رمز عبور تغییر کرد')
  })

  it('shows Persian password error when too short', async () => {
    renderProfile()
    const pw1 = await screen.findByLabelText('رمز عبور جدید')
    const pw2 = screen.getByLabelText('تکرار رمز عبور')
    fireEvent.change(pw1, { target: { value: '123' } })
    fireEvent.change(pw2, { target: { value: '123' } })

    await act(async () => {
      fireEvent.click(screen.getByText('تغییر رمز'))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('۸')
    })
  })

  it('shows Persian password error when mismatch', async () => {
    renderProfile()
    const pw1 = await screen.findByLabelText('رمز عبور جدید')
    const pw2 = screen.getByLabelText('تکرار رمز عبور')
    fireEvent.change(pw1, { target: { value: 'password1' } })
    fireEvent.change(pw2, { target: { value: 'password2' } })

    await act(async () => {
      fireEvent.click(screen.getByText('تغییر رمز'))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('یکسان نیست')
    })
  })
})