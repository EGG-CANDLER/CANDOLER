import { useEffect, useId, useState } from 'react'

function clampPct(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

// Smooth a polyline with a Catmull-Rom → Bézier pass.
function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

// Glowing smooth area/line chart with hover tooltips + draw-in animation.
export function AreaChart({ data = [0, 0, 0, 0, 0], labels = [], height = 132, format }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = useState(-1)

  const W = 320
  const H = 110
  const PAD = 8
  const max = Math.max(...data.map(Number), 1)
  const pts = data.map((raw, i) => {
    const v = Number(raw) || 0
    return {
      x: PAD + (i * (W - PAD * 2)) / Math.max(1, data.length - 1),
      y: H - PAD - (v / max) * (H - PAD * 2),
    }
  })
  const line = smoothPath(pts)
  const area = pts.length
    ? `${line} L ${pts[pts.length - 1].x.toFixed(1)},${H} L ${pts[0].x.toFixed(1)},${H} Z`
    : ''
  const show = typeof format === 'function' ? format : (v) => `${Number(v).toFixed(2)}%`

  return (
    <div className="area-chart" onMouseLeave={() => setHover(-1)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }} role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`ag${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2FF3CF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2FF3CF" stopOpacity="0" />
          </linearGradient>
          <filter id={`line${gid}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#2FF3CF" floodOpacity="0.6" />
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} className="area-grid" />
        ))}
        <path className="area-fill" d={area} fill={`url(#ag${gid})`} />
        <path
          className="area-line"
          d={line}
          fill="none"
          stroke="#4CF5D6"
          strokeWidth="4"
          strokeLinecap="round"
          filter={`url(#line${gid})`}
        />
        {pts.map((p, i) => (
          <g key={i}>
            <rect
              x={i === 0 ? 0 : p.x - (W / data.length / 2)}
              y="0"
              width={W / data.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
            />
            <circle cx={p.x} cy={p.y} r={hover === i ? 5 : 0} className="area-dot" />
          </g>
        ))}
      </svg>
      {hover >= 0 && (
        <div
          className="chart-tip"
          style={{ left: `${(hover / Math.max(1, data.length - 1)) * 100}%` }}
          role="status"
        >
          {labels[hover] ? <strong>{labels[hover]}</strong> : null} {show(data[hover], hover)}
        </div>
      )}
    </div>
  )
}

// Donut chart with rounded caps, animated on load, tooltip on hover.
export function DonutChart({ value = 0, size = 150, thickness = 18, centerTop = '', centerBottom = '' }) {
  const pct = clampPct(value)
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    setDrawn(false)
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    return () => cancelAnimationFrame(frame)
  }, [pct])

  const R = 52
  const CIRC = 2 * Math.PI * R
  const shown = drawn ? pct : 0

  return (
    <div className="donut-wrap" role="img" aria-label={`${centerTop} ${centerBottom}`}>
      <svg className="donut" viewBox="0 0 120 120" style={{ width: size, height: size }}>
        <defs>
          <linearGradient id={`dg${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2FF3CF" />
            <stop offset="100%" stopColor="#1C8F80" />
          </linearGradient>
          <filter id={`clay${gid}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>
        <circle cx="60" cy="60" r={R} className="donut-track" strokeWidth={thickness} />
        <circle
          cx="60"
          cy="60"
          r={R}
          className="donut-seg"
          stroke={`url(#dg${gid})`}
          strokeWidth={thickness}
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={`${CIRC * (1 - shown / 100)}`}
          filter={`url(#clay${gid})`}
        >
          <title>{`${centerTop} ${centerBottom}`}</title>
        </circle>
      </svg>
      <div className="donut-center">
        <strong>{centerTop}</strong>
        <small>{centerBottom}</small>
      </div>
    </div>
  )
}

// Vertical pill bars with outlined tracks + glowing fill — grow on value change.
export function BarPillChart({ items = [] }) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    setGrown(false)
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)))
    return () => cancelAnimationFrame(frame)
  }, [JSON.stringify(items.map((i) => i.value))])

  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1)

  return (
    <div className="pills" role="img" aria-label="Top predictions">
      {items.map((item, i) => {
        const pct = ((Number(item.value) || 0) / max) * 100
        return (
          <div className="pill-bar" key={item.label ?? i} title={`${item.label}: ${item.caption || ''}`}>
            <div className="pill-track">
              <div
                className={`pill-fill${i === 0 ? ' is-top' : ''}`}
                style={{ height: grown ? `${Math.max(6, pct)}%` : '0%' }}
              />
            </div>
            <span className="pill-num">{String(item.label ?? '').padStart(2, '0')}</span>
          </div>
        )
      })}
    </div>
  )
}

