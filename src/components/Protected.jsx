import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

export default function Protected({ children }) {
  const { session, profile, loading, signOut, refresh } = useAuth()
  const awaitingProfile = !!session && !profile && !loading

  useEffect(() => {
    if (!awaitingProfile) return
    const t = setTimeout(refresh, 2000)
    return () => clearTimeout(t)
  }, [awaitingProfile, refresh])

  if (loading) return <div className="center muted" role="status">در حال بارگذاری…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <div className="center muted" role="status">در حال بارگذاری…</div>
  if (!profile.approved) {
    return (
      <div className="card center">
        <h2>در انتظار تایید ادمین</h2>
        <p className="muted">حساب شما هنوز توسط ادمین تایید نشده است.</p>
        <button type="button" className="btn" onClick={signOut}>خروج</button>
      </div>
    )
  }
  return children
}