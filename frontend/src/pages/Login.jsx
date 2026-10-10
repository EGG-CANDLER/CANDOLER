import * as React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Lock, Mail } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { ModeToggle } from '../components/ui/ModeToggle'
import { BackgroundRipple } from '../components/ui/BackgroundRipple'
import Logo from '../components/Logo'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Already signed in? Go straight to the app.
  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await signIn(email, password)
    setSubmitting(false)
    if (err) {
      setError(err.message || 'Sign in failed')
      return
    }
    const to = location.state?.from?.pathname || '/'
    navigate(to, { replace: true })
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4">
      <BackgroundRipple />

      {/* Mode toggle top right */}
      <div className="absolute top-4 right-4 z-20">
        <ModeToggle />
      </div>

      <div className="w-full max-w-md z-10">
        <Card className="shadow-md">
          <CardHeader className="text-center flex flex-col items-center pb-2">
            <div className="mb-2">
              <Logo size={46} />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Egg Candling</CardTitle>
            <CardDescription className="text-xs">
              AI-powered egg development analysis platform
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="operator@egg-candling.io"
                  className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 transition-[color,box-shadow]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 transition-[color,box-shadow]"
                />
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={submitting}
                className="w-full mt-2 font-medium"
              >
                {submitting ? 'Authenticating…' : 'Sign in to Console'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
