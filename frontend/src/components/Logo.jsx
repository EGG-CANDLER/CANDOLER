export default function Logo({ size = 38, variant = 'mark' }) {
  const scale = size / 38

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="egg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2FF3CF" />
          <stop offset="100%" stopColor="#1C8F80" />
        </linearGradient>
        <linearGradient id="egg-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="logo-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Egg body */}
      <ellipse
        cx="19"
        cy="19"
        rx="15"
        ry="18"
        fill="url(#egg-gradient)"
        filter="url(#logo-shadow)"
      />

      {/* Inner highlight */}
      <ellipse
        cx="14"
        cy="13"
        rx="8"
        ry="10"
        fill="url(#egg-highlight)"
        opacity="0.5"
      />

      {/* Candling light glow */}
      <ellipse
        cx="19"
        cy="19"
        rx="6"
        ry="8"
        fill="rgba(255,255,255,0.2)"
      />

      {/* Embryo silhouette */}
      <ellipse
        cx="19"
        cy="20"
        rx="3"
        ry="3.5"
        fill="rgba(6,35,31,0.25)"
      />

      {variant === 'full' && (
        <text
          x="44"
          y="24"
          fontSize="14"
          fontWeight="600"
          fill="currentColor"
          fontFamily="Plus Jakarta Sans, Inter, system-ui, sans-serif"
          letterSpacing="0.5"
        >
          Egg Candling
        </text>
      )}
    </svg>
  )
}
