import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const MAX_ATTEMPTS = 10
const RETRY_MS = 2000

export default function Protected({ children }) {
  const { session, profile, loading, signOut, refresh } = useAuth()
  const [attempts, setAttempts] = useState(0)
  const awaitingProfile = !!session && !profile && !loading

  useEffect(() => {
    if (!awaitingProfile) setAttempts(0)
  }, [awaitingProfile])

  useEffect(() => {
    if (!awaitingProfile || attempts >= MAX_ATTEMPTS) return
    const t = setTimeout(() => {
      setAttempts((a) => a + 1)
      refresh()
    }, RETRY_MS)
    return () => clearTimeout(t)
  }, [awaitingProfile, attempts, refresh])

  if (loading) return <div className="center muted" role="status">در حال بارگذاری…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    if (attempts >= MAX_ATTEMPTS) {
      return (
        <div className="card center">
          <p className="err">خطا در دریافت پروفایل — لطفاً دوباره تلاش کنید</p>
          <button type="button" className="btn" onClick={() => { setAttempts(0); refresh() }}>تلاش مجدد</button>
        </div>
      )
    }
    return <div className="center muted" role="status">در حال بارگذاری…</div>
  }
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