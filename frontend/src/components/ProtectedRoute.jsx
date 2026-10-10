import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'

import { useAuth } from '../context/AuthContext'

// Redirects unauthenticated users to /login; shows a loading state while resolving session.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <RefreshCw className="size-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Resolving session…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
