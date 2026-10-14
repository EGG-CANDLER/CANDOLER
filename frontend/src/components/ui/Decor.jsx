import * as React from 'react'

// Decorative SVG art — BotEgg mascot styled adaptively for light & dark mode using design tokens
export function BotEgg({ className = '' }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '')

  return (
    <svg
      className={`size-32 ${className}`}
      viewBox="0 0 160 170"
      role="img"
      aria-label="Egg Candling mascot"
    >
      <defs>
        <linearGradient id={`botBody${id}`} x1="0%" y1="0%" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--card)" stopOpacity="0.9" />
          <stop offset="50%" stopColor="var(--muted)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.7" />
        </linearGradient>

        <radialGradient id={`botSpec${id}`} cx="0.30" cy="0.22" r="0.85">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`botVisor${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.95" />
        </linearGradient>

        <radialGradient id={`botEye${id}`} cx="0.4" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="var(--chart-1)" />
          <stop offset="100%" stopColor="var(--chart-2)" />
        </radialGradient>

        <filter id={`botGlow${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="80" cy="158" rx="44" ry="8" fill="var(--foreground)" opacity="0.1" />

      {/* Antenna */}
      <line
        x1="80"
        y1="26"
        x2="80"
        y2="10"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="80" cy="9" r="5" fill="var(--chart-1)" filter={`url(#botGlow${id})`} />
      <circle cx="80" cy="9" r="5" fill="var(--chart-1)" opacity="0.45">
        <animate attributeName="r" values="5;9;5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.45;0;0.45" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Body */}
      <ellipse
        cx="80"
        cy="92"
        rx="56"
        ry="64"
        fill={`url(#botBody${id})`}
        stroke="var(--border)"
        strokeWidth="1.5"
      />

      {/* Specular highlight */}
      <ellipse cx="80" cy="92" rx="56" ry="64" fill={`url(#botSpec${id})`} />

      {/* Visor */}
      <rect
        x="42"
        y="66"
        width="76"
        height="40"
        rx="20"
        fill={`url(#botVisor${id})`}
        stroke="var(--border)"
        strokeWidth="1"
      />

      {/* Visor reflection */}
      <rect
        x="44"
        y="68"
        width="72"
        height="14"
        rx="7"
        fill="var(--background)"
        opacity="0.18"
      />

      {/* Eyes */}
      <circle cx="66" cy="86" r="8" fill={`url(#botEye${id})`} />
      <circle cx="94" cy="86" r="8" fill={`url(#botEye${id})`} />
      <circle cx="64" cy="84" r="2.5" fill="#FFFFFF" opacity="0.95" />
      <circle cx="92" cy="84" r="2.5" fill="#FFFFFF" opacity="0.95" />

      {/* Chest light */}
      <circle
        cx="80"
        cy="124"
        r="10"
        fill="var(--muted)"
        stroke="var(--border)"
      />
      <circle cx="80" cy="124" r="6" fill="var(--chart-1)" filter={`url(#botGlow${id})`} />

      {/* Side pods */}
      <rect
        x="16"
        y="86"
        width="12"
        height="26"
        rx="6"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="1"
      />
      <rect
        x="132"
        y="86"
        width="12"
        height="26"
        rx="6"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="1"
      />
    </svg>
  )
}
