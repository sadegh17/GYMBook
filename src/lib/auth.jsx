import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

const LOOKUP_TRIES = 3
const LOOKUP_DELAY_MS = 400

async function readStatus(id) {
  for (let i = 0; i < LOOKUP_TRIES; i++) {
    const { data } = await supabase.from('profiles').select('status, approved').eq('id', id).maybeSingle()
    if (data) return data
    if (i < LOOKUP_TRIES - 1) await new Promise((res) => setTimeout(res, LOOKUP_DELAY_MS))
  }
  return null
}

function mapSignUpError(err) {
  const msg = String(err?.message ?? err ?? '')
  if (/already registered|already exists/i.test(msg)) return 'این ایمیل قبلاً ثبت شده است؛ وارد شوید'
  if (/password.*(at least|weak|short)/i.test(msg)) return 'رمز عبور باید حداقل ۸ کاراکتر باشد'
  return 'خطا در ثبت‌نام — لطفاً دوباره تلاش کنید'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let stop = false
    if (!session?.user) { setProfile(null); setLoading(false); return }
    setLoading(true)
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (!stop) { setProfile(data ?? null); setLoading(false) } })
    return () => { stop = true }
  }, [session, attempt])

  const refresh = useCallback(() => setAttempt((a) => a + 1), [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (/email not confirmed/i.test(error.message)) return { error: 'EMAIL_NOT_CONFIRMED' }
      return { error: 'INVALID_CREDENTIALS' }
    }
    const uid = data.session?.user?.id
    if (!uid) return { error: 'EMAIL_NOT_CONFIRMED' }
    const prof = await readStatus(uid)
    if (prof?.status === 'rejected') {
      await supabase.auth.signOut()
      return { error: 'REJECTED' }
    }
    if (!prof || prof.status === 'pending' || prof.approved === false) {
      await supabase.auth.signOut()
      return { error: 'NOT_APPROVED' }
    }
    return { ok: true }
  }

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) return { error: mapSignUpError(error) }
    const prof = await readStatus(data.user?.id)
    const status = prof?.approved ? 'approved' : (prof?.status ?? 'pending')
    if (status !== 'approved') await supabase.auth.signOut()
    return { ok: true, status }
  }

  const signOut = () => supabase.auth.signOut()

  const updateTheme = async (theme) => {
    if (!session?.user) return
    const { error } = await supabase.from('profiles').update({ theme }).eq('id', session.user.id)
    if (error) return
    setProfile((p) => (p ? { ...p, theme } : p))
  }

  return <Ctx.Provider value={{ session, profile, loading, signIn, signUp, signOut, refresh, updateTheme }}>{children}</Ctx.Provider>
}
