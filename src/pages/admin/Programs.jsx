import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/auth.jsx'
import Field from '../../components/Field.jsx'
import ProgramBuilder from '../../components/ProgramBuilder.jsx'

async function fetchPrograms() {
  const { data, error } = await supabase.from('programs')
    .select('id,title,description').is('owner_id', null).eq('is_deleted', false).order('created_at')
  if (error) throw error
  return data
}

export default function Programs() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const qc = useQueryClient()
  const [programId, setProgramId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [err, setErr] = useState('')

  const programsQuery = useQuery({ queryKey: ['programs'], queryFn: fetchPrograms, enabled: isAdmin })
  const programs = programsQuery.data ?? []

  const create = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) { setErr('عنوان برنامه الزامی است'); return }
    setBusy(true); setErr(''); setToast('')
    try {
      const { error } = await supabase.from('programs')
        .insert({
          title: newTitle.trim(), description: newDesc.trim() || null,
          created_by: profile?.id ?? null, owner_id: null, is_deleted: false,
        })
      if (error) throw error
      setNewTitle(''); setNewDesc('')
      qc.invalidateQueries({ queryKey: ['programs'] })
      setToast('برنامه ساخته شد')
    } catch {
      setErr('خطا در ساخت برنامه')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="wrap">
      <div className="card">
        <h2>برنامه‌ها</h2>
        {err && <p className="err" role="alert">{err}</p>}
        {toast && <div className="ok-banner" role="status">{toast}</div>}
        <form onSubmit={create} noValidate>
          <div className="field-row">
            <Field id="pg-title" label="عنوان برنامه">
              <input id="pg-title" type="text" value={newTitle} maxLength={60} onChange={(e) => setNewTitle(e.target.value)} />
            </Field>
            <Field id="pg-desc" label="توضیح">
              <input id="pg-desc" type="text" value={newDesc} maxLength={120} onChange={(e) => setNewDesc(e.target.value)} />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={busy}>برنامه جدید</button>
          </div>
        </form>
        {programsQuery.isLoading && <div className="center muted" role="status">در حال بارگذاری…</div>}
        {programsQuery.isError && (
          <div className="center">
            <p className="err">خطا در دریافت برنامه‌ها</p>
            <button type="button" className="btn" onClick={() => programsQuery.refetch()}>تلاش مجدد</button>
          </div>
        )}
        <div className="pb-list">
          {programs.map((p) => (
            <button type="button" key={p.id} className={'btn' + (p.id === programId ? ' primary' : '')}
              aria-pressed={p.id === programId} onClick={() => setProgramId(p.id)}>{p.title}</button>
          ))}
        </div>
      </div>
      {programId && <div className="card"><ProgramBuilder programId={programId} /></div>}
    </div>
  )
}
