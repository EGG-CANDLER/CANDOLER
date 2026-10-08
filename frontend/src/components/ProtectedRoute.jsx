import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

// Redirects unauthenticated users to /login; shows a spinner while the
// Supabase session is still being resolved.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
