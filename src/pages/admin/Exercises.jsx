import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/auth.jsx'
import Field from '../../components/Field.jsx'
import { fa } from '../../lib/calc.js'
import { validateExercise, countUsages, isDuplicateNameEn } from '../../lib/adminExercises.js'

const EMPTY = { name_fa: '', name_en: '', gif_url: '', page_url: '', how_to: '', tip: '', met: '', sec_per_rep: '' }

async function fetchExercises() {
  const { data, error } = await supabase.from('exercises').select('*').order('name_fa')
  if (error) throw error
  return data
}

// NOTE (N-shape usage count): usage is computed client-side from a single
// program_items(id, exercise_id) select. Fine at the current scale
// (a few hundred rows); revisit with a server-side count if it grows.
async function fetchItems() {
  const { data, error } = await supabase.from('program_items').select('id,exercise_id')
  if (error) throw error
  return data
}

export default function Exercises() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()
  const listQuery = useQuery({ queryKey: ['exercises'], queryFn: fetchExercises, enabled: isAdmin })
  const usageQuery = useQuery({ queryKey: ['program-items-usage'], queryFn: fetchItems, enabled: isAdmin })
  const counts = useMemo(() => countUsages(usageQuery.data), [usageQuery.data])

  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [errs, setErrs] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openAdd = () => {
    setForm(EMPTY); setEditing(null); setErrs([]); setMsg('')
    setModalOpen(true)
  }
  const openEdit = (ex) => {
    setForm({ ...EMPTY, ...ex, met: String(ex.met ?? ''), sec_per_rep: String(ex.sec_per_rep ?? '') })
    setEditing(ex); setErrs([]); setMsg('')
    setModalOpen(true)
  }

  const duplicateWarn = isDuplicateNameEn(form.name_en, listQuery.data, editing?.id)

  // Field-level mapping of validateExercise() messages (shown only after submit):
  const findErr = (kw) => errs.find((m) => m.includes(kw)) ?? ''
  const nameFaErr = findErr('فارسی')
  const metErr = findErr('MET')
  const sprErr = findErr('ثانیه')
  const mappedKeys = ['فارسی', 'MET', 'ثانیه']
  const unmappedErrs = errs.filter((m) => !mappedKeys.some((k) => m.includes(k)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    const errors = validateExercise(form)
    if (errors.length) { setErrs(errors); return }
    setErrs([])
    setBusy(true)
    try {
      const payload = {
        name_fa: form.name_fa.trim(),
        name_en: form.name_en.trim() || null,
        gif_url: form.gif_url.trim() || null,
        page_url: form.page_url.trim() || null,
        how_to: form.how_to.trim() || null,
        tip: form.tip.trim() || null,
        met: Number(form.met),
        sec_per_rep: Number(form.sec_per_rep),
      }
      if (editing) {
        const { error } = await supabase.from('exercises').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exercises').insert(payload).select().single()
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['exercises'] })
      setModalOpen(false); setEditing(null); setForm(EMPTY)
    } catch {
      setErrs(['خطا در ذخیره حرکت — لطفاً دوباره تلاش کنید'])
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (ex) => {
    const n = counts[ex.id] ?? 0
    if (n > 0) {
      setMsg(`این حرکت در ${fa(n)} برنامه استفاده شده و قابل حذف نیست`)
      return
    }
    if (!window.confirm(`حرکت «${ex.name_fa}» حذف شود؟`)) return
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', ex.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['exercises'] })
    } catch {
      setMsg('خطا در حذف حرکت — لطفاً دوباره تلاش کنید')
    }
  }

  if (!isAdmin) return null

  return (
    <div className="wrap">
      <div className="card">
        <h2>بانک حرکات</h2>
        {msg && <p className="err" role="alert">{msg}</p>}
        <button type="button" className="btn primary" onClick={openAdd}>افزودن حرکت</button>
        {listQuery.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
        {listQuery.isError && (
          <div className="center">
            <p className="err">خطا در دریافت حرکات</p>
            <button type="button" className="btn" onClick={() => listQuery.refetch()}>تلاش مجدد</button>
          </div>
        )}
        {(listQuery.data ?? []).length > 0 && (
          <div className="card-table">
          <table className="history-table">
            <thead>
              <tr>
                <th>نام فارسی</th>
                <th>انگلیسی</th>
                <th>MET</th>
                <th>ثانیه/تکرار</th>
                <th>استفاده</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((ex) => (
                <tr key={ex.id}>
                  <td>{ex.name_fa}</td>
                  <td dir="ltr">{ex.name_en ?? '—'}</td>
                  <td>{ex.met}</td>
                  <td>{ex.sec_per_rep}</td>
                  <td>{fa(counts[ex.id] ?? 0)}</td>
                  <td>
                    <button type="button" className="btn" onClick={() => openEdit(ex)}>ویرایش</button>
                    {' '}
                    <button type="button" className="btn" onClick={() => handleDelete(ex)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="card" role="dialog" aria-label={editing ? 'ویرایش حرکت' : 'افزودن حرکت'}>
          <h3>{editing ? 'ویرایش حرکت' : 'افزودن حرکت'}</h3>
          <form onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <Field id="ex-fa" label="نام فارسی" error={nameFaErr}>
                <input id="ex-fa" type="text" value={form.name_fa} maxLength={60}
                  onChange={set('name_fa')}
                  aria-invalid={nameFaErr ? 'true' : undefined}
                  aria-describedby={nameFaErr ? 'ex-fa-error' : undefined} />
              </Field>
              <Field id="ex-en" label="نام انگلیسی"
                hint={duplicateWarn ? 'حرکت دیگری با همین نام انگلیسی وجود دارد' : null}
                hintClass={duplicateWarn ? 'match warn' : null}>
                <input id="ex-en" type="text" dir="ltr" value={form.name_en ?? ''} onChange={set('name_en')} />
              </Field>
            </div>
            <div className="field-row cols-3">
              <Field id="ex-met" label="MET (شدت)" hint="بین ۱ تا ۱۵" error={metErr}>
                <input id="ex-met" type="number" step="0.1" min="1" max="15" inputMode="decimal" value={form.met ?? ''}
                  onChange={set('met')}
                  aria-invalid={metErr ? 'true' : undefined}
                  aria-describedby={metErr ? 'ex-met-error' : 'ex-met-hint'} />
              </Field>
              <Field id="ex-spr" label="ثانیه بر تکرار" hint="برای حرکات زمان‌محور ۱" error={sprErr}>
                <input id="ex-spr" type="number" step="0.1" min="0.5" max="20" inputMode="decimal" value={form.sec_per_rep ?? ''}
                  onChange={set('sec_per_rep')}
                  aria-invalid={sprErr ? 'true' : undefined}
                  aria-describedby={sprErr ? 'ex-spr-error' : 'ex-spr-hint'} />
              </Field>
              <Field id="ex-gif" label="لینک گیف">
                <input id="ex-gif" type="url" dir="ltr" value={form.gif_url ?? ''} onChange={set('gif_url')} />
              </Field>
            </div>
            <Field id="ex-page" label="لینک صفحه آموزش">
              <input id="ex-page" type="url" dir="ltr" value={form.page_url ?? ''} onChange={set('page_url')} />
            </Field>
            <Field id="ex-how" label="آموزش اجرا">
              <textarea id="ex-how" value={form.how_to ?? ''} onChange={set('how_to')} />
            </Field>
            <Field id="ex-tip" label="نکته">
              <textarea id="ex-tip" value={form.tip ?? ''} onChange={set('tip')} />
            </Field>
            {unmappedErrs.length > 0 && (
              <p className="ferr" role="alert">{unmappedErrs.join(' — ')}</p>
            )}
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? 'در حال ذخیره…' : 'ذخیره'}
              </button>
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>انصراف</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
