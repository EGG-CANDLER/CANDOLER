import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Upload,
  VideoOff,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

import { api } from '../lib/api'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { AreaChart, BarPillChart, DonutChart } from '../components/ui/charts'
import { CountUp } from '../components/ui/CountUp'
import heroEggBanner from '../images/replicate-prediction-26ddlflbm57oka6562tqpt23fu.png'
import poultryFarmThumb from '../images/chickens-the-new-egg-farmer-what-to-expect-fom-your-fresh-chicken-eggs.jpg'

const IDEAL = { width: { ideal: 1280 }, height: { ideal: 720 } }

export default function Dashboard() {
  const dashboardRef = React.useRef(null)
  const videoRef = React.useRef(null)
  const streamRef = React.useRef(null)
  const scanBeamRef = React.useRef(null)

  const [stream, setStream] = React.useState(null)
  const [cameras, setCameras] = React.useState([])
  const [deviceId, setDeviceId] = React.useState('')
  const [facingMode, setFacingMode] = React.useState('environment')
  const [cameraStatus, setCameraStatus] = React.useState('Camera off')
  const [cameraError, setCameraError] = React.useState('')

  const [modelStatus, setModelStatus] = React.useState(null)

  const [preview, setPreview] = React.useState('')
  const [result, setResult] = React.useState(null)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [error, setError] = React.useState('')

  // Staggered entrance animation for cards
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('.gsap-card', {
        opacity: 0,
        y: 14,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
      })
    },
    { scope: dashboardRef },
  )

  // Candling scanning beam animation when streaming or analyzing
  useGSAP(
    () => {
      if (!scanBeamRef.current) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      if (analyzing || stream) {
        gsap.fromTo(
          scanBeamRef.current,
          { top: '0%', opacity: 0.8 },
          {
            top: '100%',
            opacity: 0.2,
            duration: analyzing ? 1.2 : 2.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          },
        )
      } else {
        gsap.killTweensOf(scanBeamRef.current)
      }
    },
    { dependencies: [analyzing, stream] },
  )

  // Model readiness banner
  React.useEffect(() => {
    api.status().then(setModelStatus).catch(() => {})
  }, [])

  // Camera enumerate
  React.useEffect(() => {
    async function getCameras() {
      if (!navigator.mediaDevices?.enumerateDevices) return
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((d) => d.kind === 'videoinput')
        setCameras(videoInputs)
        if (videoInputs.length && !deviceId) {
          setDeviceId(videoInputs[0].deviceId)
        }
      } catch (err) {
        console.warn('Cannot enumerate devices:', err)
      }
    }
    getCameras()
  }, [deviceId])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStream(null)
    setCameraStatus('Camera off')
  }

  async function startCamera(constraints) {
    stopCamera()
    setCameraError('')
    setCameraStatus('Starting…')
    try {
      const media = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = media
      setStream(media)
      if (videoRef.current) {
        videoRef.current.srcObject = media
      }
      setCameraStatus('Live')
    } catch (err) {
      setCameraError(err.message || 'Cannot access camera.')
      setCameraStatus('Unavailable')
    }
  }

  function handleStart() {
    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, ...IDEAL }
        : { facingMode, ...IDEAL },
    }
    startCamera(constraints)
  }

  function handleSwitch() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera({ video: { facingMode: next, ...IDEAL } })
  }

  function handleSelectCamera(e) {
    const id = e.target.value
    setDeviceId(id)
    if (stream) {
      startCamera({ video: { deviceId: { exact: id }, ...IDEAL } })
    }
  }

  async function analyze(dataUrl) {
    setPreview(dataUrl)
    setResult(null)
    setError('')
    setAnalyzing(true)
    try {
      const res = await api.analyze(dataUrl)
      setResult(res)
    } catch (err) {
      setError((err && err.message) || 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleCapture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setError('Camera video is not ready yet.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    analyze(canvas.toDataURL('image/jpeg', 0.92))
  }

  function handleFile(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => analyze(reader.result)
    reader.onerror = () => setError('Could not read the selected file.')
    reader.readAsDataURL(file)
  }

  const lowConfidence = Boolean(result && result.low_confidence)
  const warnings = (result && result.warnings) || []
  const showWarning = Boolean(result) && (lowConfidence || warnings.length > 0)

  // Derived display values
  const confidence =
    result && typeof result.confidence === 'number' ? result.confidence : null
  const confLabel = confidence === null ? '—' : `${confidence.toFixed(0)}%`
  const dayLabel = analyzing
    ? 'Analyzing…'
    : result
      ? lowConfidence
        ? 'LOW CONFIDENCE'
        : result.predicted_day || '—'
      : '—'
  const stageLabel = result
    ? result.stage || (lowConfidence ? 'Not assigned' : '—')
    : '—'
  const statusLabel = result?.status || (analyzing ? 'Running YOLO…' : '—')
  const dateLabel = result
    ? [result.date_display, result.time_display].filter(Boolean).join(' — ')
    : '—'

  // Ranked predictions
  const topFive = (result?.top_predictions || []).slice(0, 5)
  const sparkValues = topFive.length
    ? topFive.map((item) => Number(item.confidence) || 0)
    : [0, 0, 0, 0, 0]
  const sparkLabels = topFive.length
    ? topFive.map((item) => item.day || '')
    : ['', '', '', '', '']
  const pillItems = topFive.length
    ? topFive.map((item, i) => ({
        label: String(item.day || '').replace(/[^0-9]/g, '') || String(i + 1),
        value: Number(item.confidence) || 0,
        caption: `${item.day}: ${Number(item.confidence).toFixed(2)}%`,
      }))
    : Array.from({ length: 5 }, (_, i) => ({
        label: String(i + 1),
        value: 0,
        caption: 'Awaiting analysis',
      }))

  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const modelReady = Boolean(modelStatus?.model_ready)
  const cameraKind =
    cameras.length > 1 ? `${cameras.length} cams` : stream ? 'Live' : 'Off'

  return (
    <div ref={dashboardRef} className="flex flex-col gap-6">
      {/* Agribusiness Section Hero Banner Card */}
      <div className="gsap-card relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#E8F5E9] dark:bg-[#1B291F] text-[#1E4D2B] dark:text-[#52B788] text-xs font-medium mb-3">
            <CheckCircle2 className="size-3.5" />
            Poultry Incubation Quality Control
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Egg Candling & Embryo Development
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Real-time optical density candling analysis. Capture or upload egg candling images to determine incubation age and embryonic viability.
          </p>
        </div>

        {/* Hero Visual Asset preview card */}
        <div className="relative z-10 w-full sm:w-72 shrink-0 rounded-lg overflow-hidden border border-border shadow-xs bg-muted/40">
          <img
            src={heroEggBanner}
            alt="Candled Egg Sample"
            className="w-full h-28 object-cover object-center"
          />
          <div className="p-2.5 bg-card flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Active Calibration</span>
            <span className="text-[11px] font-medium text-[#1E4D2B] dark:text-[#52B788]">
              YOLO v11 Candler
            </span>
          </div>
        </div>
      </div>

      {/* Model readiness alert if unavailable */}
      {modelStatus && !modelStatus.model_ready && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>AI Model Unavailable</AlertTitle>
          <AlertDescription>
            AI model not trained yet — predictions are unavailable. Train the model first.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ---------------- 1. Live Camera Scanner ---------------- */}
        <div className="gsap-card md:col-span-2 lg:col-span-2">
          <Card id="scanner" className="h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Camera className="size-4 text-primary" /> Live Camera Candler
                </CardTitle>
                <CardDescription>Candle the egg, capture, and run YOLO inference</CardDescription>
              </div>
              <Badge
                variant={stream ? 'default' : 'secondary'}
                className="gap-1.5 text-xs py-1"
              >
                <span
                  className={`size-2 rounded-full ${
                    stream ? 'bg-[#52B788] animate-pulse' : 'bg-muted-foreground'
                  }`}
                />
                {cameraStatus}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Video container with minimal sweep effect */}
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center border border-border group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${stream ? 'block' : 'hidden'}`}
                />

                {/* Animated candling light scanning sweep */}
                <div
                  ref={scanBeamRef}
                  className={`absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#52B788] to-transparent pointer-events-none shadow-[0_0_10px_#52B788] ${
                    stream || analyzing ? 'block' : 'hidden'
                  }`}
                />

                {!stream && (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <VideoOff className="size-9 mb-2 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium text-zinc-200">Camera is offline</p>
                    <p className="text-xs text-zinc-400 max-w-sm mt-1">
                      Start the live optical feed or upload an egg candling photo to begin.
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}

              {/* Camera selector & action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <select
                    value={deviceId}
                    onChange={handleSelectCamera}
                    className="w-full text-xs h-9 rounded-lg border border-border bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">
                      {cameras.length ? 'Default camera' : 'No camera detected'}
                    </option>
                    {cameras.map((cam, index) => (
                      <option key={cam.deviceId || index} value={cam.deviceId}>
                        {cam.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!stream ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStart}
                      className="gap-1.5"
                    >
                      <Camera className="size-3.5" /> Start camera
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={stopCamera}
                    >
                      Stop
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitch}
                    disabled={!stream}
                    title="Switch camera"
                    className="transition-transform duration-200 active:scale-95"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCapture}
                    disabled={!stream || analyzing}
                    className="gap-1.5 font-medium shadow-xs"
                  >
                    <Sparkles className="size-3.5 text-primary-foreground" />
                    {analyzing ? 'Analyzing…' : 'Capture & analyze'}
                  </Button>

                  <label className="inline-flex cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
                    <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-all">
                      <Upload className="size-3.5" /> Upload
                    </span>
                  </label>
                </div>
              </div>

              {/* Ranked sparkline */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Ranked prediction distribution</span>
                  <span className="font-mono">Top 5 classes</span>
                </div>
                <AreaChart data={sparkValues} labels={sparkLabels} height={96} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- 2. AI Analysis Result ---------------- */}
        <div className="gsap-card md:col-span-2 lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">AI Analysis Result</CardTitle>
                <CardDescription className="truncate">
                  {result ? statusLabel : 'Awaiting egg image capture'}
                </CardDescription>
              </div>
              <Badge variant="outline">Detail</Badge>
            </CardHeader>

            <CardContent className="space-y-4 flex-1">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    {lowConfidence
                      ? result?.status ||
                        'Low confidence — please recapture under better candling conditions.'
                      : warnings.join(' ')}
                  </AlertDescription>
                </Alert>
              )}

              {!result && !preview ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  <HelpCircle className="size-8 mb-2 opacity-40 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No analysis yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Capture or upload an egg to receive real-time incubation classification.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Big predicted day headline */}
                  <div className="text-center py-2.5 bg-muted/40 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">
                      Predicted Incubation
                    </span>
                    <div
                      className={`text-3xl font-bold tracking-tight mt-1 ${
                        lowConfidence ? 'text-destructive' : 'text-[#1E4D2B] dark:text-[#52B788]'
                      }`}
                    >
                      {dayLabel}
                    </div>
                  </div>

                  {/* Confidence track with CountUp */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">AI Confidence</span>
                      <span className="font-mono font-semibold text-foreground">
                        {confidence === null ? (
                          '—'
                        ) : (
                          <CountUp value={confidence} decimals={2} suffix="%" />
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${confidence ?? 0}%`,
                          backgroundColor: lowConfidence
                            ? 'var(--destructive)'
                            : '#1E4D2B',
                        }}
                      />
                    </div>
                  </div>

                  {/* Ranked pills */}
                  <BarPillChart items={pillItems} />

                  {/* Metadata breakdown */}
                  <div className="rounded-lg border border-border divide-y divide-border text-xs">
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">Development Stage</span>
                      <span className="font-medium text-foreground">{stageLabel}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-foreground">{statusLabel}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="font-mono text-foreground">{dateLabel}</span>
                    </div>
                    {preview && (
                      <div className="p-2.5 flex items-center justify-between">
                        <span className="text-muted-foreground">Captured Image</span>
                        <img
                          src={preview}
                          alt="Captured preview"
                          className="size-10 rounded-md object-cover border border-border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------------- 3. Confidence Donut ---------------- */}
        <div className="gsap-card">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Scan Confidence</CardTitle>
                <CardDescription>YOLO inference certainty</CardDescription>
              </div>
              <Button as={Link} to="/logs" variant="outline" size="xs">
                History
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4 space-y-4">
              <DonutChart
                value={confidence ?? 0}
                centerTop={analyzing ? '…' : confLabel}
                centerBottom="AI Score"
              />

              <div className="flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="size-2 rounded-full bg-[#1E4D2B] dark:bg-[#52B788]" />
                  Confirmed {confidence === null ? '—' : `${confidence.toFixed(0)}%`}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted" />
                  Gap {confidence === null ? '—' : `${(100 - confidence).toFixed(0)}%`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- 4. Model Status with Farm Context ---------------- */}
        <div className="gsap-card">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">AI Model Status</CardTitle>
              <CardDescription>Local YOLO classifier runtime</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 py-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {modelStatus == null
                    ? 'Connecting to backend…'
                    : modelReady
                      ? 'YOLO classifier is online and ready for incubation batches.'
                      : 'Model is not trained yet — predictions disabled.'}
                </p>
                <Badge
                  variant={modelReady ? 'leaf' : 'secondary'}
                  className="gap-1 text-xs py-0.5"
                >
                  <span
                    className={`size-2 rounded-full ${
                      modelReady ? 'bg-[#52B788] animate-pulse' : 'bg-muted-foreground'
                    }`}
                  />
                  {modelStatus == null ? 'Checking…' : modelReady ? 'Operational' : 'Not ready'}
                </Badge>
              </div>

              <div className="relative size-16 shrink-0 rounded-lg overflow-hidden border border-border shadow-xs">
                <img
                  src={poultryFarmThumb}
                  alt="Poultry farm hens"
                  className="size-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- 5. Scan Summary & CTA ---------------- */}
        <div className="gsap-card">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Session Summary</CardTitle>
                <CardDescription>{todayLabel}</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {cameraKind}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-2.5 border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                    Day
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {result?.predicted_day?.replace(/^Day\s*/i, '') || '—'}
                  </span>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                    Stage
                  </span>
                  <span className="text-lg font-bold text-foreground truncate block">
                    {result?.stage ? result.stage.split(' ')[0] : '—'}
                  </span>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                    Conf
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {confidence === null ? (
                      '—'
                    ) : (
                      <CountUp value={confidence} decimals={0} suffix="%" />
                    )}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {showWarning
                  ? lowConfidence
                    ? 'Low confidence — recapture under better optical lighting.'
                    : warnings.join(' ')
                  : result
                    ? 'Prediction recorded in local detection database.'
                    : 'Capture or candle an egg to record this session.'}
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2">
              <Button as={Link} to="/logs" variant="outline" size="sm" className="w-full gap-1.5">
                <FileText className="size-3.5" /> Logs
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  document.getElementById('scanner')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Start New <ArrowUpRight className="size-3.5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
