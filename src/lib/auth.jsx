import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

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
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } })
  const signOut = () => supabase.auth.signOut()

  return <Ctx.Provider value={{ session, profile, loading, signIn, signUp, signOut, refresh }}>{children}</Ctx.Provider>
}