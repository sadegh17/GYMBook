import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/auth.jsx'
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
            <label>نام فارسی
              <input type="text" value={form.name_fa} onChange={set('name_fa')} required />
            </label>
            <label>نام انگلیسی
              <input type="text" dir="ltr" value={form.name_en ?? ''} onChange={set('name_en')} />
            </label>
            {duplicateWarn && <p className="err" role="alert">حرکت دیگری با همین نام انگلیسی وجود دارد</p>}
            <label>لینک گیف
              <input type="url" dir="ltr" value={form.gif_url ?? ''} onChange={set('gif_url')} />
            </label>
            <label>لینک صفحه
              <input type="url" dir="ltr" value={form.page_url ?? ''} onChange={set('page_url')} />
            </label>
            <label>آموزش اجرا
              <textarea value={form.how_to ?? ''} onChange={set('how_to')} />
            </label>
            <label>نکته
              <textarea value={form.tip ?? ''} onChange={set('tip')} />
            </label>
            <label>MET
              <input type="number" step="0.1" min="1" max="15" value={form.met ?? ''} onChange={set('met')} />
            </label>
            <label>ثانیه بر تکرار
              <input type="number" step="0.1" min="0.5" max="20" value={form.sec_per_rep ?? ''} onChange={set('sec_per_rep')} />
            </label>
            {errs.length > 0 && (
              <ul>
                {errs.map((m) => <li key={m} className="err" role="alert">{m}</li>)}
              </ul>
            )}
            <button type="submit" className="btn primary" disabled={busy}>ذخیره</button>
            {' '}
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>انصراف</button>
          </form>
        </div>
      )}
    </div>
  )
}
