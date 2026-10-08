import { useState } from 'react'
import { Link } from 'react-router-dom'

import ElectricBorder from '../components/ui/ElectricBorder.jsx'
import PillButton from '../components/ui/PillButton.jsx'

function Row({ label, children, value }) {
  return (
    <label className="lab-row">
      <span className="lab-row-head">
        <span>{label}</span>
        <output>{value}</output>
      </span>
      {children}
    </label>
  )
}

// Isolated Electric Border v2 playground — tune the effect in one place.
export default function ElectricBorderLab() {
  const [mode, setMode] = useState('always')
  const [variant, setVariant] = useState('mint')
  const [color, setColor] = useState('#2ff3cf')
  const [speed, setSpeed] = useState(4.5)
  const [thickness, setThickness] = useState(1.5)
  const [glow, setGlow] = useState(12)
  const [radius, setRadius] = useState(24)

  return (
    <div className="lab">
      <div className="page-head">
        <div>
          <h2>Electric Border Lab</h2>
          <p className="muted">
            The glow ring in isolation — tweak the tunables and watch the card update live.
          </p>
        </div>
        <PillButton as={Link} to="/" variant="dark">
          ← Back to dashboard
        </PillButton>
      </div>

      <div className="lab-grid">
        <ElectricBorder
          mode={mode}
          variant={variant}
          color={color}
          speed={`${speed}s`}
          thickness={`${thickness}px`}
          glow={`${glow}px`}
          radius={`${radius}px`}
          className="lab-demo"
        >
          <div className="lab-demo-inner">
            <p className="muted">Electric Border v2 · live preview</p>
            <div className="stat">
              <div className="stat-value">+283%</div>
              <div className="stat-caption">Return on Investment</div>
            </div>
            <p className="muted small">
              Hover me in <b>hover</b> mode — or switch to <b>always</b> for the CTA treatment.
            </p>
          </div>
        </ElectricBorder>

        <section className="card lab-controls" aria-label="Border tunables">
          <div className="card-head">
            <div className="card-head-text">
              <h2>Tunables</h2>
              <p className="muted">Same props / CSS vars the cards use.</p>
            </div>
          </div>

          <Row label="Mode" value={mode}>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="always">always</option>
              <option value="hover">hover / focus</option>
            </select>
          </Row>

          <Row label="Variant" value={variant}>
            <select value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="mint">mint (dark cards)</option>
              <option value="light">light (mint cards)</option>
            </select>
          </Row>

          <Row label="Color · --eb-color" value={color}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </Row>

          <Row label="Speed · --eb-speed" value={`${speed.toFixed(1)}s`}>
            <input
              type="range" min="1" max="12" step="0.5" value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </Row>

          <Row label="Thickness · --eb-thickness" value={`${thickness.toFixed(1)}px`}>
            <input
              type="range" min="1" max="3" step="0.5" value={thickness}
              onChange={(e) => setThickness(Number(e.target.value))}
            />
          </Row>

          <Row label="Glow · --eb-glow" value={`${glow.toFixed(0)}px`}>
            <input
              type="range" min="0" max="24" step="1" value={glow}
              onChange={(e) => setGlow(Number(e.target.value))}
            />
          </Row>

          <Row label="Radius · --eb-radius" value={`${radius.toFixed(0)}px`}>
            <input
              type="range" min="12" max="32" step="1" value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </Row>
        </section>
      </div>

      <section className="card lab-notes">
        <div className="card-head">
          <div className="card-head-text">
            <h2>Wiring notes</h2>
            <p className="muted">How the effect is used across the app.</p>
          </div>
        </div>
        <ul className="lab-list">
          <li><b>Always on:</b> CTA card + AI model card (<code>mode="always"</code>).</li>
          <li><b>Hover / focus only:</b> every other card (<code>mode="hover"</code>, ~300ms fade + lift).</li>
          <li>Mint-gradient cards use <code>variant="light"</code> (teal/white border) for contrast.</li>
          <li>One shared SVG filter (<code>#eb-distort</code>) lives in <code>main.jsx</code>; a single ~20fps loop animates its seed, paused offscreen and under <code>prefers-reduced-motion</code>.</li>
        </ul>
      </section>
    </div>
  )
}
