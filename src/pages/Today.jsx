import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth.jsx'
import { fetchProgramTree, fetchChecks, toggleCheck } from '../lib/api.js'
import { fetchSelectablePrograms } from '../lib/programs.js'
import { fa, dayPercent, calcKcal, localISO } from '../lib/calc.js'
import { todayDayKey } from '../lib/programDays.js'
import DayNav from '../components/DayNav.jsx'
import ExerciseCard from '../components/ExerciseCard.jsx'
import TimerBar from '../components/TimerBar.jsx'

function todayDefaultIndex(days, now = new Date()) {
  const idx = days.findIndex((d) => d.day_key === todayDayKey(now))
  return idx >= 0 ? idx : 0
}

function NoProgram({ hasPrograms }) {
  return (
    <div className="card center">
      <h2>برنامه‌ای یافت نشد</h2>
      {hasPrograms
        ? <p className="muted">برنامه‌ای انتخاب نشده است. از بالا یک برنامه را برگزین.</p>
        : <p className="muted">هنوز برنامه‌ای نداری. به بخش «برنامه‌های من» برو و یک برنامه بساز.</p>}
    </div>
  )
}

export default function Today() {
  const { profile } = useAuth()
  const date = localISO()
  const qc = useQueryClient()
  const checksKey = ['checks', profile?.id, date]
  const [currentDay, setCurrentDay] = useState(null)
  const [programId, setProgramId] = useState(profile?.program_id ?? null)
  const [opError, setOpError] = useState('')

  const programsQuery = useQuery({
    queryKey: ['selectable', profile?.id],
    queryFn: () => fetchSelectablePrograms(profile.id, profile.program_id),
    enabled: !!profile?.id,
  })
  const programs = programsQuery.data ?? []

  const programQuery = useQuery({
    queryKey: ['program-tree', programId],
    queryFn: () => fetchProgramTree(programId),
    enabled: !!programId,
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

  const groups = useMemo(() => {
    const secs = selected?.sections ?? []
    const items = (selected?.items ?? []).filter((it) => it.exercise)
    return secs.map((sec) => ({
      ...sec,
      items: items.filter((it) => it.section_id === sec.id).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    }))
  }, [selected])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const mainTotal = flatItems.length
  const mainDone = flatItems.filter((it) => checksByItem.has(it.id)).length
  const pct = dayPercent(mainDone, mainTotal)
  const totalKcal = useMemo(() => checks.reduce((s, c) => s + (Number(c.kcal) || 0), 0), [checks])

  const defaultLen = useMemo(() => {
    const recent = checks.filter((c) => c.created_at)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
    if (!recent) return undefined
    const it = flatItems.find((x) => x.id === recent.item_id)
    return it ? it.rest_sec : undefined
  }, [checks, flatItems])

  const mutation = useMutation({
    mutationFn: (args) => toggleCheck(args),
    onMutate: async (args) => {
      setOpError('')
      await qc.cancelQueries({ queryKey: checksKey })
      const prev = qc.getQueryData(checksKey)
      const tempId = `temp:${args.item.id}`
      if (args.existing) {
        qc.setQueryData(checksKey, (old) => (old ? [...old] : []).filter((c) => c.id !== args.existing.id))
      } else {
        qc.setQueryData(checksKey, (old) => [...(old ? [...old] : []), {
          id: tempId, item_id: args.item.id, date, day_key: args.dayKey,
          kcal: calcKcal(args.exercise, args.item, args.weightKg),
        }])
      }
      return { prev }
    },
    onError: (_e, _a, ctx) => {
      if (ctx?.prev) qc.setQueryData(checksKey, ctx.prev)
      setOpError('خطا در ذخیره تغییرات — لطفاً دوباره تلاش کنید')
    },
    onSuccess: () => setOpError(''),
    onSettled: () => qc.invalidateQueries({ queryKey: checksKey }),
  })

  if (programQuery.isError) {
    return (
      <div className="card center">
        <p className="err">خطا در دریافت برنامه تمرین</p>
        <button type="button" className="btn" onClick={() => programQuery.refetch()}>تلاش مجدد</button>
      </div>
    )
  }

  if (!programId && programs.length === 0) return <NoProgram hasPrograms={false} />
  if (programId && days.length === 0) return <NoProgram hasPrograms />

  let flatIndex = 0
  return (
    <>
      {checksQuery.isError && <div className="err-banner">خطا در دریافت وضعیت تیک‌ها — اتصال را بررسی کنید</div>}
      {opError && <div className="err-banner">{opError}</div>}

      {programs.length > 0 && (
        <div className="prog-picker">
          <select aria-label="انتخاب برنامه" value={programId ?? ''}
            onChange={(e) => setProgramId(e.target.value || profile.program_id)}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.title}{p.isDefault ? ' (پیش‌فرض)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      <DayNav days={days} current={currentDay ?? 0} onSelect={setCurrentDay} />

      {selected && (
        <div className="dayhead">
          <h2>{selected.title || selected.day_label}</h2>
          {selected.sub ? <p className="sub">{selected.sub}</p> : null}
          <div className="chips">
            {selected.focus ? <span className="chip">{selected.focus}</span> : null}
            <span className="chip">کالری: {fa(Math.round(totalKcal))}</span>
          </div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="barlbl">
            {fa(mainDone)} از {fa(mainTotal)} حرکت انجام شد ({fa(pct)}٪)
          </span>
        </div>
      )}

      <div id="content">
        {groups.map((g) => (
          <React.Fragment key={g.id}>
            {g.items.length > 0 && <div className="sect">{g.name}</div>}
            {g.items.map((it) => {
              const check = checksByItem.get(it.id)
              const idx = ++flatIndex
              return (
                <ExerciseCard
                  key={it.id ?? `${g.id}-${idx}`}
                  item={it}
                  exercise={it.exercise}
                  index={idx}
                  done={!!check}
                  check={check}
                  weightKg={profile.weight_kg}
                  onToggle={() => mutation.mutate({
                    userId: profile.id, date, dayKey: selected.day_key,
                    item: it, exercise: it.exercise, weightKg: profile.weight_kg, existing: check || null,
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

