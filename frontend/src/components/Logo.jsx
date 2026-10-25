import * as React from 'react'

import eggInspectionLogo from '../images/logo/Egg Inspection Target Emblem.png'

export default function Logo({ size = 38, variant = 'mark', className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <img
        src={eggInspectionLogo}
        alt="Egg Candling Inspection Emblem"
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
