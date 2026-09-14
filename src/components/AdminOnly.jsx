import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

export default function AdminOnly({ children }) {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}