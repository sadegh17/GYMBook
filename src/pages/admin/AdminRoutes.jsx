import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import Users from './Users.jsx'

// Exercises and Programs admin panels are filled in by Tasks 11-12.
export function ExercisesStub() {
  return (
    <div className="card">
      <h2>تمرین‌ها</h2>
      <p className="muted">مدیریت تمرین‌ها در اینجا انجام خواهد شد.</p>
    </div>
  )
}

export function ProgramsStub() {
  return (
    <div className="card">
      <h2>برنامه‌ها</h2>
      <p className="muted">مدیریت برنامه‌ها در اینجا انجام خواهد شد.</p>
    </div>
  )
}

export default function AdminRoutes() {
  const { profile } = useAuth()
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <Routes>
      <Route index element={<Navigate to="users" replace />} />
      <Route path="users" element={<Users />} />
      <Route path="exercises" element={<ExercisesStub />} />
      <Route path="programs" element={<ProgramsStub />} />
      <Route path="*" element={<Navigate to="users" replace />} />
    </Routes>
  )
}
