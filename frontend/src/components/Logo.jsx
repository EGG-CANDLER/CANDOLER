import * as React from 'react'
import eggCandlingLogo from './logo/Egg_candling_logo.png'

export default function Logo({ size = 38, variant = 'mark', className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <img
        src={eggCandlingLogo}
        alt="Egg Candling Logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain shrink-0 rounded-md"
      />
      {variant === 'full' && (
        <span className="font-semibold tracking-tight text-foreground text-sm font-sans">
          Egg Candling
        </span>
      )}
    </div>
  )
}
