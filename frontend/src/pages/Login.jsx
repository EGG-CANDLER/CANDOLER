import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import ElectricBorder from '../components/ui/ElectricBorder.jsx'
import PillButton from '../components/ui/PillButton.jsx'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    <div className="auth-wrap">
      <ElectricBorder mode="hover" className="auth-eb">
        <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <Logo size={48} variant="mark" />
          <h1>Egg Candling</h1>
          <p className="muted">AI-powered egg analysis</p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        <PillButton variant="primary" className="btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </PillButton>
        </form>
      </ElectricBorder>
    </div>
  )
}
