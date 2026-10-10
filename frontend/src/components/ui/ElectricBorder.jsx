import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

function hexToRgba(color, alpha = 1) {
  if (!color) return `rgba(59, 130, 246, ${alpha})`
  if (color.startsWith('rgb')) {
    return color.replace(/rgb\((.+)\)/, `rgba($1, ${alpha})`).replace(/rgba\((.+),\s*[\d.]+\)/, `rgba($1, ${alpha})`)
  }
  if (color.startsWith('oklch')) {
    // OKLCH with alpha support
    if (color.includes('/')) {
      return color.replace(/\/\s*[\d.%]+/, `/ ${alpha * 100}%`)
    }
    return color.replace(/\)$/, ` / ${alpha * 100}%)`)
  }
  let h = color.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length === 6) {
    const int = parseInt(h.slice(0, 6), 16)
    const r = (int >> 16) & 255
    const g = (int >> 8) & 255
    const b = int & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

// React Bits (reactbits.dev) Electric Border component
// Jittery electric energy border with animated arcs, noise displacement, and glow
export default function ElectricBorder({
  children,
  color = 'var(--chart-1)',
  speed = 1.2,
  chaos = 0.12,
  borderRadius = 12, // matches rounded-xl (0.75rem ~ 12px)
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animationRef = useRef(null)
  const timeRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const [resolvedColor, setResolvedColor] = useState('#3b82f6')
  const [reducedMotion, setReducedMotion] = useState(false)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Resolve CSS variable to computed value
  useEffect(() => {
    if (!containerRef.current) return
    const resolve = () => {
      if (color.startsWith('var(')) {
        const varName = color.slice(4, -1).trim()
        const computed = getComputedStyle(containerRef.current).getPropertyValue(varName).trim()
        if (computed) {
          setResolvedColor(computed)
          return
        }
      }
      setResolvedColor(color)
    }
    resolve()

    const observer = new MutationObserver(resolve)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [color])

  const random = useCallback((x) => {
    return (Math.sin(x * 12.9898) * 43758.5453) % 1
  }, [])

  const noise2D = useCallback(
    (x, y) => {
      const i = Math.floor(x)
      const j = Math.floor(y)
      const fx = x - i
      const fy = y - j

      const a = random(i + j * 57)
      const b = random(i + 1 + j * 57)
      const c = random(i + (j + 1) * 57)
      const d = random(i + 1 + (j + 1) * 57)

      const ux = fx * fx * (3.0 - 2.0 * fx)
      const uy = fy * fy * (3.0 - 2.0 * fy)

      return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
    },
    [random],
  )

  const octavedNoise = useCallback(
    (x, octaves, lacunarity, gain, baseAmplitude, baseFrequency, time, seed, baseFlatness) => {
      let y = 0
      let amplitude = baseAmplitude
      let frequency = baseFrequency

      for (let i = 0; i < octaves; i++) {
        let octaveAmplitude = amplitude
        if (i === 0) {
          octaveAmplitude *= baseFlatness
        }
        y += octaveAmplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3)
        frequency *= lacunarity
        amplitude *= gain
      }

      return y
    },
    [noise2D],
  )

  const getCornerPoint = useCallback(
    (centerX, centerY, radius, startAngle, arcLength, progress) => {
      const angle = startAngle + progress * arcLength
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    },
    [],
  )

  const getRoundedRectPoint = useCallback(
    (t, left, top, width, height, radius) => {
      const straightWidth = width - 2 * radius
      const straightHeight = height - 2 * radius
      const cornerArc = (Math.PI * radius) / 2
      const totalPerimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerArc
      const distance = t * totalPerimeter

      let accumulated = 0

      if (distance <= accumulated + straightWidth) {
        const progress = (distance - accumulated) / straightWidth
        return { x: left + radius + progress * straightWidth, y: top }
      }
      accumulated += straightWidth

      if (distance <= accumulated + cornerArc) {
        const progress = (distance - accumulated) / cornerArc
        return getCornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, progress)
      }
      accumulated += cornerArc

      if (distance <= accumulated + straightHeight) {
        const progress = (distance - accumulated) / straightHeight
        return { x: left + width, y: top + radius + progress * straightHeight }
      }
      accumulated += straightHeight

      if (distance <= accumulated + cornerArc) {
        const progress = (distance - accumulated) / cornerArc
        return getCornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, progress)
      }
      accumulated += cornerArc

      if (distance <= accumulated + straightWidth) {
        const progress = (distance - accumulated) / straightWidth
        return { x: left + width - radius - progress * straightWidth, y: top + height }
      }
      accumulated += straightWidth

      if (distance <= accumulated + cornerArc) {
        const progress = (distance - accumulated) / cornerArc
        return getCornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, progress)
      }
      accumulated += cornerArc

      if (distance <= accumulated + straightHeight) {
        const progress = (distance - accumulated) / straightHeight
        return { x: left, y: top + height - radius - progress * straightHeight }
      }
      accumulated += straightHeight

      const progress = (distance - accumulated) / cornerArc
      return getCornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, progress)
    },
    [getCornerPoint],
  )

  useEffect(() => {
    if (reducedMotion) return

    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const octaves = 8
    const lacunarity = 1.6
    const gain = 0.7
    const amplitude = chaos
    const frequency = 10
    const baseFlatness = 0
    const displacement = 50
    const borderOffset = 50

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const width = rect.width + borderOffset * 2
      const height = rect.height + borderOffset * 2

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      return { width, height }
    }

    let { width, height } = updateSize()
    let lastDpr = Math.min(window.devicePixelRatio || 1, 2)

    const drawElectricBorder = (currentTime) => {
      if (!canvas || !ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (dpr !== lastDpr) {
        lastDpr = dpr
        const newSize = updateSize()
        width = newSize.width
        height = newSize.height
      }

      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000
      timeRef.current += deltaTime * speed
      lastFrameTimeRef.current = currentTime

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr, dpr)

      ctx.strokeStyle = resolvedColor
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const scale = displacement
      const left = borderOffset
      const top = borderOffset
      const borderWidth = width - 2 * borderOffset
      const borderHeight = height - 2 * borderOffset
      const maxRadius = Math.min(borderWidth, borderHeight) / 2
      const radius = Math.min(borderRadius, maxRadius)

      const approximatePerimeter = 2 * (borderWidth + borderHeight) + 2 * Math.PI * radius
      const sampleCount = Math.floor(approximatePerimeter / 2)

      ctx.beginPath()

      for (let i = 0; i <= sampleCount; i++) {
        const progress = i / sampleCount
        const point = getRoundedRectPoint(progress, left, top, borderWidth, borderHeight, radius)

        const xNoise = octavedNoise(
          progress * 8,
          octaves,
          lacunarity,
          gain,
          amplitude,
          frequency,
          timeRef.current,
          0,
          baseFlatness,
        )
        const yNoise = octavedNoise(
          progress * 8,
          octaves,
          lacunarity,
          gain,
          amplitude,
          frequency,
          timeRef.current,
          1,
          baseFlatness,
        )

        const displacedX = point.x + xNoise * scale
        const displacedY = point.y + yNoise * scale

        if (i === 0) {
          ctx.moveTo(displacedX, displacedY)
        } else {
          ctx.lineTo(displacedX, displacedY)
        }
      }

      ctx.closePath()
      ctx.stroke()

      animationRef.current = requestAnimationFrame(drawElectricBorder)
    }

    const resizeObserver = new ResizeObserver(() => {
      const newSize = updateSize()
      width = newSize.width
      height = newSize.height
    })
    resizeObserver.observe(container)

    animationRef.current = requestAnimationFrame(drawElectricBorder)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      resizeObserver.disconnect()
    }
  }, [resolvedColor, speed, chaos, borderRadius, octavedNoise, getRoundedRectPoint, reducedMotion])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-visible isolate ${className}`}
      style={{
        '--electric-border-color': resolvedColor,
        borderRadius,
        ...style,
      }}
    >
      {/* Animated noise canvas border (skipped under reduced motion) */}
      {!reducedMotion && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[2]">
          <canvas ref={canvasRef} className="block" />
        </div>
      )}

      {/* Layered glowing borders using primary/chart tokens */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none z-0">
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-colors duration-300"
          style={{
            border: `1.5px solid ${hexToRgba(resolvedColor, 0.45)}`,
            filter: 'blur(1px)',
          }}
        />
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-colors duration-300"
          style={{
            border: `1.5px solid ${resolvedColor}`,
            filter: 'blur(4px)',
            opacity: 0.65,
          }}
        />
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none -z-[1] scale-105 opacity-25 dark:opacity-35 transition-colors duration-300"
          style={{
            filter: 'blur(28px)',
            background: `radial-gradient(circle, ${resolvedColor} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Children content container */}
      <div className="relative rounded-[inherit] z-[1] h-full w-full">{children}</div>
    </div>
  )
}

