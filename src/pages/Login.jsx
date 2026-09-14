import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

const LOGIN_ERRORS = {
  INVALID_CREDENTIALS: 'ایمیل یا رمز عبور اشتباه است',
  NOT_APPROVED: 'حساب شما هنوز توسط ادمین تایید نشده است',
  REJECTED: 'درخواست شما رد شده است — با ادمین تماس بگیرید',
  EMAIL_NOT_CONFIRMED: 'ابتدا ایمیل خود را تأیید کنید',
}

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [tab, setTab] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let stop = false
    supabase.rpc('setup_needed')
      .then(({ data }) => {
        if (stop) return
        setSetupNeeded(!!data)
        if (data) setTab('setup')
        setReady(true)
      })
      .catch(() => { if (!stop) setReady(true) })
    return () => { stop = true }
  }, [])

  if (!ready) return <div className="center muted" role="status">در حال بارگذاری…</div>

  const switchTab = (t) => { setTab(t); setError(''); setInfo('') }

  const clearForm = () => { setName(''); setEmail(''); setPassword(''); setPassword2('') }

  const submitLogin = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const res = await signIn(email, password)
    setBusy(false)
    if (res?.error) { setError(LOGIN_ERRORS[res.error] ?? LOGIN_ERRORS.INVALID_CREDENTIALS); return }
    navigate('/')
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    if (password !== password2) { setError('رمز عبور و تکرار آن یکسان نیستند'); return }
    setBusy(true)
    const res = await signUp(email, password, name)
    setBusy(false)
    if (res?.error) { setError(res.error); return }
    if (res?.status === 'approved') { navigate('/'); return }
    clearForm()
    setTab('login')
    setInfo('ثبت‌نام انجام شد؛ پس از تأیید ادمین می‌توانید وارد شوید')
  }

  const submitSetup = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    setBusy(true)
    const res = await signUp(email, password, name)
    setBusy(false)
    if (res?.error) { setError(res.error); return }
    navigate('/')
  }

  const tabs = setupNeeded
    ? [{ key: 'login', label: 'ورود' }, { key: 'setup', label: 'ساخت اکانت ادمین اولیه' }]
    : [{ key: 'login', label: 'ورود' }, { key: 'register', label: 'ثبت‌نام' }]

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 className="brand-title">GYMBook</h1>
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'tab active' : 'tab'} onClick={() => switchTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {info && <p className="ok" role="status">{info}</p>}
        {tab === 'register' && (
          <form onSubmit={submitRegister}>
            <label>نام
              <input type="text" placeholder="نام" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>ایمیل
              <input type="email" dir="ltr" placeholder="ایمیل" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>رمز عبور
              <input type="password" dir="ltr" placeholder="رمز عبور" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </label>
            <label>تکرار رمز عبور
              <input type="password" dir="ltr" placeholder="تکرار رمز عبور" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
            </label>
            {error && <p className="err" role="alert">{error}</p>}
            <button type="submit" className="btn primary" disabled={busy}>{busy ? 'در حال ثبت‌نام…' : 'ساخت حساب'}</button>
          </form>
        )}
        {tab === 'setup' && (
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
        )}
        {tab === 'login' && (
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
