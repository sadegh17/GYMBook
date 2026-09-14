import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  order: [],
  savedSession: { access_token: 'admin-access', refresh_token: 'admin-refresh' },
  signUpRes: { data: { user: { id: 'new1' } }, error: null },
  lookups: [],
  updateRes: { error: null },
  updateArgs: null,
  updateEq: null,
}))

vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => {
        m.order.push('getSession')
        return { data: { session: m.savedSession } }
      }),
      signUp: vi.fn(async (args) => {
        m.order.push('signUp')
        m.signUpArgs = args
        return m.signUpRes
      }),
      signOut: vi.fn(async () => {
        m.order.push('signOut')
        return { error: null }
      }),
      setSession: vi.fn(async (tokens) => {
        m.order.push('setSession')
        m.setSessionArgs = tokens
        return { data: { session: m.savedSession }, error: null }
      }),
    },
    from: vi.fn((table) => {
      if (table !== 'profiles') throw new Error('unexpected table ' + table)
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              m.order.push('lookup')
              return m.lookups.length ? m.lookups.shift() : { data: { id: 'new1' }, error: null }
            },
          }),
        }),
        update: (args) => {
          m.updateArgs = args
          return {
            eq: async (col, val) => {
              m.order.push('update')
              m.updateEq = [col, val]
              return m.updateRes
            },
          }
        },
      }
    }),
  },
}))

import { supabase } from '../supabase.js'
import { createUserWithRestore, createUserErrorFa, setMemberStatus } from '../adminUsers.js'

const input = {
  email: 'new@gym.test',
  password: 'temp12345',
  name: 'New User',
  role: 'member',
  weightKg: 70,
  theme: 'sadeq',
  programId: 'p1',
}

beforeEach(() => {
  m.order = []
  m.savedSession = { access_token: 'admin-access', refresh_token: 'admin-refresh' }
  m.signUpRes = { data: { user: { id: 'new1' } }, error: null }
  m.lookups = []
  m.updateRes = { error: null }
  m.updateArgs = null
  m.updateEq = null
  m.signUpArgs = null
  m.setSessionArgs = null
  vi.clearAllMocks()
})

describe('createUserWithRestore', () => {
  it('reads the admin session (getSession) BEFORE signUp so saved tokens exist first', async () => {
    await createUserWithRestore(input)
    expect(m.order.indexOf('getSession')).toBeGreaterThanOrEqual(0)
    expect(m.order.indexOf('getSession')).toBeLessThan(m.order.indexOf('signUp'))
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
  })

  it('calls signUp then signOut then setSession(savedTokens) in that order', async () => {
    await createUserWithRestore(input)
    const iUp = m.order.indexOf('signUp')
    const iOut = m.order.indexOf('signOut')
    const iSet = m.order.indexOf('setSession')
    expect(iUp).toBeGreaterThanOrEqual(0)
    expect(iOut).toBeGreaterThan(iUp)
    expect(iSet).toBeGreaterThan(iOut)
    expect(m.setSessionArgs).toEqual({
      access_token: 'admin-access',
      refresh_token: 'admin-refresh',
    })
    expect(supabase.auth.setSession).toHaveBeenCalledTimes(1)
  })

  it('completes the new profile as admin after restoring the session', async () => {
    await createUserWithRestore(input)
    expect(m.order.indexOf('lookup')).toBeGreaterThan(m.order.indexOf('setSession'))
    expect(m.updateArgs).toEqual({
      approved: true, status: 'approved', role: 'member', weight_kg: 70, theme: 'sadeq', program_id: 'p1',
    })
    expect(m.updateEq).toEqual(['id', 'new1'])
  })

  it('still restores the admin session when signUp fails', async () => {
    m.signUpRes = { data: {}, error: { message: 'User already registered' } }
    await expect(createUserWithRestore(input)).rejects.toThrow()
    expect(m.order).toContain('signOut')
    expect(m.order.indexOf('setSession')).toBeGreaterThan(m.order.indexOf('signUp'))
    expect(m.setSessionArgs).toEqual({
      access_token: 'admin-access',
      refresh_token: 'admin-refresh',
    })
  })

  it('retries profile lookup then surfaces an error with admin session already restored', async () => {
    m.lookups = [
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]
    await expect(createUserWithRestore(input)).rejects.toThrow('profile-not-found')
    expect(m.order.filter((c) => c === 'lookup').length).toBe(3)
    expect(m.order.indexOf('setSession')).toBeLessThan(m.order.indexOf('lookup'))
  })
})

describe('createUserErrorFa', () => {
  it('maps duplicate email to Persian', () => {
    expect(createUserErrorFa({ message: 'User already registered' })).toContain('قبلاً ثبت')
  })
  it('maps weak password to Persian', () => {
    expect(createUserErrorFa({ message: 'Password should be at least 6 characters' })).toContain('۸ کاراکتر')
  })
})

describe('setMemberStatus', () => {
  it('approving sets status=approved and approved=true', async () => {
    await setMemberStatus('u1', 'approved')
    expect(m.updateArgs).toEqual({ status: 'approved', approved: true })
    expect(m.updateEq).toEqual(['id', 'u1'])
  })

  it('rejecting sets status=rejected and approved=false', async () => {
    await setMemberStatus('u1', 'rejected')
    expect(m.updateArgs).toEqual({ status: 'rejected', approved: false })
    expect(m.updateEq).toEqual(['id', 'u1'])
  })

  it('throws when the update fails', async () => {
    m.updateRes = { error: { message: 'nope' } }
    await expect(setMemberStatus('u1', 'approved')).rejects.toThrow()
  })
})
