import React, { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const THEMES = ['sadeq', 'saghar']

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()

  useEffect(() => {
    document.body.dataset.theme = THEMES.includes(profile?.theme) ? profile.theme : 'sadeq'
  }, [profile?.theme])

  return (
    <>
      <header className="app-header">
        <div className="wrap header-inner">
          <span className="brand">GYMBook</span>
          <span className="username">{profile?.name}</span>
        </div>
        <nav className="wrap nav">
          <NavLink to="/" end>امروز</NavLink>
          <NavLink to="/programs">برنامه‌ها</NavLink>
          <NavLink to="/report">گزارش</NavLink>
          <NavLink to="/profile">پروفایل</NavLink>
          {profile?.role === 'admin' && <NavLink to="/admin">پنل ادمین</NavLink>}
          <button type="button" className="logout" onClick={signOut}>خروج</button>
        </nav>
      </header>
      <main className="wrap">{children !== undefined ? children : <Outlet />}</main>
      <footer className="wrap foot">
        <a href="/GYMBook/legacy.html" target="_self">نسخه ساده قدیمی</a>
      </footer>
    </>
  )
}