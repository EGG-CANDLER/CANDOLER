import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'

import { useAuth } from '../context/AuthContext'

// Redirects unauthenticated users to /login.
// Shows a spinner while session is resolving.
// Never trusts client state for data access — data is scoped by RLS + JWT server-side.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <RefreshCw className="size-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Verifying session…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
