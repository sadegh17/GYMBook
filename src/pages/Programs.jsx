import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth.jsx'
import { fetchSelectablePrograms, createProgramWithDays, softDeleteProgram, setDefaultProgram } from '../lib/programs.js'
import { countActivePrograms, programLimitErrorFa, MAX_PROGRAMS } from '../lib/programSlots.js'
import { DAY_KEYS, dayLabel } from '../lib/programDays.js'
import { fa } from '../lib/calc.js'
import Field from '../components/Field.jsx'
import ProgramBuilder from '../components/ProgramBuilder.jsx'

export default function Programs() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [openId, setOpenId] = useState(null)
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState([])
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  const q = useQuery({
    queryKey: ['my-programs', profile?.id],
    queryFn: () => fetchSelectablePrograms(profile.id, profile.program_id),
    enabled: !!profile?.id,
  })
  const programs = q.data ?? []
  const assignedExternal = profile.program_id && programs.some((p) => !p.isOwned) ? profile.program_id : null
  const used = countActivePrograms(programs.filter((p) => p.isOwned), assignedExternal)
  const atLimit = used >= MAX_PROGRAMS

  const toggleKey = (k) => setPicked((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))

  const create = async (e) => {
    e.preventDefault(); setErr('')
    if (atLimit) { setErr(programLimitErrorFa({ message: 'USER_PROGRAM_LIMIT' })); return }
    if (!title.trim()) { setErr('اسم برنامه الزامی است'); return }
    if (!picked.length) { setErr('حداقل یک روز انتخاب کنید'); return }
    setBusy(true)
    try {
      const { id } = await createProgramWithDays({ userId: profile.id, title: title.trim(), dayKeys: picked })
      setTitle(''); setPicked([]); setOpenId(id)
      qc.invalidateQueries({ queryKey: ['my-programs', profile.id] })
    } catch (e2) { setErr(programLimitErrorFa(e2)) }
    finally { setBusy(false) }
  }

  const del = async (p) => {
    if (!window.confirm(`برنامه «${p.title}» حذف شود؟ لاگ‌های انجام‌شده در گزارش می‌مانند.`)) return
    try {
      await softDeleteProgram(p.id)
      if (profile.program_id === p.id) await setDefaultProgram(profile.id, null)
      qc.invalidateQueries({ queryKey: ['my-programs', profile.id] })
      if (openId === p.id) setOpenId(null)
    } catch { setErr('خطا در حذف برنامه') }
  }

  const star = async (p) => {
    try { await setDefaultProgram(profile.id, p.id); qc.invalidateQueries({ queryKey: ['my-programs', profile.id] }) }
    catch { setErr('خطا در ست کردن پیش‌فرض') }
  }

  return (
    <div className="wrap">
      <div className="card">
        <h2>برنامه‌های من</h2>
        <p className="muted">{fa(used)} از {fa(MAX_PROGRAMS)} برنامه فعال</p>
        {err && <p className="err" role="alert">{err}</p>}
        <form onSubmit={create} noValidate>
          <Field id="mp-title" label="اسم برنامه">
            <input id="mp-title" type="text" value={title} maxLength={60} disabled={atLimit} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="weekdays" role="group" aria-label="روزهای تمرین">
            {DAY_KEYS.map((k) => (
              <label key={k}>
                <input type="checkbox" checked={picked.includes(k)} disabled={atLimit} onChange={() => toggleKey(k)} />
                <span>{dayLabel(k)}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy} aria-label="ساخت برنامه">
              {atLimit ? 'سقف برنامه پر است' : 'ساخت برنامه'}
            </button>
          </div>
        </form>

        {q.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
        <div className="pb-list">
          {programs.map((p) => (
            <div key={p.id} className={'prog-card' + (openId === p.id ? ' active' : '')}>
              <button type="button" className="prog-title" onClick={() => setOpenId(p.id)}>{p.title}</button>
              {p.isDefault && <span className="chip">پیش‌فرض</span>}
              {!p.isOwned && <span className="chip">ادمین</span>}
              {p.isOwned && !p.isDefault && (
                <button type="button" className="btn" aria-label={`پیش‌فرض ${p.title}`} onClick={() => star(p)}>⭐</button>
              )}
              {p.isOwned && <button type="button" className="btn" aria-label={`حذف ${p.title}`} onClick={() => del(p)}>حذف</button>}
            </div>
          ))}
        </div>
      </div>
      {openId && <div className="card"><ProgramBuilder programId={openId} /></div>}
    </div>
  )
}
