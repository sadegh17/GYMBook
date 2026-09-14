import React from 'react'

export default function DayNav({ days, current, onSelect }) {
  return (
    <nav className="days">
      {days.map((d, i) => (
        <button
          type="button"
          key={d.id ?? d.day_key ?? i}
          className={i === current ? 'active' : undefined}
          aria-current={i === current ? 'true' : undefined}
          onClick={() => onSelect(i)}
        >
          {d.day_label}
          {d.focus ? <small>{d.focus}</small> : null}
        </button>
      ))}
    </nav>
  )
}
