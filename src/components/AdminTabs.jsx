import React from 'react'
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/admin/users', label: 'کاربران' },
  { to: '/admin/exercises', label: 'حرکات' },
  { to: '/admin/programs', label: 'برنامه‌ها' },
]

export default function AdminTabs() {
  return (
    <nav className="admin-tabs" aria-label="بخش‌های پنل ادمین">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
