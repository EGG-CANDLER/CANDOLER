import * as React from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function CountUp({
  value,
  duration = 0.5,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}) {
  const spanRef = React.useRef(null)
  const prevVal = React.useRef(0)

  useGSAP(
    () => {
      const target = Number(value)
      if (Number.isNaN(target)) {
        if (spanRef.current) spanRef.current.textContent = `${prefix}${value ?? '—'}${suffix}`
        return
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (spanRef.current) {
          spanRef.current.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`
        }
        return
      }

      const tweenObj = { val: prevVal.current }
      gsap.to(tweenObj, {
        val: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          if (spanRef.current) {
            spanRef.current.textContent = `${prefix}${tweenObj.val.toFixed(decimals)}${suffix}`
          }
        },
        onComplete: () => {
          prevVal.current = target
        },
      })
    },
    [value, duration, decimals, suffix, prefix],
  )

  return (
    <span ref={spanRef} className={className}>
      {prefix}
      {typeof value === 'number' ? value.toFixed(decimals) : value ?? '—'}
      {suffix}
    </span>
  )
}

export default CountUp
