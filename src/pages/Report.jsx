import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { fa, computeStreak, bestStreak, localISO } from '../lib/calc.js'
import MonthCalendar from '../components/MonthCalendar.jsx'

const pad2 = (n) => String(n).padStart(2, '0')
const firstOfMonth = (y, m) => `${y}-${pad2(m + 1)}-01`
const lastOfMonth = (y, m) => `${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`

async function fetchMonthProgress(userId, year, month) {
  const { data, error } = await supabase.from('v_day_progress')
    .select('*').eq('user_id', userId)
    .gte('date', firstOfMonth(year, month)).lte('date', lastOfMonth(year, month))
  if (error) throw error
  return data
}

async function fetchCheckDates(userId) {
  const { data, error } = await supabase.from('checks')
    .select('date').eq('user_id', userId).order('date')
  if (error) throw error
  return data
}

export default function Report() {
  const { profile } = useAuth()
  const today = localISO()
  const [view, setView] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })

  const progressQuery = useQuery({
    queryKey: ['progress', profile?.id, view.y, view.m],
    queryFn: () => fetchMonthProgress(profile.id, view.y, view.m),
    enabled: !!profile?.id,
  })
  const checksQuery = useQuery({
    queryKey: ['check-dates', profile?.id],
    queryFn: () => fetchCheckDates(profile.id),
    enabled: !!profile?.id,
  })

  const byDate = useMemo(() => {
    const m = new Map()
    ;(progressQuery.data ?? []).forEach((r) => m.set(r.date, r))
    return m
  }, [progressQuery.data])

  const rows = useMemo(() => progressQuery.data ?? [], [progressQuery.data])

  const { currentStreak, best, monthKcal, daysTrained } = useMemo(() => {
    const dates = new Set((checksQuery.data ?? []).map((c) => c.date))
    const kcal = rows.reduce((s, r) => s + (Number(r.kcal) || 0), 0)
    const trained = rows.filter((r) => (Number(r.main_done) || 0) > 0).length
    return {
      currentStreak: computeStreak(dates, today),
      best: bestStreak(dates),
      monthKcal: kcal,
      daysTrained: trained,
    }
  }, [checksQuery.data, rows, today])

  const title = new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' })
    .format(new Date(view.y, view.m, 15))

  const move = (delta) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  if (progressQuery.isError) {
    return (
      <div className="card center">
        <p className="err">خطا در دریافت گزارش ماهانه</p>
        <button type="button" className="btn" onClick={() => progressQuery.refetch()}>تلاش مجدد</button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="report-head">
        <h2>{title}</h2>
        <div className="report-nav">
          <button type="button" aria-label="ماه قبل" onClick={() => move(-1)}>⟨</button>
          <button type="button" aria-label="ماه بعد" onClick={() => move(1)}>⟩</button>
        </div>
      </div>

      {progressQuery.isLoading
        ? <div className="center muted" role="status">در حال بارگذاری…</div>
        : <MonthCalendar year={view.y} month={view.m} byDate={byDate} />}

      <div className="summary-cards">
        <div className="summary-card">
          <b>{fa(currentStreak)}</b>
          <span>استریک فعلی (روز)</span>
        </div>
        <div className="summary-card">
          <b>{fa(best)}</b>
          <span>بهترین استریک</span>
        </div>
        <div className="summary-card">
          <b>{fa(Math.round(monthKcal))}</b>
          <span>کیلوکالری این ماه</span>
        </div>
        <div className="summary-card">
          <b>{fa(daysTrained)}</b>
          <span>روز تمرین‌شده</span>
        </div>
      </div>

      {/* Task 9: WeekChart and ExerciseHistory mount here */}
    </div>
  )
}
