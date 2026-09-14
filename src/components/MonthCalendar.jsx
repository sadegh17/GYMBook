import React from 'react'
import { monthMatrix } from '../lib/calendar.js'
import { fa, dayPercent } from '../lib/calc.js'

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const dayFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })

function Cell({ date, row }) {
  if (!date) return <div className="cal-cell empty" data-cal-cell="" aria-hidden="true" />
  const total = Number(row?.main_total) || 0
  const done = Number(row?.main_done) || 0
  const kcal = Number(row?.kcal) || 0
  const pct = dayPercent(done, total)
  const state = total === 0 || !row ? 'none' : pct >= 100 ? 'full' : 'partial'
  const label = dayFmt.format(new Date(date + 'T12:00:00'))
  return (
    <div
      className={`cal-cell ${state}`}
      data-cal-cell={date}
      title={total > 0 ? `${fa(pct)}٪ • ${fa(Math.round(kcal))} kcal` : undefined}
    >
      <span className="cal-day">{label}</span>
      {total > 0 && (
        <>
          <span className="cal-bar"><i style={{ width: `${pct}%` }} /></span>
          {kcal > 0 && <span className="cal-kcal">≈{fa(Math.round(kcal))} kcal</span>}
        </>
      )}
    </div>
  )
}

export default function MonthCalendar({ year, month, byDate }) {
  const cells = monthMatrix(year, month)
  return (
    <div className="cal" role="grid" aria-label="تقویم ماهانه">
      <div className="cal-head" role="row">
        {WEEKDAYS.map((w) => <span key={w} role="columnheader">{w}</span>)}
      </div>
      <div className="cal-grid" role="rowgroup">
        {cells.map((date, i) => (
          <Cell key={date ?? `pad-${i}`} date={date} row={date ? byDate.get(date) : undefined} />
        ))}
      </div>
    </div>
  )
}
