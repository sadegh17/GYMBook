import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import AdminTabs from '../../components/AdminTabs.jsx'
import Users from './Users.jsx'
import Exercises from './Exercises.jsx'
import Programs from './Programs.jsx'

export default function AdminRoutes() {
  const { profile } = useAuth()
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <>
      <AdminTabs />
      <Routes>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<Users />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="programs" element={<Programs />} />
        <Route path="*" element={<Navigate to="users" replace />} />
      </Routes>
    </>
  )
}
