import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { THEMES, isKnownTheme } from '../lib/themes.js'

export default function Layout({ children }) {
  const { profile, signOut, updateTheme } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    document.body.dataset.theme = isKnownTheme(profile?.theme) ? profile.theme : 'sadeq'
  }, [profile?.theme])

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  const initials = (profile?.name || '?').trim().slice(0, 1)

  return (
    <>
      <header className="app-header">
        <div className="wrap header-inner">
          <span className="brand">GYMBook</span>
          <nav className="nav" aria-label="ناوبری اصلی">
            <NavLink to="/" end>امروز</NavLink>
            <NavLink to="/programs">برنامه‌ها</NavLink>
            <NavLink to="/report">گزارش</NavLink>
            {profile?.role === 'admin' && <NavLink to="/admin">پنل ادمین</NavLink>}
          </nav>
          <div className="user-menu" ref={menuRef}>
            <button type="button" className="user-chip" aria-haspopup="menu" aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}>
              <span className="avatar" aria-hidden="true">{initials}</span>
              <span className="username">{profile?.name}</span>
            </button>
            {menuOpen && (
              <div className="dropdown" role="menu">
                <NavLink to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>پروفایل</NavLink>
                <div className="theme-row" role="group" aria-label="تم رنگی">
                  {THEMES.map((t) => (
                    <button type="button" key={t.key} role="menuitemradio" aria-checked={profile?.theme === t.key}
                      className={`theme-dot ${profile?.theme === t.key ? 'active' : ''}`}
                      style={{ '--dot': t.color }} title={t.label}
                      onClick={() => { updateTheme?.(t.key); setMenuOpen(false) }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="logout" role="menuitem" onClick={signOut}>خروج</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="wrap">{children !== undefined ? children : <Outlet />}</main>
      <footer className="wrap foot">
        <a href="/GYMBook/legacy.html" target="_self">نسخه ساده قدیمی</a>
      </footer>
    </>
  )
}
