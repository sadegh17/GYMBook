import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [tab, setTab] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let stop = false
    supabase.rpc('setup_needed')
      .then(({ data }) => { if (!stop) { setSetupNeeded(!!data); setReady(true) } })
      .catch(() => { if (!stop) setReady(true) })
    return () => { stop = true }
  }, [])

  if (!ready) return <div className="center muted" role="status">در حال بارگذاری…</div>

  const submitLogin = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error: err } = await signIn(email, password)
    setBusy(false)
    if (err) { setError('ایمیل یا رمز عبور اشتباه است'); return }
    navigate('/')
  }

  const submitSetup = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error: err } = await signUp(email, password, name)
    setBusy(false)
    if (err) { setError('خطا در ساخت اکانت ادمین'); return }
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 className="brand-title">GYMBook</h1>
        {setupNeeded && (
          <div className="tabs">
            <button type="button" className={tab === 'login' ? 'tab active' : 'tab'} onClick={() => { setTab('login'); setError('') }}>ورود</button>
            <button type="button" className={tab === 'setup' ? 'tab active' : 'tab'} onClick={() => { setTab('setup'); setError('') }}>ساخت اکانت ادمین اولیه</button>
          </div>
        )}
        {tab === 'setup' ? (
          <form onSubmit={submitSetup}>
            <label>نام
              <input type="text" placeholder="نام" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>ایمیل
              <input type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>رمز عبور
              <input type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="err" role="alert">{error}</p>}
            <button type="submit" className="btn primary" disabled={busy}>ساخت اکانت</button>
          </form>
        ) : (
          <form onSubmit={submitLogin}>
            <label>ایمیل
              <input type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>رمز عبور
              <input type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="err" role="alert">{error}</p>}
            <button type="submit" className="btn primary" disabled={busy}>ورود</button>
          </form>
        )}
      </div>
    </div>
  )
}