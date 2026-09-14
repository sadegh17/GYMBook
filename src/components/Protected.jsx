import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const MAX_ATTEMPTS = 10
const RETRY_MS = 2000
const POLL_MS = 10000

export default function Protected({ children }) {
  const { session, profile, loading, signOut, refresh } = useAuth()
  const [attempts, setAttempts] = useState(0)
  const awaitingProfile = !!session && !profile && !loading
  const awaitingApproval = !!session && !!profile && !profile.approved

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

  useEffect(() => {
    if (!awaitingApproval) return
    const t = setInterval(() => refresh(), POLL_MS)
    return () => clearInterval(t)
  }, [awaitingApproval, refresh])

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
    const rejected = profile.status === 'rejected'
    return (
      <div className="card center">
        <h2>{rejected ? 'درخواست شما رد شد' : 'در انتظار تایید ادمین'}</h2>
        <p className="muted">
          {rejected
            ? 'متأسفانه درخواست ثبت‌نام شما رد شد. برای پیگیری با ادمین تماس بگیرید.'
            : 'حساب شما هنوز توسط ادمین تایید نشده است. پس از تایید، به‌صورت خودکار وارد می‌شوید.'}
        </p>
        <button type="button" className="btn" onClick={signOut}>خروج</button>
      </div>
    )
  }
  return children
}