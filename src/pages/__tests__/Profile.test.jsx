import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('Profile UX redesign', () => {
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
    eqMock.mockResolvedValue({ error: null })
  })
  afterEach(() => { vi.useRealTimers() })

  it('disables profile save until something changes', async () => {
    renderProfile()
    const btn = await screen.findByText('ذخیره پروفایل')
    expect(btn.disabled).toBe(true)
  })

  it('enables profile save after editing name', async () => {
    renderProfile()
    fireEvent.change(await screen.findByLabelText('نام'), { target: { value: 'X' } })
    expect(screen.getByText('ذخیره پروفایل').disabled).toBe(false)
  })

  it('shows name-required error when submitting blank name', async () => {
    renderProfile()
    fireEvent.change(await screen.findByLabelText('نام'), { target: { value: '' } })
    fireEvent.click(screen.getByText('ذخیره پروفایل'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('نام')
    })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('links weight error to input via aria-invalid and aria-describedby', async () => {
    renderProfile()
    fireEvent.change(await screen.findByLabelText('وزن (کیلوگرم)'), { target: { value: '15' } })
    fireEvent.click(screen.getByText('ذخیره پروفایل'))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    const input = screen.getByLabelText('وزن (کیلوگرم)')
    const alert = screen.getByRole('alert')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(alert.id).toBeTruthy()
    expect(input.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('weight input uses inputmode decimal', async () => {
    renderProfile()
    const input = await screen.findByLabelText('وزن (کیلوگرم)')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('password fields use new-password autocomplete', async () => {
    renderProfile()
    const pw1 = await screen.findByLabelText('رمز عبور جدید')
    const pw2 = screen.getByLabelText('تکرار رمز عبور')
    expect(pw1.getAttribute('autocomplete')).toBe('new-password')
    expect(pw2.getAttribute('autocomplete')).toBe('new-password')
  })

  it('disables password save until both fields are filled', async () => {
    renderProfile()
    const btn = await screen.findByText('تغییر رمز')
    expect(btn.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('رمز عبور جدید'), { target: { value: 'aaaaaaaa' } })
    expect(screen.getByText('تغییر رمز').disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('تکرار رمز عبور'), { target: { value: 'aaaaaaaa' } })
    expect(screen.getByText('تغییر رمز').disabled).toBe(false)
  })

  it('shows live match indicator when both passwords are equal and long enough', async () => {
    renderProfile()
    fireEvent.change(await screen.findByLabelText('رمز عبور جدید'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('تکرار رمز عبور'), { target: { value: 'secret123' } })
    expect(screen.getByText('✓ یکسان')).toBeTruthy()
  })

  it('shows live mismatch indicator while typing', async () => {
    renderProfile()
    fireEvent.change(await screen.findByLabelText('رمز عبور جدید'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('تکرار رمز عبور'), { target: { value: 'secret124' } })
    expect(screen.getByText('✗ یکسان نیست')).toBeTruthy()
  })

  it('shows busy state while saving then returns to normal', async () => {
    let resolveSave
    eqMock.mockImplementationOnce(() => new Promise((r) => { resolveSave = r }))
    renderProfile()
    fireEvent.change(await screen.findByLabelText('نام'), { target: { value: 'Other' } })
    fireEvent.click(screen.getByText('ذخیره پروفایل'))
    await waitFor(() => expect(screen.getByText('در حال ذخیره…')).toBeTruthy())
    expect(screen.getByText('در حال ذخیره…').disabled).toBe(true)
    resolveSave({ error: null })
    await waitFor(() => expect(screen.getByText('پروفایل ذخیره شد')).toBeTruthy())
  })

  it('auto-hides success message after 4 seconds', async () => {
    vi.useFakeTimers()
    renderProfile()
    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'Changed' } })
    fireEvent.click(screen.getByText('ذخیره پروفایل'))
    await act(async () => {})
    expect(screen.getByText('پروفایل ذخیره شد')).toBeTruthy()
    await act(async () => { vi.advanceTimersByTime(4100) })
    expect(screen.queryByText('پروفایل ذخیره شد')).toBeNull()
  })
})