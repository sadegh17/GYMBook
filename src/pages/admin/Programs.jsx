import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/auth.jsx'
import { moveItem } from '../../lib/programMove.js'

const SECTIONS = [
  { key: 'warm', label: 'گرم‌کردن' },
  { key: 'main', label: 'اصلی' },
  { key: 'cool', label: 'سردکردن' },
]

async function fetchPrograms() {
  const { data, error } = await supabase.from('programs').select('id,title,description').order('created_at')
  if (error) throw error
  return data
}

async function fetchExercises() {
  const { data, error } = await supabase.from('exercises').select('id,name_fa').order('name_fa')
  if (error) throw error
  return data
}

async function fetchDays(programId) {
  const { data, error } = await supabase.from('program_days')
    .select('*, items:program_items(*, exercise:exercises(name_fa))')
    .eq('program_id', programId).order('sort')
  if (error) throw error
  return data
}

// Uncontrolled numeric cell: commits on blur only when the value really changed.
function NumField({ label, value, onSave }) {
  return (
    <label>{label}
      <input
        type="number" min="0" defaultValue={String(value ?? '')}
        onBlur={(e) => {
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n) && n !== value) onSave(n, e.target)
        }}
      />
    </label>
  )
}

function AddBar({ label, exercises, onAdd }) {
  return (
    <select aria-label={label} value="" onChange={(e) => { if (e.target.value) onAdd(e.target.value); e.target.value = '' }}>
      <option value="">افزودن حرکت از بانک…</option>
      {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name_fa}</option>)}
    </select>
  )
}

