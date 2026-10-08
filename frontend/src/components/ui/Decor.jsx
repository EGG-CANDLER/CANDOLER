// Decorative SVG/CSS art. Glass bot-egg mascot.
export function BotEgg() {
  return (
    <svg className="botegg" viewBox="0 0 160 170" role="img" aria-label="Egg Candling mascot">
      <defs>
        <linearGradient id="botBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2FF3CF" />
          <stop offset="100%" stopColor="#1C8F80" />
        </linearGradient>
        <linearGradient id="botVisor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E2A28" />
          <stop offset="100%" stopColor="#061312" />
        </linearGradient>
        <radialGradient id="botGloss" cx="0.32" cy="0.24" r="0.9">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id="bot-shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
        </filter>
      </defs>

      <ellipse cx="80" cy="156" rx="44" ry="9" fill="#2FF3CF" opacity="0.22" />

      {/* antenna */}
      <line x1="80" y1="26" x2="80" y2="10" stroke="#2FF3CF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="80" cy="9" r="6" fill="#2FF3CF" />
      <circle cx="80" cy="9" r="6" fill="#2FF3CF" opacity="0.5">
        <animate attributeName="r" values="6;10;6" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* body */}
      <ellipse cx="80" cy="92" rx="56" ry="64" fill="url(#botBody)" filter="url(#bot-shadow)" />
      <ellipse cx="80" cy="92" rx="56" ry="64" fill="url(#botGloss)" />

      {/* visor */}
      <rect x="42" y="66" width="76" height="40" rx="20" fill="url(#botVisor)" />
      <circle cx="66" cy="86" r="8" fill="#2FF3CF" />
      <circle cx="94" cy="86" r="8" fill="#2FF3CF" />
      <circle cx="63.5" cy="83.5" r="2.4" fill="#FFFFFF" />
      <circle cx="91.5" cy="83.5" r="2.4" fill="#FFFFFF" />

      {/* chest light */}
      <circle cx="80" cy="124" r="9" fill="#0E2A28" />
      <circle cx="80" cy="124" r="5" fill="#2FF3CF" />

      {/* side pods */}
      <rect x="16" y="86" width="12" height="26" rx="6" fill="#BFE9E0" />
      <rect x="132" y="86" width="12" height="26" rx="6" fill="#BFE9E0" />
    </svg>
  )
}
