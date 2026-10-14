// Decorative SVG art — BotEgg mascot styled in pure white glassmorphism.
export function BotEgg() {
  return (
    <svg className="botegg" viewBox="0 0 160 170" role="img" aria-label="Egg Candling mascot">
      <defs>
        {/* White glass body gradient */}
        <linearGradient id="botWhiteBody" x1="0%" y1="0%" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>

        {/* Glass fill overlay */}
        <linearGradient id="botGlass" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>

        {/* Specular radial */}
        <radialGradient id="botSpec" cx="0.30" cy="0.22" r="0.85">
          <stop offset="0%" stopColor="rgba(255,255,255,0.60)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        {/* Visor dark glass */}
        <linearGradient id="botVisor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>

        {/* Eye glow gradient */}
        <radialGradient id="botEye" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
        </radialGradient>

        {/* Glow filter */}
        <filter id="bot-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Eye glow filter */}
        <filter id="eye-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="80" cy="158" rx="44" ry="8" fill="rgba(0,0,0,0.4)" />

      {/* Antenna */}
      <line x1="80" y1="26" x2="80" y2="10" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="9" r="5" fill="#FFFFFF" filter="url(#eye-glow)" />
      <circle cx="80" cy="9" r="5" fill="#FFFFFF" opacity="0.45">
        <animate attributeName="r" values="5;10;5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.45;0;0.45" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Glass body */}
      <ellipse cx="80" cy="92" rx="56" ry="64" fill="url(#botWhiteBody)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" filter="url(#bot-glow)" />

      {/* Glass overlay */}
      <ellipse cx="80" cy="92" rx="56" ry="64" fill="url(#botGlass)" />

      {/* Specular highlight */}
      <ellipse cx="80" cy="92" rx="56" ry="64" fill="url(#botSpec)" />

      {/* Visor */}
      <rect x="42" y="66" width="76" height="40" rx="20" fill="url(#botVisor)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

      {/* Visor glass reflection */}
      <rect x="42" y="66" width="76" height="16" rx="20" fill="rgba(255,255,255,0.12)" />

      {/* Eyes */}
      <circle cx="66" cy="86" r="9" fill="url(#botEye)" filter="url(#eye-glow)" />
      <circle cx="94" cy="86" r="9" fill="url(#botEye)" filter="url(#eye-glow)" />
      <circle cx="63.5" cy="83.5" r="2.5" fill="rgba(255,255,255,0.9)" />
      <circle cx="91.5" cy="83.5" r="2.5" fill="rgba(255,255,255,0.9)" />

      {/* Chest light */}
      <circle cx="80" cy="124" r="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" />
      <circle cx="80" cy="124" r="6" fill="#FFFFFF" filter="url(#eye-glow)" />

      {/* Side pods — frosted glass */}
      <rect x="16" y="86" width="12" height="26" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <rect x="132" y="86" width="12" height="26" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  )
}
