import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../lib/api'

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

  return (
      <>
        {modelStatus && !modelStatus.model_ready && (
          <div className="banner banner-warn" role="alert">
            AI model not trained yet — predictions are unavailable. Train the
            model first.
          </div>
        )}

        <div className="grid">
          {/* ---------------- Camera ---------------- */}
          <section className="card">
            <div className="card-head">
              <h2>Live camera</h2>
              <p className="muted">
                <span className={`dot ${stream ? 'on' : ''}`} aria-hidden="true" />
                {cameraStatus}
              </p>
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

            <label>
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
                <button className="btn btn-primary" type="button" onClick={handleStart}>
                  Start camera
                </button>
              ) : (
                <button className="btn btn-danger" type="button" onClick={stopCamera}>
                  Stop
                </button>
              )}

              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleSwitch}
                disabled={!stream}
                title="Switch front/back camera"
              >
                ⟳ Switch camera
              </button>

              <button
                className="btn btn-success"
                type="button"
                onClick={handleCapture}
                disabled={!stream || analyzing}
              >
                {analyzing ? 'Analyzing…' : 'Capture & analyze'}
              </button>

              <label className="btn btn-secondary btn-file">
                Upload photo
                <input type="file" accept="image/*" onChange={handleFile} hidden />
              </label>
            </div>

            <p className="note muted">
              Works with phone (front/back) and laptop cameras. Use{' '}
              <b>Upload photo</b> as a fallback. Every analyzed image is
              auto-saved to Supabase under its predicted day.
            </p>
          </section>

          {/* ---------------- Result ---------------- */}
          <section className="card">
            <div className="card-head">
              <h2>AI analysis result</h2>
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
                  {analyzing
                    ? 'Analyzing…'
                    : result
                      ? lowConfidence
                        ? 'LOW CONFIDENCE'
                        : result.predicted_day || '—'
                      : '—'}
                </div>

                <div className="result-rows">
                  <div className="result-row">
                    <small>Development stage</small>
                    <strong>
                      {result
                        ? result.stage || (lowConfidence ? 'Not assigned' : '—')
                        : '—'}
                    </strong>
                  </div>

                  <div className="result-row">
                    <small>AI confidence</small>
                    <strong>
                      {result && typeof result.confidence === 'number'
                        ? `${result.confidence.toFixed(2)}%`
                        : '—'}
                    </strong>
                  </div>

                  <div className="result-row">
                    <small>Status</small>
                    <strong>
                      {result?.status || (analyzing ? 'Running YOLO…' : '—')}
                    </strong>
                  </div>

                  <div className="result-row">
                    <small>Date &amp; time</small>
                    <strong>
                      {result
                        ? [result.date_display, result.time_display]
                            .filter(Boolean)
                            .join(' — ')
                        : '—'}
                    </strong>
                  </div>

                  {result?.top_predictions?.length > 0 && (
                    <div className="result-row">
                      <small>Top predictions</small>
                      <ul className="top-list">
                        {result.top_predictions.slice(0, 3).map((item, index) => (
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
        </div>
      </>
  )
}
