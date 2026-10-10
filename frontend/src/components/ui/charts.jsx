import * as React from 'react'

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

// Area/Line chart using chart color tokens (var(--chart-1))
export function AreaChart({ data = [0, 0, 0, 0, 0], labels = [], height = 120, format }) {
  const gid = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = React.useState(-1)

  const W = 360
  const H = 120
  const PAD = 12
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
    <div className="relative w-full overflow-hidden select-none" onMouseLeave={() => setHover(-1)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height, width: '100%' }}
        role="img"
        aria-label="Confidence trend line chart"
      >
        <defs>
          <linearGradient id={`areaGrad${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id={`lineGrad${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="50%" stopColor="var(--chart-2)" />
            <stop offset="100%" stopColor="var(--chart-1)" />
          </linearGradient>
          <filter id={`glow${gid}`}>
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="var(--chart-1)" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H * f}
            y2={H * f}
            stroke="var(--border)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        ))}

        {/* Filled area */}
        <path d={area} fill={`url(#areaGrad${gid})`} />

        {/* Stroke line */}
        <path
          d={line}
          fill="none"
          stroke={`url(#lineGrad${gid})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow${gid})`}
        />

        {/* Interactive hover points */}
        {pts.map((p, i) => (
          <g key={i}>
            <rect
              x={i === 0 ? 0 : p.x - W / data.length / 2}
              y="0"
              width={W / data.length}
              height={H}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill={hover === i ? 'var(--background)' : 'var(--chart-1)'}
              stroke="var(--chart-1)"
              strokeWidth={hover === i ? 2.5 : 1.5}
              className="transition-all duration-100"
            />
          </g>
        ))}
      </svg>

      {hover >= 0 && (
        <div
          className="absolute top-2 -translate-x-1/2 pointer-events-none rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md transition-all duration-100"
          style={{ left: `${(hover / Math.max(1, data.length - 1)) * 100}%` }}
          role="status"
        >
          {labels[hover] ? <span className="font-semibold">{labels[hover]}: </span> : null}
          {show(data[hover], hover)}
        </div>
      )}
    </div>
  )
}

// Donut chart using chart token (--chart-2)
export function DonutChart({
  value = 0,
  size = 140,
  thickness = 16,
  centerTop = '',
  centerBottom = '',
}) {
  const pct = clampPct(value)
  const gid = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const [drawn, setDrawn] = React.useState(false)

  React.useEffect(() => {
    setDrawn(false)
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setDrawn(true)),
    )
    return () => cancelAnimationFrame(frame)
  }, [pct])

  const R = 48
  const CIRC = 2 * Math.PI * R
  const shown = drawn ? pct : 0

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerTop} ${centerBottom}`}
    >
      <svg
        viewBox="0 0 120 120"
        style={{ width: size, height: size }}
        className="rotate-[-90deg] transform"
      >
        <defs>
          <linearGradient id={`donutGrad${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="100%" stopColor="var(--chart-2)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {/* Filled segment */}
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={`url(#donutGrad${gid})`}
          strokeWidth={thickness}
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={`${CIRC * (1 - shown / 100)}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold tracking-tight text-foreground">{centerTop}</span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {centerBottom}
        </span>
      </div>
    </div>
  )
}

// Vertical pill bar chart using all 5 chart tokens (--chart-1 to --chart-5)
const CHART_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function BarPillChart({ items = [] }) {
  const [grown, setGrown] = React.useState(false)

  React.useEffect(() => {
    setGrown(false)
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setGrown(true)),
    )
    return () => cancelAnimationFrame(frame)
  }, [JSON.stringify(items.map((i) => i.value))])

  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1)

  return (
    <div
      className="grid grid-cols-5 gap-3 w-full py-2 select-none"
      role="img"
      aria-label="Top predictions chart"
    >
      {items.map((item, i) => {
        const pct = ((Number(item.value) || 0) / max) * 100
        const color = CHART_TOKENS[i % CHART_TOKENS.length]
        return (
          <div
            key={item.label ?? i}
            className="flex flex-col items-center gap-1.5"
            title={`${item.label}: ${item.caption || ''}`}
          >
            <div className="relative h-28 w-full max-w-[2.25rem] rounded-full bg-muted p-1 flex items-end justify-center overflow-hidden border border-border/50">
              <div
                className="w-full rounded-full transition-all duration-500 ease-out"
                style={{
                  height: grown ? `${Math.max(10, pct)}%` : '0%',
                  backgroundColor: color,
                  boxShadow: i === 0 ? `0 0 12px ${color}` : undefined,
                }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">
              {String(item.label ?? '').padStart(2, '0')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Full session / history report graph using chart color tokens
export function ReportGraph({ data = [] }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Incubation timeline distribution</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
            Primary
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} />
            Secondary
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--chart-3)' }} />
            Low conf
          </span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
        <div style={{ width: '45%', backgroundColor: 'var(--chart-1)' }} />
        <div style={{ width: '30%', backgroundColor: 'var(--chart-2)' }} />
        <div style={{ width: '15%', backgroundColor: 'var(--chart-3)' }} />
        <div style={{ width: '10%', backgroundColor: 'var(--chart-4)' }} />
      </div>
    </div>
  )
}
