import * as React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
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
import eggPosterImage from '../images/egg_background.jpg'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const leftPanelRef = React.useRef(null)
  const formCardRef = React.useRef(null)
  const videoRef = React.useRef(null)

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

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

  // Ensure video playback starts smoothly on mount
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: muted video is already compliant
      })
    }
  }, [])

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
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F9FA] dark:bg-background text-foreground overflow-x-hidden">
      {/* Mode toggle top right */}
      <div className="absolute top-4 right-4 z-30">
        <ModeToggle />
      </div>

      {/* LEFT PANEL: Responsive Agribusiness Visual & Branding Container with UHD Video */}
      <div
        ref={leftPanelRef}
        className="relative w-full lg:w-1/2 min-h-[460px] sm:min-h-[520px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-16 overflow-hidden bg-[#0A1A0F] text-white"
      >
        {/* Seamless Looping Background Video */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          poster={eggPosterImage}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none scale-105"
        >
          <source src="/egg_candling_bg.mp4" type="video/mp4" />
        </video>

        {/* Natural Atmospheric Vignette Overlay for rich contrast & readability */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(10, 26, 15, 0.78) 0%, rgba(10, 26, 15, 0.45) 40%, rgba(8, 20, 12, 0.82) 80%, rgba(6, 16, 10, 0.94) 100%)',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/15 shadow-sm">
            <Logo size={40} />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block leading-tight drop-shadow-sm">
              Egg Candling
            </span>
            <span className="text-xs text-[#52B788] font-medium tracking-wider uppercase drop-shadow-sm">
              AgriTech Intelligence
            </span>
          </div>
        </div>

        {/* Centerpiece Branding with Tagline */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black/45 border border-[#52B788]/30 backdrop-blur-md text-xs font-medium text-[#52B788] shadow-xs">
            <Sparkles className="size-3.5" />
            Poultry Intelligence Vision System
          </div>

          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight leading-[1.18] text-white drop-shadow-md">
            Where Quality Farming Meets{' '}
            <span className="text-[#52B788]">
              Digital Excellence
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-zinc-200 leading-relaxed max-w-md drop-shadow-sm">
            Real-time photometric and AI candling analysis designed for commercial hatcheries and precision poultry breeders.
          </p>

          <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 gap-4 text-xs text-zinc-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#52B788] shrink-0" />
              <span>Bio-Secure Session Control</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#52B788] animate-pulse" />
              <span>Hatchery Edge AI Active</span>
            </div>
          </div>
        </div>

        {/* Footer info on left panel */}
        <div className="relative z-10 text-xs text-zinc-300 flex items-center justify-between drop-shadow-sm">
          <span>© {new Date().getFullYear()} CANDOLER Systems</span>
          <span className="text-zinc-400 text-[11px]">v2.4 Agri-Console</span>
        </div>
      </div>

      {/* RIGHT PANEL: Form Container (Clean off-white canvas with pure white card surface) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16 relative z-10 bg-[#F8F9FA] dark:bg-background">
        <div ref={formCardRef} className="w-full max-w-md">
          <Card className="bg-card border border-border shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
            <CardHeader className="text-left pb-4 space-y-1.5">
              <div className="lg:hidden mb-2 inline-block">
                <Logo size={36} />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Sign in to Console
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Enter your credentials to access the AI candling analytics platform.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
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
                    className="w-full h-10 rounded-lg border border-border bg-background px-3.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/25 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Lock className="size-3.5 text-muted-foreground" />
                      Password
                    </label>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-xs font-medium text-[#1E4D2B] dark:text-[#52B788] hover:underline transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/25 transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  disabled={submitting}
                  className="w-full h-10 mt-2 font-medium"
                >
                  {submitting ? 'Authenticating…' : 'Sign in to Console'}
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                Need assistance?{' '}
                <a
                  href="mailto:support@egg-candling.io"
                  className="text-[#1E4D2B] dark:text-[#52B788] hover:underline font-medium transition-colors"
                >
                  Contact hatchery support
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
