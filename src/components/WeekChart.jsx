import React from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { fa } from '../lib/calc.js'

// Assumption: main programs schedule 5 workout days per week (Sat–Wed plan).
// The percentage bar therefore = distinct trained days / SCHEDULED_DAYS_PER_WEEK, capped at 100,
// instead of the (complex) per-program scheduled-day count.
const SCHEDULED_DAYS_PER_WEEK = 5
const WEEK_COUNT = 4

const toUTC = (d) => new Date(d + 'T00:00:00Z')
const addDaysUTC = (iso, n) => {
  const dt = toUTC(iso); dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
// JS getUTCDay(): Sunday === 0 … Saturday === 6; Persian week starts Saturday,
// so the offset back to the week start is (day + 1) % 7.
const weekdayOffsetUTC = (iso) => (toUTC(iso).getUTCDay() + 1) % 7

const rangeFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' })
const dayFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })

function weekLabel(startISO, endISO) {
  const s = new Date(startISO + 'T12:00:00')
  const e = new Date(endISO + 'T12:00:00')
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  return sameMonth
    ? `${dayFmt.format(s)}–${rangeFmt.format(e)}`
    : `${rangeFmt.format(s)}–${rangeFmt.format(e)}`
}

export function buildWeeks(rows, refISO) {
  const ref = toUTC(refISO)
  const thisWeekStart = addDaysUTC(refISO, -weekdayOffsetUTC(refISO))
  const weeks = []
  for (let i = WEEK_COUNT - 1; i >= 0; i--) {
    const start = addDaysUTC(thisWeekStart, -7 * i)
    const end = addDaysUTC(start, 6)
    weeks.push({ start, end, label: weekLabel(start, end), kcal: 0, trained: new Set(), pct: 0 })
  }
  ;(rows ?? []).forEach((r) => {
    const w = weeks.find((x) => x.start <= r.date && r.date <= x.end)
    if (!w) return
    w.kcal += Number(r.kcal) || 0
    if ((Number(r.main_done) || 0) > 0) w.trained.add(r.date)
  })
  return weeks.map((w) => ({
    label: w.label,
    kcal: Math.round(w.kcal),
    pct: Math.min(100, Math.round((w.trained.size / SCHEDULED_DAYS_PER_WEEK) * 100)),
  }))
}

export default function WeekChart({ rows, today }) {
  const data = buildWeeks(rows, today)
  return (
    <div className="card" data-week-chart>
      <h3>۴ هفته اخیر</h3>
      <div dir="ltr" style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #2b3446)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="kcal"
              orientation="left"
              tickFormatter={(v) => fa(v)}
              tick={{ fontSize: 11 }}
              width={44}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => fa(`${v}٪`)}
              tick={{ fontSize: 11 }}
              width={36}
            />
            <Tooltip
              formatter={(value, name) => [
                name === 'kcal' ? fa(`${value} kcal`) : fa(`${value}٪`),
                name === 'kcal' ? 'کیلوکالری' : 'درصد روزهای تمرین',
              ]}
            />
            <Bar yAxisId="kcal" dataKey="kcal" name="kcal" fill="var(--acc, #6366f1)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="pct" dataKey="pct" name="pct" fill="var(--ok, #22c55e)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
