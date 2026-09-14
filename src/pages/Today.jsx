import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth.jsx'
import { fetchProgramTree, fetchChecks, toggleCheck } from '../lib/api.js'
import { fa, dayPercent, calcKcal, localISO } from '../lib/calc.js'
import DayNav from '../components/DayNav.jsx'
import ExerciseCard from '../components/ExerciseCard.jsx'
import TimerBar from '../components/TimerBar.jsx'

const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed']
function todayDefaultIndex(days, now = new Date()) {
  const map = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4 }
  const key = WEEK[now.getDay() in map ? map[now.getDay()] : 0] || 'sat'
  const idx = days.findIndex((d) => d.day_key === key)
  return idx >= 0 ? idx : 0
}

const SECTIONS = [
  ['warm', 'گرم کردن'],
  ['main', 'تمرین اصلی'],
  ['cool', 'سرد کردن'],
]

function NoProgram() {
  return (
    <div className="card center">
      <h2>برنامه‌ای یافت نشد</h2>
      <p className="muted">هنوز برنامه‌ای به شما اختصاص داده نشده است.</p>
    </div>
  )
}

export default function Today() {
  const { profile } = useAuth()
  const date = localISO()
  const qc = useQueryClient()
  const checksKey = ['checks', profile?.id, date]
  const [currentDay, setCurrentDay] = useState(null)
  const [opError, setOpError] = useState('')

  const programQuery = useQuery({
    queryKey: ['program', profile?.program_id],
    queryFn: () => fetchProgramTree(profile?.program_id),
    enabled: !!profile?.program_id,
  })
  const checksQuery = useQuery({
    queryKey: checksKey,
    queryFn: () => fetchChecks(profile.id, date),
    enabled: !!profile?.id,
  })

  const days = useMemo(() => programQuery.data ?? [], [programQuery.data])

  useEffect(() => {
    if (currentDay === null && days.length) setCurrentDay(todayDefaultIndex(days))
  }, [days, currentDay])

  const checks = useMemo(() => checksQuery.data ?? [], [checksQuery.data])
  const checksByItem = useMemo(() => {
    const m = new Map()
    checks.forEach((c) => m.set(c.item_id, c))
    return m
  }, [checks])

  const selected = days[currentDay ?? 0]
  const itemsBySection = useMemo(() => {
    const g = { warm: [], main: [], cool: [] }
    ;(selected?.items ?? []).forEach((it) => {
      if (!it.exercise) return
      ;(g[it.section] ??= []).push(it)
    })
    Object.values(g).forEach((arr) => arr.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)))
    return g
  }, [selected])

  const mainTotal = itemsBySection.main.length
  const mainDone = itemsBySection.main.filter((it) => checksByItem.has(it.id)).length
  const pct = dayPercent(mainDone, mainTotal)
  const totalKcal = useMemo(
    () => checks.reduce((s, c) => s + (Number(c.kcal) || 0), 0),
    [checks]
  )

  const defaultLen = useMemo(() => {
    const recent = checks
      .filter((c) => c.created_at)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
    if (!recent) return undefined
    for (const day of days) {
      const it = (day.items ?? []).find((x) => x.id === recent.item_id)
      if (it) return it.rest_sec
    }
    return undefined
  }, [checks, days])

const mutation = useMutation({
    mutationFn: (args) => toggleCheck(args),
    onMutate: async (args) => {
      setOpError('')
      await qc.cancelQueries({ queryKey: checksKey })
      const prev = qc.getQueryData(checksKey)
      const tempId = `temp:${args.item.id}`
      if (args.existing) {
        // optimistic delete
        qc.setQueryData(checksKey, (old) => {
          const list = old ? [...old] : []
          return list.filter(c => c.id !== args.existing.id)
        })
      } else {
        // optimistic add
        qc.setQueryData(checksKey, (old) => {
          const list = old ? [...old] : []
          return [...list, {
            id: tempId,
            item_id: args.item.id,
            date,
            day_key: args.dayKey,
            kcal: calcKcal(args.exercise, args.item, args.weightKg),
          }]
        })
      }
      return { prev }
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.prev) qc.setQueryData(checksKey, ctx.prev)
      setOpError('خطا در ذخیره تغییرات — لطفاً دوباره تلاش کنید')
    },
    onSuccess: () => setOpError(''),
    onSettled: () => qc.invalidateQueries({ queryKey: checksKey }),
  })

  if (!profile?.program_id) return <NoProgram />
  if (programQuery.isLoading) {
    return <div className="center muted" role="status">در حال بارگذاری…</div>
  }
  if (programQuery.isError) {
    return (
      <div className="card center">
        <p className="err">خطا در دریافت برنامه تمرین</p>
        <button type="button" className="btn" onClick={() => programQuery.refetch()}>تلاش مجدد</button>
      </div>
    )
  }
  if (days.length === 0) return <NoProgram />

  return (
    <>
      {checksQuery.isError && (
        <div className="err-banner">خطا در دریافت وضعیت تیک‌ها — اتصال را بررسی کنید</div>
      )}
      {opError && <div className="err-banner">{opError}</div>}

      <DayNav days={days} current={currentDay ?? 0} onSelect={setCurrentDay} />

      {selected && (
        <div className="dayhead">
          <h2>{selected.title || selected.day_label}</h2>
          {selected.sub ? <p className="sub">{selected.sub}</p> : null}
          <div className="chips">
            {selected.focus ? <span className="chip">{selected.focus}</span> : null}
            <span className="chip">🔥 {fa(Math.round(totalKcal))} کیلوکالری</span>
          </div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="barlbl">
            {fa(mainDone)} از {fa(mainTotal)} حرکت اصلی انجام شد ({fa(pct)}٪)
          </span>
        </div>
      )}

      <div id="content">
        {SECTIONS.map(([key, label]) => (
          <React.Fragment key={key}>
            {itemsBySection[key].length > 0 && <div className="sect">{label}</div>}
            {itemsBySection[key].map((it, i) => {
              const check = checksByItem.get(it.id)
              return (
                <ExerciseCard
                  key={it.id ?? `${key}-${i}`}
                  item={it}
                  exercise={it.exercise}
                  index={i + 1}
                  done={!!check}
                  check={check}
                  weightKg={profile.weight_kg}
                  onToggle={() => mutation.mutate({
                    userId: profile.id,
                    date,
                    dayKey: selected.day_key,
                    item: it,
                    exercise: it.exercise,
                    weightKg: profile.weight_kg,
                    existing: check || null,
                  })}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>

      <TimerBar defaultLen={defaultLen} />
    </>
  )
}
