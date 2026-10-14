import * as React from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

import eggCandlingLogo from './logo/Egg_candling_logo.png'

export default function Logo({ size = 38, variant = 'mark', className = '' }) {
  const imgRef = React.useRef(null)

  // Subtle breathing glow animation on the candling egg
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (!imgRef.current) return

      gsap.to(imgRef.current, {
        filter: 'drop-shadow(0 0 6px var(--chart-1))',
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    },
    { scope: imgRef },
  )

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <img
        ref={imgRef}
        src={eggCandlingLogo}
        alt="Egg Candling Logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain shrink-0 rounded-md transition-transform duration-200 hover:scale-105"
      />
      {variant === 'full' && (
        <span className="font-semibold tracking-tight text-foreground text-sm font-sans">
          Egg Candling
        </span>
      )}
    </div>
  )
}
