import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { fa } from '../lib/calc.js'

export function validateWeight(v) {
  const n = Number(v)
  if (Number.isFinite(n) && n >= 20 && n <= 250) return null
  return 'وزن باید بین ۲۰ تا ۲۵۰ کیلوگرم باشد'
}

export default function Profile() {
  const { profile, refresh } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState(profile?.name ?? '')
  const [weight, setWeight] = useState(profile?.weight_kg ?? '')
  const [weightErr, setWeightErr] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg(''); setProfileErr('')
    const err = validateWeight(weight)
    if (err) { setWeightErr(err); return }
    setWeightErr('')
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
        <form onSubmit={saveProfile} noValidate>
          <label>نام
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>وزن (کیلوگرم)
            <input type="number" step="0.1" min="20" max="250"
              value={weight} onChange={(e) => setWeight(e.target.value)} required />
          </label>
          <p className="muted hint">مجاز بین {fa('20')} تا {fa('250')} کیلوگرم</p>
          {weightErr && <p className="err" role="alert">{weightErr}</p>}
          {profileMsg && <p className="ok" role="status">{profileMsg}</p>}
          {profileErr && <p className="err" role="alert">{profileErr}</p>}
          <button type="submit" className="btn primary" disabled={busy}>ذخیره پروفایل</button>
        </form>
      </div>

      <div className="profile-card card">
        <h2>تغییر رمز عبور</h2>
        <form onSubmit={savePassword}>
          <label>رمز عبور جدید
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
          <label>تکرار رمز عبور
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </label>
          {pwErr && <p className="err" role="alert">{pwErr}</p>}
          {pwMsg && <p className="ok" role="status">{pwMsg}</p>}
          <button type="submit" className="btn primary" disabled={pwBusy}>تغییر رمز</button>
        </form>
      </div>
    </div>
  )
}