export default function Programs() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()

  const programsQuery = useQuery({ queryKey: ['programs'], queryFn: fetchPrograms, enabled: isAdmin })
  const exercisesQuery = useQuery({ queryKey: ['exercises'], queryFn: fetchExercises, enabled: isAdmin })
  const programs = programsQuery.data ?? []
  const exercises = exercisesQuery.data ?? []

  const [programId, setProgramId] = useState(null)
  const [dayIndex, setDayIndex] = useState(0)
  const daysQuery = useQuery({
    queryKey: ['program-days', programId],
    queryFn: () => fetchDays(programId),
    enabled: isAdmin && !!programId,
  })
  const days = daysQuery.data ?? []
  const day = days[dayIndex]

  const [toast, setToast] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Every mutation is one independent supabase call; on success we surface a
  // Persian status and invalidate the day query so the UI reflects the server
  // (no optimistic writes — reorder especially must keep `sort` integrity).
  async function run(fn, okText) {
    setErr(''); setToast(''); setBusy(true)
    try {
      await fn()
      setToast(okText || 'ذخیره شد')
    } catch {
      setErr('خطا در ذخیره تغییرات — لطفاً دوباره تلاش کنید')
    } finally {
      setBusy(false)
      if (programId) qc.invalidateQueries({ queryKey: ['program-days', programId] })
    }
  }

  const selectProgram = (id) => { setProgramId(id); setDayIndex(0); setToast(''); setErr('') }

  const createProgram = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) { setErr('عنوان برنامه الزامی است'); return }
    setErr(''); setToast(''); setBusy(true)
    try {
      const { error } = await supabase.from('programs')
        .insert({ title: newTitle.trim(), description: newDesc.trim() || null, created_by: profile?.id ?? null })
        .select().single()
      if (error) throw error
      setNewTitle(''); setNewDesc('')
      qc.invalidateQueries({ queryKey: ['programs'] })
      setToast('برنامه ساخته شد')
    } catch {
      setErr('خطا در ساخت برنامه — لطفاً دوباره تلاش کنید')
    } finally {
      setBusy(false)
    }
  }

  const saveItemField = (item, patch) => run(
    () => supabase.from('program_items').update(patch).eq('id', item.id).then(({ error }) => { if (error) throw error }),
    'حرکت به‌روزرسانی شد'
  )

  const deleteItem = (item) => {
    const name = item.exercise?.name_fa ?? 'این حرکت'
    if (!window.confirm(`«${name}» از این روز حذف شود؟`)) return
    run(async () => {
      const { error } = await supabase.from('program_items').delete().eq('id', item.id)
      if (error) throw error
    }, 'حرکت حذف شد')
  }

  const addItem = (sectionKey, exerciseId) => {
    if (!day) return
    const count = (day.items ?? []).filter((i) => i.section === sectionKey).length
    run(async () => {
      const { error } = await supabase.from('program_items')
        .insert({ day_id: day.id, exercise_id: exerciseId, section: sectionKey, sets: 3, reps: 12, rest_sec: 45, sort: count + 1 })
        .select().single()
      if (error) throw error
    }, 'حرکت اضافه شد')
  }

  // Awaited (not optimistic): compute the new ordering, persist each changed
  // sort, then invalidate so the next render is the server's truth.
  const reorder = (sectionKey, itemId, dir) => {
    const sec = (day?.items ?? []).filter((i) => i.section === sectionKey).sort((a, b) => a.sort - b.sort)
    const index = sec.findIndex((i) => i.id === itemId)
    if (index < 0) return
    const moved = moveItem(sec, index, dir)
    const changed = moved.filter((it) => sec.find((o) => o.id === it.id)?.sort !== it.sort)
    if (!changed.length) return
    run(async () => {
      for (const it of changed) {
        const { error } = await supabase.from('program_items').update({ sort: it.sort }).eq('id', it.id)
        if (error) throw error
      }
    }, 'ترتیب ذخیره شد')
  }

  const changeSection = (item, section) => {
    if (!day || section === item.section) return
    const count = (day.items ?? []).filter((i) => i.section === section).length
    saveItemField(item, { section, sort: count + 1 })
  }

  const saveDayField = (patch) => run(
    () => supabase.from('program_days').update(patch).eq('id', day.id).then(({ error }) => { if (error) throw error }),
    'روز به‌روزرسانی شد'
  )

  if (!isAdmin) return null

  return (
    <div className="wrap">
      <div className="card">
        <h2>برنامه‌ها</h2>
        {err && <p className="err" role="alert">{err}</p>}
        {toast && <div className="ok-banner" role="status">{toast}</div>}

        <form onSubmit={createProgram} className="pb-new">
          <label>عنوان برنامه
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
          </label>
          <label>توضیح
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>برنامه جدید</button>
        </form>

        {programsQuery.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
        {programsQuery.isError && (
          <div className="center">
            <p className="err">خطا در دریافت برنامه‌ها</p>
            <button type="button" className="btn" onClick={() => programsQuery.refetch()}>تلاش مجدد</button>
          </div>
        )}
        {!programsQuery.isLoading && programs.length === 0 && (
          <p className="muted">هنوز برنامه‌ای وجود ندارد. برای شروع یک برنامه جدید بسازید.</p>
        )}

        <div className="pb-list">
          {programs.map((p) => (
            <button
              type="button" key={p.id}
              className={'btn' + (p.id === programId ? ' primary' : '')}
              aria-pressed={p.id === programId}
              onClick={() => selectProgram(p.id)}
            >{p.title}</button>
          ))}
        </div>
      </div>

      {programId && (
        <div className="card">
          <h3>انتخاب روز</h3>
          {daysQuery.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
          {daysQuery.isError && (
            <div className="center">
              <p className="err">خطا در دریافت روزها</p>
              <button type="button" className="btn" onClick={() => daysQuery.refetch()}>تلاش مجدد</button>
            </div>
          )}
          <nav className="days">
            {days.map((d, i) => (
              <button type="button" key={d.id} className={i === dayIndex ? 'active' : undefined}
                aria-current={i === dayIndex ? 'true' : undefined} onClick={() => setDayIndex(i)}>
                {d.day_label}
                {d.focus ? <small>{d.focus}</small> : null}
              </button>
            ))}
          </nav>

          {day && (
            <div className="dayhead pb-dayhead">
              <div className="pb-dayfields">
                <label>عنوان روز
                  <input type="text" defaultValue={day.title ?? ''} onBlur={(e) => { if (e.target.value !== (day.title ?? '')) saveDayField({ title: e.target.value }) }} />
                </label>
                <label>زیرعنوان روز
                  <input type="text" defaultValue={day.sub ?? ''} onBlur={(e) => { if (e.target.value !== (day.sub ?? '')) saveDayField({ sub: e.target.value }) }} />
                </label>
                <label>تمرکز روز
                  <input type="text" defaultValue={day.focus ?? ''} onBlur={(e) => { if (e.target.value !== (day.focus ?? '')) saveDayField({ focus: e.target.value }) }} />
                </label>
              </div>
            </div>
          )}

          {day && SECTIONS.map((sec) => {
            const items = (day.items ?? []).filter((i) => i.section === sec.key).sort((a, b) => a.sort - b.sort)
            return (
              <div key={sec.key} className="pb-col">
                <div className="sect">{sec.label}</div>
                {items.map((item) => {
                  const name = item.exercise?.name_fa ?? '—'
                  return (
                    <div key={item.id} className="pb-item">
                      <span className="pb-item-name">{name}</span>
                      <NumField label={`ست (${name})`} value={item.sets} onSave={(v) => saveItemField(item, { sets: v })} />
                      <NumField label={`تکرار (${name})`} value={item.reps} onSave={(v) => saveItemField(item, { reps: v })} />
                      <NumField label={`استراحت (${name})`} value={item.rest_sec} onSave={(v) => saveItemField(item, { rest_sec: v })} />
                      <label>بخش
                        <select aria-label={`بخش (${name})`} value={item.section}
                          onChange={(e) => changeSection(item, e.target.value)}>
                          {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </label>
                      <button type="button" className="btn" aria-label={`بالا (${name})`} disabled={busy} onClick={() => reorder(sec.key, item.id, 'up')}>↑</button>
                      <button type="button" className="btn" aria-label={`پایین (${name})`} disabled={busy} onClick={() => reorder(sec.key, item.id, 'down')}>↓</button>
                      <button type="button" className="btn" aria-label={`حذف (${name})`} disabled={busy} onClick={() => deleteItem(item)}>حذف</button>
                    </div>
                  )
                })}
                <AddBar label={`افزودن حرکت (${sec.label})`} exercises={exercises} onAdd={(exId) => addItem(sec.key, exId)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
