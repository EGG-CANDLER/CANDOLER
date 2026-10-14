import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../lib/api'
import { AreaChart, BarPillChart, DonutChart } from '../components/ui/charts.jsx'
import { BotEgg } from '../components/ui/Decor.jsx'
import ElectricBorder from '../components/ui/ElectricBorder.jsx'
import PillButton from '../components/ui/PillButton.jsx'

const IDEAL = { width: { ideal: 1280 }, height: { ideal: 720 } }

export default function Dashboard() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [stream, setStream] = useState(null)
  const [cameras, setCameras] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [facingMode, setFacingMode] = useState('environment')
  const [cameraStatus, setCameraStatus] = useState('Camera off')
  const [cameraError, setCameraError] = useState('')

  const [modelStatus, setModelStatus] = useState(null)

  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // Model readiness banner.
  useEffect(() => {
    api.status().then(setModelStatus).catch(() => {})
  }, [])

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const vids = devices.filter((d) => d.kind === 'videoinput')
      setCameras(vids)
      return vids
    } catch {
      return []
    }
  }, [])

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    stopTracks()
    setStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraStatus('Camera off')
  }, [stopTracks])

  const startCamera = useCallback(
    async (id, facing) => {
      setCameraError('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API is not supported by this browser.')
        return
      }
      stopTracks()
      setCameraStatus('Starting camera…')
      try {
        const video = id
          ? { deviceId: { exact: id }, ...IDEAL }
          : { facingMode: { ideal: facing }, ...IDEAL }
        const media = await navigator.mediaDevices.getUserMedia({
          video,
          audio: false,
        })
        streamRef.current = media
        setStream(media)

        const track = media.getVideoTracks()[0]
        const settings = (track && track.getSettings && track.getSettings()) || {}
        if (settings.deviceId) setDeviceId(settings.deviceId)

        setCameraStatus('Camera on')
        refreshCameras()
      } catch (err) {
        setCameraStatus('Camera error')
        setCameraError(
          (err && err.message) || 'Could not open the camera. Try another camera.',
        )
      }
    },
    [stopTracks, refreshCameras],
  )

  // Attach the live stream to the <video> element.
  useEffect(() => {
    const video = videoRef.current
    if (video && stream) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [stream])

  // Release the camera when leaving the page.
  useEffect(() => () => stopTracks(), [stopTracks])

  async function handleStart() {
    await startCamera(deviceId || '', facingMode)
    refreshCameras()
  }

  async function handleSwitch() {
    const vids = cameras.length ? cameras : (await refreshCameras())
    if (vids.length > 1) {
      const index = vids.findIndex((c) => c.deviceId === deviceId)
      const next = vids[(index + 1 + vids.length) % vids.length]
      await startCamera(next.deviceId, facingMode)
    } else {
      const nextFacing = facingMode === 'user' ? 'environment' : 'user'
      setFacingMode(nextFacing)
      await startCamera('', nextFacing)
    }
  }

  function handleSelectCamera(event) {
    const id = event.target.value
    setDeviceId(id)
    if (streamRef.current) startCamera(id, facingMode)
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

  // ---- Derived display values (data unchanged, presentation only) ----
  const confidence =
    result && typeof result.confidence === 'number' ? result.confidence : null
  const confLabel = confidence === null ? '—' : `${confidence.toFixed(0)}%`
  const dayLabel =
    analyzing
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

  // Confidence sparkline from the ranked predictions (newest shape, same data).
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
      <>
        {modelStatus && !modelStatus.model_ready && (
          <div className="banner banner-warn" role="alert">
            AI model not trained yet — predictions are unavailable. Train the
            model first.
          </div>
        )}

        <div className="bento">
          {/* ---------------- Camera ---------------- */}
          <ElectricBorder mode="hover">
            <section className="card" id="scanner" aria-label="Live camera">
              <div className="card-head">
                <div className="card-head-text">
                  <h2>Live camera</h2>
                  <p className="muted">Candle the egg, capture, analyze</p>
                </div>
                <span className={`count-pill${stream ? '' : ' off'}`}>
                  <span className={`dot${stream ? ' on' : ''}`} aria-hidden="true" />
                  {cameraStatus}
                </span>
              </div>

              <div className="camera">
                <video ref={videoRef} autoPlay playsInline muted />
                {!stream && (
                  <div className="placeholder">
                    Start the camera, or upload a photo of the candled egg.
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="alert alert-error" role="alert">
                  {cameraError}
                </div>
              )}

              <label className="camera-field">
                Select camera
                <select value={deviceId} onChange={handleSelectCamera}>
                  <option value="">
                    {cameras.length ? 'Default camera' : 'No camera detected'}
                  </option>
                  {cameras.map((cam, index) => (
                    <option key={cam.deviceId || index} value={cam.deviceId}>
                      {cam.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="controls">
                {!stream ? (
                  <PillButton variant="primary" onClick={handleStart}>
                    Start camera
                  </PillButton>
                ) : (
                  <PillButton variant="danger" onClick={stopCamera}>
                    Stop
                  </PillButton>
                )}

                <PillButton
                  variant="dark"
                  onClick={handleSwitch}
                  disabled={!stream}
                  title="Switch front/back camera"
                >
                  ⟳ Switch
                </PillButton>

                <PillButton
                  variant="primary"
                  onClick={handleCapture}
                  disabled={!stream || analyzing}
                >
                  {analyzing ? 'Analyzing…' : 'Capture & analyze'}
                </PillButton>

                <PillButton as="label" variant="dark">
                  Upload photo
                  <input type="file" accept="image/*" onChange={handleFile} hidden />
                </PillButton>
              </div>

              <p className="note muted">
                Confidence distribution across the ranked predictions:
              </p>
              <AreaChart data={sparkValues} labels={sparkLabels} height={104} />
            </section>
          </ElectricBorder>

          {/* ---------------- Result ---------------- */}
          <ElectricBorder mode="hover">
            <section className="card" aria-label="AI analysis result">
              <div className="card-head">
                <div className="card-head-text">
                  <h2>AI analysis result</h2>
                  <p className="muted">
                    {result ? statusLabel : 'Capture or upload to see the prediction'}
                  </p>
                </div>
                <span className="count-pill">Detail</span>
              </div>

              {error && (
                <div className="alert alert-error" role="alert">
                  {error}
                </div>
              )}

              {showWarning && (
                <div className="banner banner-warn" role="alert">
                  {lowConfidence
                    ? result?.status ||
                      'Low confidence — please recapture under better candling conditions.'
                    : warnings.join(' ')}
                </div>
              )}

              {!result && !preview ? (
                <div className="state state-empty">
                  <p>Capture or upload an egg image to see the prediction.</p>
                </div>
              ) : (
                <>
                  <div className={`result-day ${lowConfidence ? 'low' : ''}`}>
                    {dayLabel}
                  </div>
                  <p className="confidence-readout">
                    <span>AI confidence</span>
                    <span className="confidence-track" aria-hidden="true">
                      <span
                        className="confidence-fill"
                        style={{ width: `${confidence ?? 0}%` }}
                      />
                    </span>
                    <strong>{confLabel === '—' ? '—' : `${confidence.toFixed(2)}%`}</strong>
                  </p>

                  <BarPillChart items={pillItems} />

                  <div className="result-rows">
                    <div className="result-row">
                      <small>Development stage</small>
                      <strong>{stageLabel}</strong>
                    </div>

                    <div className="result-row">
                      <small>Status</small>
                      <strong>{statusLabel}</strong>
                    </div>

                    <div className="result-row">
                      <small>Date &amp; time</small>
                      <strong>{dateLabel}</strong>
                    </div>

                    {topFive.length > 0 && (
                      <div className="result-row">
                        <small>Top predictions</small>
                        <ul className="top-list">
                          {topFive.slice(0, 3).map((item, index) => (
                            <li key={index}>
                              {item.day}: {Number(item.confidence).toFixed(2)}%
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {preview && (
                      <div className="result-row">
                        <small>Captured image</small>
                        <img className="result-image" src={preview} alt="Captured egg" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </ElectricBorder>

          {/* ---------------- Confidence donut ---------------- */}
          <ElectricBorder mode="hover">
            <section className="card" aria-label="Scan confidence">
              <div className="card-head">
                <div className="card-head-text">
                  <h2>Scan confidence</h2>
                  <p className="muted">How sure the YOLO classifier is</p>
                </div>
                <PillButton variant="dark" size="sm" to="/logs">More</PillButton>
              </div>
              <div className="donut-block">
                <DonutChart
                  value={confidence ?? 0}
                  centerTop={analyzing ? '…' : confLabel}
                  centerBottom="AI score"
                />
                <div className="legend">
                  <span className="legend-mint">
                    <i aria-hidden="true" />
                    Confirmed {confidence === null ? '—' : `${confidence.toFixed(0)}%`}
                  </span>
                  <span className="legend-paper">
                    <i aria-hidden="true" />
                    Gap {confidence === null ? '—' : `${(100 - confidence).toFixed(0)}%`}
                  </span>
                </div>
              </div>
            </section>
          </ElectricBorder>

          {/* ---------------- Model status ---------------- */}
          <ElectricBorder mode="always">
            <section className="card" aria-label="AI model status">
              <div className="model-row">
                <div className="model-copy">
                  <h2>AI model status</h2>
                  <p className="muted">
                    {modelStatus == null
                      ? 'Checking the Flask backend…'
                      : modelReady
                        ? 'YOLO classifier is loaded and ready to candle eggs.'
                        : 'Model is not ready — predictions are unavailable.'}
                  </p>
                  <p className="muted small" style={{ marginTop: 10 }}>
                    <span className={`count-pill${modelReady ? '' : ' off'}`}>
                      <span className="dot" aria-hidden="true" />
                      {modelStatus == null ? 'Checking…' : modelReady ? 'Ready' : 'Not ready'}
                    </span>
                  </p>
                </div>
                <BotEgg />
              </div>
            </section>
          </ElectricBorder>

          {/* ---------------- Session report ---------------- */}
          <ElectricBorder mode="hover">
            <section className="card" aria-label="Session report">
              <div className="card-head">
                <div className="card-head-text">
                  <h2>Session report</h2>
                  <p className="muted">Every scan auto-saves to Supabase</p>
                </div>
                <span className="report-date">{todayLabel}</span>
              </div>
              <div className="report-body">
                <PillButton to="/logs" variant="primary" className="btn-block">
                  Open detection logs
                </PillButton>
              </div>
            </section>
          </ElectricBorder>

          {/* ---------------- Scan summary ---------------- */}
          <ElectricBorder mode="hover" variant="light">
            <section className="card card-mint" aria-label="Scan summary">
              <div className="card-head">
                <div className="card-head-text">
                  <h2>Scan summary</h2>
                  <p className="muted">Latest analysis at a glance</p>
                </div>
              </div>
              <div className="stat">
                <div className="stat-value">{analyzing ? '…' : confLabel}</div>
                <div className="stat-caption">Current confidence</div>
              </div>
              <div className="day-tiles">
                <div className="day-tile">
                  <small>Day</small>
                  <strong>{result?.predicted_day?.replace(/^Day\s*/i, '') || '—'}</strong>
                </div>
                <div className="day-tile">
                  <small>Stage</small>
                  <strong>{result?.stage ? result.stage.split(' ')[0] : '—'}</strong>
                </div>
                <div className="day-tile">
                  <small>Cam</small>
                  <strong>{cameraKind}</strong>
                </div>
              </div>
              <p className="muted small">
                {showWarning
                  ? lowConfidence
                    ? 'Low confidence — recapture under better light.'
                    : warnings.join(' ')
                  : result
                    ? 'Prediction stored under its incubation day.'
                    : 'No scan yet — capture your first egg.'}
              </p>
            </section>
          </ElectricBorder>

          {/* ---------------- CTA ---------------- */}
          <ElectricBorder mode="always" variant="light">
            <section className="card card-mint cta-card" aria-label="Call to action">
              <h2>Start new session</h2>
              <div className="cta-row">
                <p className="muted">Begin candling another egg</p>
                <button
                  className="cta-arrow"
                  type="button"
                  aria-label="Scroll to camera"
                  onClick={() =>
                    document.getElementById('scanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  ↗
                </button>
              </div>
            </section>
          </ElectricBorder>
        </div>
      </>
  )
}

