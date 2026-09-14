import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { fa, localISO } from '../lib/calc.js'

const DAY_MS = 86400000
const RANGE_DAYS = 90

const dateFmt = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' })

export function groupHistory(rows) {
  const map = new Map()
  ;(rows ?? []).forEach((r) => {
    const name = r.item?.exercise?.name_fa
    if (!name) return
    const entry = map.get(name) || { name, seen: new Set(), sets: 0, last: '' }
    entry.seen.add(r.date)
    entry.sets += Number(r.item.sets) || 0
    if (r.date > entry.last) entry.last = r.date
    map.set(name, entry)
  })
  return [...map.values()]
    .sort((a, b) => (b.seen.size - a.seen.size) || (a.name < b.name ? -1 : 1))
    .map(({ name, seen, sets, last }) => ({ name, sessions: seen.size, sets, last }))
}

async function fetchHistory(userId) {
  const from = localISO(new Date(Date.now() - RANGE_DAYS * DAY_MS))
  const { data, error } = await supabase.from('checks')
    .select('date, kcal, item:program_items(sets, exercise:exercises(name_fa))')
    .eq('user_id', userId)
    .gte('date', from)
  if (error) throw error
  return data
}

export default function ExerciseHistory() {
  const { profile } = useAuth()
  const query = useQuery({
    queryKey: ['exercise-history', profile?.id],
    queryFn: () => fetchHistory(profile.id),
    enabled: !!profile?.id,
  })

  const rows = useMemo(() => groupHistory(query.data ?? []), [query.data])

  if (query.isError) {
    return (
      <div className="card center">
        <p className="err">خطا در دریافت تاریخچه حرکات</p>
        <button type="button" className="btn" onClick={() => query.refetch()}>تلاش مجدد</button>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>تاریخچه حرکات (۹۰ روز اخیر)</h3>
      {query.isLoading
        ? <div className="center muted" role="status">در حال بارگذاری…</div>
        : rows.length === 0
          ? <p className="muted">هنوز داده‌ای ثبت نشده است.</p>
          : (
            <div className="card-table">
            <table className="history-table">
              <thead>
                <tr>
                  <th>نام حرکت</th>
                  <th>تعداد جلسات</th>
                  <th>مجموع ست</th>
                  <th>آخرین تمرین</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{fa(r.sessions)}</td>
                    <td>{fa(r.sets)}</td>
                    <td>{dateFmt.format(new Date(r.last + 'T12:00:00'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
    </div>
  )
}
