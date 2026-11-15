import * as React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

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
import Logo from '../components/Logo'
import loginPageImage from '../images/loginPageImage.png'

function GoogleIcon({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export default function Login() {
  const { session, loading, signIn, signUp, signInWithOAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const leftPanelRef = React.useRef(null)
  const formCardRef = React.useRef(null)
  const formFieldsRef = React.useRef(null)

  const [mode, setMode] = React.useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [successMessage, setSuccessMessage] = React.useState('')
  const [infoMessage, setInfoMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState(false)

  React.useEffect(() => {
    const state = location.state
    const query = new URLSearchParams(location.search)
    if (state?.sessionExpired || query.get('session_expired') === 'true' || state?.message) {
      setInfoMessage(
        state?.message || 'Your session expired. Please log in again.'
      )
    }
  }, [location])

  // GSAP entrance animation on load
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

    if (leftPanelRef.current) {
      tl.from(leftPanelRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.5,
      })
    }

    if (formCardRef.current) {
      tl.from(
        formCardRef.current,
        {
          opacity: 0,
          y: 16,
          scale: 0.99,
          duration: 0.45,
        },
        '-=0.25',
      )
    }
  })

  // Mode change animation (Sign in <-> Sign up)
  function handleModeSwitch(nextMode) {
    if (nextMode === mode) return
    setError('')
    setSuccessMessage('')

    if (formFieldsRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.to(formFieldsRef.current, {
        opacity: 0,
        y: nextMode === 'signup' ? -8 : 8,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          setMode(nextMode)
          gsap.fromTo(
            formFieldsRef.current,
            { opacity: 0, y: nextMode === 'signup' ? 12 : -12 },
            { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
          )
        },
      })
    } else {
      setMode(nextMode)
    }
  }

  // Already signed in? Go straight to the app.
  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    if (mode === 'signup') {
      const { data, error: err } = await signUp(email, password)
      setSubmitting(false)
      if (err) {
        setError(err.message || 'Sign up failed')
        return
      }
      if (data?.session) {
        const to = location.state?.from?.pathname || '/'
        navigate(to, { replace: true })
      } else {
        setSuccessMessage('Registration successful! Please check your email to confirm your account or sign in.')
        handleModeSwitch('signin')
      }
    } else {
      const { error: err } = await signIn(email, password)
      setSubmitting(false)
      if (err) {
        setError(err.message || 'Sign in failed')
        return
      }
      const to = location.state?.from?.pathname || '/'
      navigate(to, { replace: true })
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setSuccessMessage('')
    setOauthLoading(true)

    const { error: err } = await signInWithOAuth('google')
    if (err) {
      setOauthLoading(false)
      setError(err.message || 'Google authentication failed. Please verify Google provider is configured in Supabase.')
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[#F8F9FA] dark:bg-background text-foreground overflow-x-hidden">
      {/* Mode toggle top right */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
        <ModeToggle />
      </div>

      {/* LEFT PANEL: Responsive Agribusiness Visual & Branding Container */}
      <div
        ref={leftPanelRef}
        className="relative w-full lg:w-1/2 min-h-[380px] sm:min-h-[460px] lg:min-h-[100dvh] flex flex-col justify-between p-5 sm:p-10 lg:p-16 overflow-hidden bg-[#0A1A0F] text-white"
      >
        {/* Background Image */}
        <img
          src={loginPageImage}
          alt="Egg Candling Intelligence"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none scale-105"
        />

        {/* Natural Atmospheric Vignette Overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(10, 26, 15, 0.78) 0%, rgba(10, 26, 15, 0.45) 40%, rgba(8, 20, 12, 0.82) 80%, rgba(6, 16, 10, 0.94) 100%)',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/15 shadow-sm">
            <Logo size={32} />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white block leading-tight drop-shadow-sm">
              Egg Candling
            </span>
            <span className="text-[10px] sm:text-xs text-[#52B788] font-medium tracking-wider uppercase drop-shadow-sm">
              AgriTech Intelligence
            </span>
          </div>
        </div>

        {/* Centerpiece Branding with Tagline */}
        <div className="relative z-10 my-auto py-6 sm:py-8 max-w-lg">
          <div className="mb-3 sm:mb-5 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/45 border border-[#52B788]/30 backdrop-blur-md text-[11px] sm:text-xs font-medium text-[#52B788] shadow-xs">
            <Sparkles className="size-3.5 shrink-0" />
            Poultry Intelligence Vision System
          </div>

          <h1 className="text-2xl sm:text-4xl xl:text-5xl font-bold tracking-tight leading-[1.18] text-white drop-shadow-md">
            Where Quality Farming Meets{' '}
            <span className="text-[#52B788]">
              Digital Excellence
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 text-xs sm:text-base text-zinc-200 leading-relaxed max-w-md drop-shadow-sm">
            Real-time photometric and AI candling analysis designed for commercial hatcheries and precision poultry breeders.
          </p>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-xs text-zinc-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#52B788] shrink-0" />
              <span>Bio-Secure Session Control</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#52B788] animate-pulse shrink-0" />
              <span>Hatchery Edge AI Active</span>
            </div>
          </div>
        </div>

        {/* Footer info on left panel */}
        <div className="relative z-10 text-[11px] sm:text-xs text-zinc-300 flex items-center justify-between drop-shadow-sm">
          <span>© {new Date().getFullYear()} CANDOLER Systems</span>
          <span className="text-zinc-400 text-[10px] sm:text-[11px]">v2.4 Agri-Console</span>
        </div>
      </div>

      {/* RIGHT PANEL: Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-10 lg:p-16 relative z-10 bg-[#F8F9FA] dark:bg-background font-sans">
        <div ref={formCardRef} className="w-full max-w-md">
          <Card className="bg-card border border-border shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden">
            <CardHeader className="text-left pb-2 space-y-3 p-4 sm:p-6">
              <div className="lg:hidden inline-block">
                <Logo size={32} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground transition-all">
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">
                  {mode === 'signin'
                    ? 'Enter your credentials to access your candling analysis.'
                    : 'Create an account to begin tracking and analyzing egg scans.'}
                </CardDescription>
              </div>

              {/* Segmented slider pill control */}
              <div className="relative p-1 bg-muted/60 dark:bg-muted/40 rounded-lg flex items-center border border-border/40 select-none">
                {/* Animated indicator pill */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background dark:bg-card rounded-md shadow-xs border border-border/50 transition-all duration-300 ease-out ${
                    mode === 'signin' ? 'left-1' : 'left-[calc(50%+2px)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className={`relative z-10 w-1/2 min-h-[40px] sm:min-h-0 py-2 sm:py-1.5 text-xs font-semibold text-center transition-colors duration-200 cursor-pointer ${
                    mode === 'signin'
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className={`relative z-10 w-1/2 min-h-[40px] sm:min-h-0 py-2 sm:py-1.5 text-xs font-semibold text-center transition-colors duration-200 cursor-pointer ${
                    mode === 'signup'
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0">
              {infoMessage && (
                <Alert className="mb-5 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription>{infoMessage}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="mb-5 border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Form container with GSAP animated transition */}
              <div ref={formFieldsRef}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90 tracking-tight flex items-center gap-1.5">
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
                      className="w-full h-11 sm:h-10 rounded-lg border border-border bg-background px-3.5 py-1 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/25 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90 tracking-tight flex items-center gap-1.5">
                      <Lock className="size-3.5 text-muted-foreground" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      className="w-full h-11 sm:h-10 rounded-lg border border-border bg-background px-3.5 py-1 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/25 transition-all"
                    />
                  </div>

                  {mode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/90 tracking-tight flex items-center gap-1.5">
                        <Lock className="size-3.5 text-muted-foreground" />
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="w-full h-11 sm:h-10 rounded-lg border border-border bg-background px-3.5 py-1 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/25 transition-all"
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="default"
                    disabled={submitting || oauthLoading}
                    className="w-full h-11 sm:h-10 min-h-[44px] mt-2 font-medium tracking-tight text-sm shadow-xs transition-all"
                  >
                    {submitting
                      ? mode === 'signin'
                        ? 'Signing In…'
                        : 'Creating Account…'
                      : mode === 'signin'
                        ? 'Sign In'
                        : 'Sign Up'}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-3 text-xs tracking-wider text-muted-foreground font-medium">
                    or continue with
                  </span>
                </div>

                {/* Google Sign-in button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={oauthLoading || submitting}
                  className="w-full h-11 sm:h-10 min-h-[44px] border-border bg-background hover:bg-accent/60 text-foreground font-medium text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs"
                >
                  <GoogleIcon className="size-4 shrink-0" />
                  <span>{oauthLoading ? 'Connecting to Google…' : mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
