import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { fetchProgramTree } from '../lib/api.js'
import { calcKcal, fa } from '../lib/calc.js'
import { moveItem } from '../lib/programMove.js'
import Field from './Field.jsx'

// Uncontrolled numeric cell: commits on blur only when the value really changed.
function NumField({ label, value, onSave }) {
  return (
    <label>{label}
      <input
        type="number" min="0" defaultValue={String(value ?? '')}
        onBlur={(e) => {
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n) && n !== value) onSave(n)
        }}
      />
    </label>
  )
}

export default function ProgramBuilder({ programId }) {
  const { profile } = useAuth()
  const weightKg = profile?.weight_kg ?? 70
  const qc = useQueryClient()
  const [dayIndex, setDayIndex] = useState(0)
  const [toast, setToast] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [newSection, setNewSection] = useState('')

  const daysQuery = useQuery({
    queryKey: ['program-tree', programId],
    queryFn: () => fetchProgramTree(programId),
    enabled: !!programId,
  })
  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('id,name_fa').order('name_fa')
      if (error) throw error
      return data
    },
  })

  const days = daysQuery.data ?? []
  const day = days[dayIndex]

  // Every mutation is one independent supabase call; on success we surface a
  // Persian status and invalidate the tree query so the UI reflects the server
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
      qc.invalidateQueries({ queryKey: ['program-tree', programId] })
    }
  }

  if (!programId) return null
  if (daysQuery.isLoading) return <div className="center muted" role="status">در حال بارگذاری…</div>

  const saveDayField = (patch) => run(
    () => supabase.from('program_days').update(patch).eq('id', day.id).then(({ error }) => { if (error) throw error }),
    'روز ذخیره شد'
  )

  const addSection = () => {
    const name = newSection.trim()
    if (!name || !day) return
    run(async () => {
      const count = (day.sections ?? []).length
      const { error } = await supabase.from('program_sections')
        .insert({ day_id: day.id, name, sort: count }).select().single()
      if (error) throw error
    }, 'بخش اضافه شد')
    setNewSection('')
  }

  const renameSection = (sec, name) => {
    if (!name || name === sec.name) return
    run(
      () => supabase.from('program_sections').update({ name }).eq('id', sec.id).then(({ error }) => { if (error) throw error }),
      'بخش ذخیره شد'
    )
  }

  const removeSection = (sec) => {
    if (!window.confirm(`بخش «${sec.name}» حذف شود؟`)) return
    run(
      () => supabase.from('program_sections').delete().eq('id', sec.id).then(({ error }) => { if (error) throw error }),
      'بخش حذف شد'
    )
  }

  const addItem = (sectionId, exerciseId) => {
    if (!day) return
    const count = (day.items ?? []).filter((i) => i.section_id === sectionId).length
    run(async () => {
      const { error } = await supabase.from('program_items')
        .insert({ day_id: day.id, section_id: sectionId, exercise_id: exerciseId, sets: 3, reps: 12, rest_sec: 45, sort: count + 1 })
        .select().single()
      if (error) throw error
    }, 'حرکت اضافه شد')
  }

  const saveItemField = (item, patch) => run(
    () => supabase.from('program_items').update(patch).eq('id', item.id).then(({ error }) => { if (error) throw error }),
    'حرکت به‌روزرسانی شد'
  )

  const deleteItem = (item) => {
    const name = item.exercise?.name_fa ?? 'این حرکت'
    if (!window.confirm(`«${name}» از این روز حذف شود؟`)) return
    run(
      () => supabase.from('program_items').delete().eq('id', item.id).then(({ error }) => { if (error) throw error }),
      'حرکت حذف شد'
    )
  }

  // Awaited (not optimistic): compute the new ordering, persist each changed
  // sort, then invalidate so the next render is the server's truth.
  const reorder = (sectionId, itemId, dir) => {
    const sec = (day?.items ?? []).filter((i) => i.section_id === sectionId).sort((a, b) => a.sort - b.sort)
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

  return (
    <div className="pb">
      {err && <p className="err" role="alert">{err}</p>}
      {toast && <div className="ok-banner" role="status">{toast}</div>}

      <nav className="days">
        {days.map((d, i) => (
          <button type="button" key={d.id} className={i === dayIndex ? 'active' : undefined}
            aria-current={i === dayIndex ? 'true' : undefined} onClick={() => setDayIndex(i)}>{d.day_label}</button>
        ))}
      </nav>

      {day && (
        <div className="field-row">
          <Field id={`bt-${day.id}`} label="عنوان روز">
            <input id={`bt-${day.id}`} type="text" defaultValue={day.title ?? ''}
              onBlur={(e) => { if (e.target.value !== (day.title ?? '')) saveDayField({ title: e.target.value }) }} />
          </Field>
        </div>
      )}

      {day && (day.sections ?? []).map((sec) => {
        const items = (day.items ?? []).filter((i) => i.section_id === sec.id).sort((a, b) => a.sort - b.sort)
        return (
          <div key={sec.id} className="pb-col">
            <div className="sect">{sec.name}</div>
            <div className="pb-sect-head">
              <input aria-label={`نام بخش ${sec.name}`} defaultValue={sec.name}
                onBlur={(e) => renameSection(sec, e.target.value)} />
              <button type="button" className="btn" disabled={busy}
                aria-label={`حذف بخش ${sec.name}`} onClick={() => removeSection(sec)}>حذف بخش</button>
            </div>
            {items.map((item) => {
              const name = item.exercise?.name_fa ?? '—'
              const preview = item.exercise ? calcKcal(item.exercise, item, weightKg) : null
              return (
                <div key={item.id} className="pb-item">
                  <span className="pb-item-name">{name}</span>
                  <NumField label={`ست (${name})`} value={item.sets} onSave={(v) => saveItemField(item, { sets: v })} />
                  <NumField label={`تکرار (${name})`} value={item.reps} onSave={(v) => saveItemField(item, { reps: v })} />
                  <NumField label={`استراحت (${name})`} value={item.rest_sec} onSave={(v) => saveItemField(item, { rest_sec: v })} />
                  {preview != null && <span className="kcal">≈{fa(preview)} کیلوکالری</span>}
                  <button type="button" className="btn" disabled={busy} aria-label={`بالا (${name})`} onClick={() => reorder(sec.id, item.id, 'up')}>↑</button>
                  <button type="button" className="btn" disabled={busy} aria-label={`پایین (${name})`} onClick={() => reorder(sec.id, item.id, 'down')}>↓</button>
                  <button type="button" className="btn" disabled={busy} aria-label="حذف حرکت" onClick={() => deleteItem(item)}>حذف</button>
                </div>
              )
            })}
            <select aria-label={`افزودن حرکت به ${sec.name}`} value=""
              onChange={(e) => { if (e.target.value) addItem(sec.id, e.target.value); e.target.value = '' }}>
              <option value="">افزودن حرکت از بانک…</option>
              {(exercisesQuery.data ?? []).map((ex) => <option key={ex.id} value={ex.id}>{ex.name_fa}</option>)}
            </select>
          </div>
        )
      })}

      {day && (
        <input aria-label="افزودن بخش" placeholder="نام بخش جدید…" value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSection() }} />
      )}
    </div>
  )
}
