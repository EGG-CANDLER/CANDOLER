import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Electric Border v2 — shared lightning loop + SVG filter singletons.
// One rAF loop drives the turbulence `seed` of the single shared filter,
// throttled to ~20fps, paused offscreen (IntersectionObserver) and disabled
// entirely under prefers-reduced-motion.
// ---------------------------------------------------------------------------

const registry = new Set()
let rafId = 0
let seed = 7
let lastTick = 0

function motionOK() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function frame(now) {
  rafId = 0
  const turb = document.getElementById('eb-turb')
  const anyVisible = [...registry].some((el) => el.isConnected && el.__ebVisible !== false)
  if (!turb || !anyVisible || !motionOK()) return
  if (now - lastTick > 50) {
    seed = (seed + 1) % 997
    turb.setAttribute('seed', String(seed))
    lastTick = now
  }
  rafId = requestAnimationFrame(frame)
}

function ensureLoop() {
  if (!rafId && registry.size > 0 && motionOK()) {
    rafId = requestAnimationFrame(frame)
  }
}

let observer = null
function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.__ebVisible = entry.isIntersecting
        })
        ensureLoop()
      },
      { threshold: 0 },
    )
  }
  return observer
}

function registerEB(el) {
  registry.add(el)
  el.__ebVisible = true
  try {
    getObserver().observe(el)
  } catch {
    /* IO unavailable — loop still runs while mounted */
  }
  ensureLoop()
}

function unregisterEB(el) {
  registry.delete(el)
  try {
    getObserver().unobserve(el)
  } catch {
    /* noop */
  }
}

// Rendered ONCE at the app root (see main.jsx). Never per card.
export function ElectricBorderDefs() {
  return (
    <svg className="eb-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <filter
          id="eb-distort"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            id="eb-turb"
            type="fractalNoise"
            baseFrequency="0.032"
            numOctaves="2"
            seed="7"
            result="ebNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="ebNoise"
            scale="7"
            xChannelSelector="R"
            yChannelSelector="G"
            result="ebDisp"
          />
        </filter>
      </defs>
    </svg>
  )
}

// Wrapper: <ElectricBorder mode="always|hover" variant="mint|light" ...>
// Tunables via props or CSS vars: --eb-color, --eb-speed, --eb-thickness,
// --eb-radius, --eb-glow.
export default function ElectricBorder({
  mode = 'hover',
  variant = 'mint',
  color,
  speed,
  thickness,
  radius,
  glow,
  className = '',
  style,
  children,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    registerEB(el)
    return () => unregisterEB(el)
  }, [])

  const vars = {
    ...(color ? { '--eb-color': color } : {}),
    ...(speed ? { '--eb-speed': speed } : {}),
    ...(thickness ? { '--eb-thickness': thickness } : {}),
    ...(radius ? { '--eb-radius': radius } : {}),
    ...(glow ? { '--eb-glow': glow } : {}),
  }

  return (
    <div
      ref={ref}
      className={`electric-border eb-${mode} eb-${variant}${className ? ` ${className}` : ''}`}
      style={{ ...vars, ...style }}
    >
      <div className="eb-inner">{children}</div>
    </div>
  )
}
