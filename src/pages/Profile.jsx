import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import Field from '../components/Field.jsx'
import { fa } from '../lib/calc.js'

export function validateWeight(v) {
  const n = Number(v)
  if (Number.isFinite(n) && n >= 20 && n <= 250) return null
  return 'وزن باید بین ۲۰ تا ۲۵۰ کیلوگرم باشد'
}

function useAutoHide(msg, setMsg, ms = 4000) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), ms)
    return () => clearTimeout(t)
  }, [msg])
}

export default function Profile() {
  const { profile, refresh } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState(profile?.name ?? '')
  const [weight, setWeight] = useState(String(profile?.weight_kg ?? ''))
  const [nameErr, setNameErr] = useState('')
  const [weightErr, setWeightErr] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  useAutoHide(profileMsg, setProfileMsg)
  useAutoHide(pwMsg, setPwMsg)

  const profileDirty =
    name !== (profile?.name ?? '') ||
    String(Number(weight)) !== String(Number(profile?.weight_kg))
  const pwDirty = pw !== '' && pw2 !== ''
  const matchState = pw2 === '' || pw !== pw2 ? null : (pw.length >= 8 ? 'ok' : 'short')

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg(''); setProfileErr(''); setNameErr(''); setWeightErr('')
    let bad = false
    if (!name.trim()) { setNameErr('نام نمی‌تواند خالی باشد'); bad = true }
    const err = validateWeight(weight)
    if (err) { setWeightErr(err); bad = true }
    if (bad) return
    setBusy(true)
    const { error } = await supabase.from('profiles')
      .update({ name, weight_kg: Number(weight) })
      .eq('id', profile.id)
    setBusy(false)
    if (error) { setProfileErr('خطا در ذخیره پروفایل'); return }
    setProfileMsg('پروفایل ذخیره شد')
    refresh?.()
    qc.invalidateQueries({ queryKey: ['profile'] })
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwMsg(''); setPwErr('')
    if (pw.length < 8) { setPwErr('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    if (pw !== pw2) { setPwErr('رمز عبور و تکرار آن یکسان نیستند'); return }
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) {
      setPwErr('تغییر رمز ناموفق بود — لطفاً دوباره وارد شوید و تلاش کنید')
      return
    }
    setPwMsg('رمز عبور تغییر کرد')
    setPw(''); setPw2('')
  }

  return (
    <div className="wrap">
      <div className="profile-card card">
        <h2>پروفایل</h2>
        <p className="desc">نام و وزن شما در محاسبه کالری حرکات استفاده می‌شود.</p>
        <form onSubmit={saveProfile} noValidate>
          <Field id="name" label="نام" error={nameErr}>
            <input
              id="name" type="text" value={name} maxLength={40}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameErr ? 'true' : undefined}
              aria-describedby={nameErr ? 'name-error' : undefined}
            />
          </Field>
          <Field id="weight" label="وزن (کیلوگرم)"
            hint={`مجاز بین ${fa('20')} تا ${fa('250')} کیلوگرم`} error={weightErr}>
            <input
              id="weight" type="number" step="0.1" min="20" max="250" inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              aria-invalid={weightErr ? 'true' : undefined}
              aria-describedby={weightErr ? 'weight-error' : 'weight-hint'}
            />
          </Field>
          <div className="form-actions">
            <button type="submit" className="btn primary"
              disabled={busy || !profileDirty}>
              {busy ? 'در حال ذخیره…' : 'ذخیره پروفایل'}
            </button>
            {profileMsg && <span className="ok" role="status">{profileMsg}</span>}
            {profileErr && <span className="err" role="alert">{profileErr}</span>}
          </div>
        </form>
      </div>

      <div className="profile-card card">
        <h2>تغییر رمز عبور</h2>
        <p className="desc">رمز جدید باید حداقل {fa('8')} کاراکتر باشد.</p>
        <form onSubmit={savePassword}>
          <Field id="pw" label="رمز عبور جدید">
            <input
              id="pw" type="password" autoComplete="new-password" value={pw}
              onChange={(e) => setPw(e.target.value)}
              aria-describedby="pw-hint"
            />
          </Field>
          <Field id="pw2" label="تکرار رمز عبور"
            hint={matchState === 'ok' ? '✓ یکسان'
              : matchState === 'short' ? 'کوتاه‌تر از ۸ کاراکتر'
              : pw2 !== '' && pw !== pw2 ? '✗ یکسان نیست' : null}
            hintClass={matchState === 'ok' ? 'match good'
              : matchState === 'short' ? 'match warn'
              : pw2 !== '' && pw !== pw2 ? 'match bad' : ''}>
            <input
              id="pw2" type="password" autoComplete="new-password" value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              aria-describedby="pw2-hint"
            />
          </Field>
          <div className="form-actions">
            <button type="submit" className="btn primary"
              disabled={pwBusy || !pwDirty}>
              {pwBusy ? 'در حال ذخیره…' : 'تغییر رمز'}
            </button>
            {pwMsg && <span className="ok" role="status">{pwMsg}</span>}
            {pwErr && <span className="err" role="alert">{pwErr}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
