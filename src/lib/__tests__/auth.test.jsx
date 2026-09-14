import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}))

let AuthProvider
let useAuth

function Probe() {
  const ctx = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="session">{ctx.session ? ctx.session.user.id : 'none'}</span>
      <span data-testid="profile">{ctx.profile ? ctx.profile.role : 'none'}</span>
    </div>
  )
}

beforeEach(async () => {
  vi.resetModules()
  Object.values(mocks).forEach((fn) => fn && fn.mockReset && fn.mockReset())
  mocks.getSession.mockResolvedValue({ data: { session: null } })
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  mocks.maybeSingle.mockResolvedValue({ data: null })
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle })
  mocks.select.mockReturnValue({ eq: mocks.eq })
  mocks.from.mockReturnValue({ select: mocks.select })
  const mod = await import('../auth.jsx')
  AuthProvider = mod.AuthProvider
  useAuth = mod.useAuth
})

describe('AuthContext', () => {
  it('starts with no session and stops loading', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('session').textContent).toBe('none')
    expect(screen.getByTestId('profile').textContent).toBe('none')
  })

  it('fetches profile with select(*) when session exists', async () => {
    const session = { user: { id: 'u1' } }
    mocks.getSession.mockResolvedValue({ data: { session } })
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'u1', role: 'admin', approved: true } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('profile').textContent).toBe('admin'))
    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(mocks.select).toHaveBeenCalledWith('*')
    expect(mocks.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('signIn delegates to supabase.auth.signInWithPassword', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    await act(async () => {
      await ctx.signIn('a@b.c', 'secret')
    })
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret' })
  })

  it('signUp passes name via options.data', async () => {
    mocks.signUp.mockResolvedValue({ data: {}, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    await act(async () => {
      await ctx.signUp('n@e.c', 'pw1234', 'ali')
    })
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'n@e.c', password: 'pw1234', options: { data: { name: 'ali' } },
    })
  })

  it('signOut delegates to supabase.auth.signOut', async () => {
    mocks.signOut.mockResolvedValue({ error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    await act(async () => {
      await ctx.signOut()
    })
    expect(mocks.signOut).toHaveBeenCalled()
  })
})
