// Glass egg logo with pure white glass, frosted fill, specular highlight, and inner candling silhouette.
export default function Logo({ size = 38, variant = 'mark' }) {
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
        {/* White rim gradient */}
        <linearGradient id="egg-white-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)" />
        </linearGradient>

        {/* White glass fill */}
        <linearGradient id="egg-glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>

        {/* Specular highlight */}
        <radialGradient id="egg-spec" cx="30%" cy="25%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        {/* Glow filter */}
        <filter id="egg-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Inner candling glow */}
        <filter id="egg-inner-glow">
          <feFlood floodColor="rgba(255,255,255,0.5)" result="color" />
          <feComposite in="color" in2="SourceGraphic" operator="in" result="inner" />
          <feGaussianBlur in="inner" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* White glass rim */}
      <ellipse
        cx="19"
        cy="19"
        rx="16"
        ry="19"
        fill="url(#egg-white-rim)"
        filter="url(#egg-glow)"
        opacity="0.8"
      />

      {/* Glass body */}
      <ellipse
        cx="19"
        cy="19"
        rx="14.5"
        ry="17.5"
        fill="url(#egg-glass)"
      />

      {/* Specular highlight */}
      <ellipse
        cx="19"
        cy="19"
        rx="14.5"
        ry="17.5"
        fill="url(#egg-spec)"
      />

      {/* Candling light glow center */}
      <ellipse
        cx="19"
        cy="20"
        rx="5"
        ry="7"
        fill="rgba(255,255,255,0.25)"
        filter="url(#egg-inner-glow)"
      />

      {/* Embryo silhouette */}
      <ellipse
        cx="19"
        cy="21"
        rx="2.5"
        ry="3"
        fill="rgba(10,11,30,0.35)"
      />

      {variant === 'full' && (
        <text
          x="44"
          y="24"
          fontSize="14"
          fontWeight="600"
          fill="#FFFFFF"
          fontFamily="Plus Jakarta Sans, Inter, system-ui, sans-serif"
          letterSpacing="0.5"
        >
          Egg Candling
        </text>
      )}
    </svg>
  )
}
