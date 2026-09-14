import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth.jsx'
import Login from './pages/Login.jsx'
import Protected from './components/Protected.jsx'
import Layout from './components/Layout.jsx'
import AdminOnly from './components/AdminOnly.jsx'
import Today from './pages/Today.jsx'
import Report from './pages/Report.jsx'
import Profile from './pages/Profile.jsx'
import AdminRoutes from './pages/AdminRoutes.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route index element={<Today />} />
          <Route path="report" element={<Report />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin/*" element={<AdminOnly><AdminRoutes /></AdminOnly>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}