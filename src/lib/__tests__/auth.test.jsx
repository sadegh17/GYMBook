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
  update: vi.fn(),
  eqUpdate: vi.fn(),
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
      <span data-testid="theme">{ctx.profile ? ctx.profile.theme : 'none'}</span>
    </div>
  )
}

beforeEach(async () => {
  vi.resetModules()
  Object.values(mocks).forEach((fn) => fn && fn.mockReset && fn.mockReset())
  mocks.getSession.mockResolvedValue({ data: { session: null } })
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle })
  mocks.select.mockReturnValue({ eq: mocks.eq })
  mocks.eqUpdate.mockResolvedValue({ error: null })
  mocks.update.mockReturnValue({ eq: mocks.eqUpdate })
  mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update })
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
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mocks.maybeSingle.mockResolvedValue({ data: { status: 'approved', approved: true }, error: null })
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

  it('updateTheme persists to profiles and updates local profile immediately', async () => {
    const session = { user: { id: 'u1' } }
    mocks.getSession.mockResolvedValue({ data: { session } })
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'u1', role: 'member', theme: 'sadeq' } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('theme').textContent).toBe('sadeq'))
    await act(async () => { await screen.findByTestId('loading') })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    await act(async () => { await ctx.updateTheme('red') })
    expect(mocks.update).toHaveBeenCalledWith({ theme: 'red' })
    expect(mocks.eqUpdate).toHaveBeenCalledWith('id', 'u1')
  })

  it('keeps loading true until getSession resolves (no premature redirect)', async () => {
    let resolve
    mocks.getSession.mockReturnValue(new Promise((res) => { resolve = res }))
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ select: mocks.select })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('loading').textContent).toBe('true')
    await act(async () => { resolve({ data: { session: { user: { id: 'u1' } } } }) })
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
  })

  it('updateTheme does nothing without a session', async () => {
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    await act(async () => { await ctx.updateTheme('red') })
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('AuthContext — login gating', () => {
  it('signs out and reports NOT_APPROVED for a pending member', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mocks.maybeSingle.mockResolvedValue({ data: { status: 'pending', approved: false }, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signIn('a@b.c', 'pw') })
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ error: 'NOT_APPROVED' })
  })

  it('signs out and reports REJECTED for a rejected member', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mocks.maybeSingle.mockResolvedValue({ data: { status: 'rejected', approved: false }, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signIn('a@b.c', 'pw') })
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ error: 'REJECTED' })
  })

  it('returns ok for an approved member without signing out', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mocks.maybeSingle.mockResolvedValue({ data: { status: 'approved', approved: true }, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signIn('a@b.c', 'pw') })
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: true })
  })

  it('reports EMAIL_NOT_CONFIRMED without signing out', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'Email not confirmed' } })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signIn('a@b.c', 'pw') })
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(res).toEqual({ error: 'EMAIL_NOT_CONFIRMED' })
  })

  it('reports INVALID_CREDENTIALS on bad password', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signIn('a@b.c', 'pw') })
    expect(res).toEqual({ error: 'INVALID_CREDENTIALS' })
  })
})

describe('AuthContext — signup gating', () => {
  it('signs out after signup for a pending member and reports pending', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } }, error: null })
    mocks.maybeSingle.mockResolvedValue({ data: { status: 'pending', approved: false }, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signUp('a@b.c', 'pw', 'Ali') })
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.signUp).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw', options: { data: { name: 'Ali' } } })
    expect(res).toEqual({ ok: true, status: 'pending' })
  })

  it('keeps the session for the first approved admin and reports approved', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } }, error: null })
    mocks.maybeSingle.mockResolvedValue({ data: { status: 'approved', approved: true }, error: null })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signUp('a@b.c', 'pw', 'Root') })
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: true, status: 'approved' })
  })

  it('maps signup errors to a Persian message', async () => {
    mocks.signUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } })
    let ctx
    const Grab = () => { ctx = useAuth(); return null }
    render(<AuthProvider><Grab /></AuthProvider>)
    await waitFor(() => expect(ctx.loading).toBe(false))
    let res
    await act(async () => { res = await ctx.signUp('a@b.c', 'pw', 'Ali') })
    expect(res.error).toMatch(/ثبت شده/)
  })
})
