import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/auth.jsx'
import Field from '../../components/Field.jsx'
import { createUserWithRestore, createUserErrorFa } from '../../lib/adminUsers.js'

const THEMES = [
  { key: 'sadeq', label: 'آبی (صادق)' },
  { key: 'saghar', label: 'صورتی (ساغر)' },
]

async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  if (error) throw error
  return data
}

async function fetchPrograms() {
  const { data, error } = await supabase.from('programs').select('id,title').order('created_at')
  if (error) throw error
  return data
}

export async function updateProfileField(id, patch) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id)
  if (error) throw error
}

// Deletion is intentionally omitted: removing an auth user needs the
// service-role key (server-only). approved=false is the disable path.
export default function Users() {
  const { profile: self, refresh } = useAuth()
  const isAdmin = self?.role === 'admin'
  const qc = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles, enabled: isAdmin })
  const programsQuery = useQuery({ queryKey: ['programs'], queryFn: fetchPrograms, enabled: isAdmin })
  const programs = programsQuery.data ?? []

  const [form, setForm] = useState({ name: '', email: '', password: '', weight: '', theme: 'sadeq', program: '', role: 'member' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [inlineMsg, setInlineMsg] = useState('')
  const [banner, setBanner] = useState(false)
  // Temp password is kept out of React state: held in a ref, echoed once in
  // the success banner, then dropped on close. See handleSubmit.
  const bannerPwRef = React.useRef('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const formValid = form.name.trim() !== '' && form.email.trim() !== '' && form.password.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (form.password.length < 8) { setErr('رمز عبور باید حداقل ۸ کاراکتر باشد'); return }
    setBusy(true)
    try {
      const weightKg = form.weight === '' ? null : Number(form.weight)
      await createUserWithRestore({
        email: form.email, password: form.password, name: form.name, role: form.role,
        weightKg, theme: form.theme, programId: form.program || null,
      })
      bannerPwRef.current = form.password
      qc.invalidateQueries({ queryKey: ['profiles'] })
      setForm({ name: '', email: '', password: '', weight: '', theme: 'sadeq', program: '', role: 'member' })
      setBanner(true)
    } catch (e2) {
      setErr(createUserErrorFa(e2))
    } finally {
      setBusy(false)
    }
  }

  const inline = async (id, patch, isSelf) => {
    // R18 lockout guard: an admin must never change their OWN role or approved
    // flag (would demote/unapprove and lock themselves out of this panel).
    // We abort before the update API call and resync the controlled inputs
    // from the server so the select/checkbox can't visually desync.
    if (isSelf && ('role' in patch || 'approved' in patch)) {
      setInlineMsg('نمی‌توانید دسترسی یا تایید حساب خودتان را تغییر دهید')
      qc.invalidateQueries({ queryKey: ['profiles'] })
      return
    }
    setInlineMsg('')
    try {
      await updateProfileField(id, patch)
      qc.invalidateQueries({ queryKey: ['profiles'] })
      if (isSelf) refresh?.()
    } catch {
      // Surfaced as a toast; list is refetched so UI never desyncs after a failure.
      setInlineMsg('خطا در ذخیره تغییرات — لطفاً دوباره تلاش کنید')
      qc.invalidateQueries({ queryKey: ['profiles'] })
    }
  }

  // Hooks must run unconditionally; non-admin guard is enforced after them.
  if (!isAdmin) return null

  return (
    <div className="wrap">
      <div className="card">
        <h2>ساخت کاربر</h2>
        <p className="desc">کاربر جدید با همین رمز موقت وارد می‌شود و بعداً از صفحه پروفایل رمز را عوض می‌کند.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field-row">
            <Field id="uc-name" label="نام">
              <input id="uc-name" type="text" value={form.name} maxLength={40} onChange={set('name')} required />
            </Field>
            <Field id="uc-email" label="ایمیل">
              <input id="uc-email" type="email" dir="ltr" value={form.email} onChange={set('email')} required />
            </Field>
          </div>
          <div className="field-row cols-3">
            <Field id="uc-pass" label="رمز موقت" hint="حداقل ۸ کاراکتر">
              <input id="uc-pass" type="password" dir="ltr" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <Field id="uc-weight" label="وزن (کیلوگرم)">
              <input id="uc-weight" type="number" step="0.1" min="20" max="250" inputMode="decimal" value={form.weight} onChange={set('weight')} />
            </Field>
            <Field id="uc-theme" label="تم">
              <select id="uc-theme" value={form.theme} onChange={set('theme')}>
                {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="field-row">
            <Field id="uc-program" label="برنامه تمرینی">
              <select id="uc-program" value={form.program} onChange={set('program')}>
                <option value="">بدون برنامه</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
            <Field id="uc-role" label="نقش">
              <select id="uc-role" value={form.role} onChange={set('role')}>
                <option value="member">کاربر</option>
                <option value="admin">ادمین</option>
              </select>
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy || !formValid}>
              {busy ? 'در حال ساخت…' : 'ساخت کاربر'}
            </button>
            {err && <span className="err" role="alert">{err}</span>}
          </div>
        </form>
        {banner && (
          <div className="ok-banner" role="status">
            کاربر ساخته شد. رمز موقت: <b dir="ltr">{bannerPwRef.current}</b>
            <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(bannerPwRef.current)}>کپی</button>
            <button type="button" className="btn" onClick={() => { bannerPwRef.current = ''; setBanner(false) }}>بستن</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>کاربران</h2>
        <p className="desc">برای بازنشانی رمز، کاربر خودش از صفحه پروفایل اقدام کند.</p>
        {inlineMsg && <p className="ferr inline-msg" role="alert">{inlineMsg}</p>}
        {usersQuery.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
        {usersQuery.isError && (
          <div className="center">
            <p className="err">خطا در دریافت کاربران</p>
            <button type="button" className="btn" onClick={() => usersQuery.refetch()}>تلاش مجدد</button>
          </div>
        )}
        {(usersQuery.data ?? []).map((u) => (
          <div key={u.id} className="user-row">
            <div className="user-head">
              <b>{u.name}</b>
              <span className={'user-badge ' + (u.role === 'admin' ? 'admin' : 'member')}>
                {u.role === 'admin' ? 'ادمین' : 'کاربر'}
              </span>
              {!u.approved && <span className="user-badge pending">در انتظار تأیید</span>}
              <span className="email">{u.email}</span>
            </div>
            <div className="user-fields">
              <div className="user-field">
                <span>نقش</span>
                <select aria-label={`نقش ${u.name}`} value={u.role}
                  onChange={(e) => inline(u.id, { role: e.target.value }, self?.id === u.id)}>
                  <option value="member">کاربر</option>
                  <option value="admin">ادمین</option>
                </select>
              </div>
              <div className="user-field">
                <span>وزن</span>
                <input aria-label={`وزن ${u.name}`} type="number" step="0.1" inputMode="decimal" defaultValue={u.weight_kg ?? ''}
                  onBlur={(e) => { if (e.target.value !== '' && Number(e.target.value) !== u.weight_kg) inline(u.id, { weight_kg: Number(e.target.value) }, self?.id === u.id) }} />
              </div>
              <div className="user-field">
                <span>تم</span>
                <select aria-label={`تم ${u.name}`} value={u.theme ?? 'sadeq'}
                  onChange={(e) => inline(u.id, { theme: e.target.value }, self?.id === u.id)}>
                  {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div className="user-field">
                <span>برنامه</span>
                <select aria-label={`برنامه ${u.name}`} value={u.program_id ?? ''}
                  onChange={(e) => inline(u.id, { program_id: e.target.value || null }, self?.id === u.id)}>
                  <option value="">بدون برنامه</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <label className="user-field check">
                <input aria-label={`تأیید ${u.name}`} type="checkbox" checked={!!u.approved}
                  onChange={(e) => inline(u.id, { approved: e.target.checked }, self?.id === u.id)} />
                <span>تأیید حساب</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
