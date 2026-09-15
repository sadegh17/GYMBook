import React from 'react'

const dayMonthFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })

function formatDate(iso) {
  if (!iso) return null
  const dt = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return null
  return dayMonthFmt.format(dt)
}

export default function DayNav({ days, current, dates, onSelect }) {
  return (
    <nav className="days">
      {days.map((d, i) => {
        const date = dates ? formatDate(dates[d.day_key]) : null
        return (
          <button
            type="button"
            key={d.id ?? d.day_key ?? i}
            className={i === current ? 'active' : undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => onSelect(i)}
          >
            {d.day_label}
            {date ? <small>{date}</small> : null}
            {d.focus ? <small>{d.focus}</small> : null}
          </button>
        )
      })}
    </nav>
  )
}
