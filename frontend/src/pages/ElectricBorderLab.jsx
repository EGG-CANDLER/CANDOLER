import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import ElectricBorder from '../components/ui/ElectricBorder'

function Row({ label, children, value }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between py-2 border-b border-border/50 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {children}
        <span className="font-mono text-muted-foreground min-w-[3rem] text-right">
          {value}
        </span>
      </div>
    </div>
  )
}

export default function ElectricBorderLab() {
  const [mode, setMode] = React.useState('always')
  const [variant, setVariant] = React.useState('mint')
  const [color, setColor] = React.useState('#3b82f6')
  const [speed, setSpeed] = React.useState(4.5)
  const [thickness, setThickness] = React.useState(1.5)
  const [glow, setGlow] = React.useState(12)
  const [radius, setRadius] = React.useState(24)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Electric Border FX Lab
            </h1>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Sparkles className="size-3 text-primary" /> v2
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic SVG turbulence and border animation playground in isolation.
          </p>
        </div>
        <Button as={Link} to="/" variant="outline" size="sm" className="gap-1.5 self-start">
          <ArrowLeft className="size-3.5" /> Back to Scanner
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Preview Card */}
        <div className="flex flex-col justify-center">
          <ElectricBorder
            mode={mode}
            variant={variant}
            color={color}
            speed={`${speed}s`}
            thickness={`${thickness}px`}
            glow={`${glow}px`}
            radius={`${radius}px`}
            className="w-full"
          >
            <Card className="p-8 text-center bg-card">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Electric Border &middot; Live Demo
              </span>
              <div className="text-4xl font-extrabold text-foreground tracking-tight my-3">
                +99.4%
              </div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {mode === 'hover'
                  ? 'Hover over this card to trigger the electric flow effect.'
                  : 'Currently rendering in continuous active mode.'}
              </p>
            </Card>
          </ElectricBorder>
        </div>

        {/* Tunables Control Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tunables & Parameters</CardTitle>
            <CardDescription>
              Adjust CSS custom variables live on the preview component.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <Row label="Mode" value={mode}>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="text-xs h-8 rounded-md border border-border bg-background px-2 text-foreground"
              >
                <option value="always">always</option>
                <option value="hover">hover / focus</option>
              </select>
            </Row>

            <Row label="Variant" value={variant}>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="text-xs h-8 rounded-md border border-border bg-background px-2 text-foreground"
              >
                <option value="mint">mint</option>
                <option value="light">light</option>
              </select>
            </Row>

            <Row label="Border Color" value={color}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-7 rounded border border-border bg-transparent cursor-pointer"
              />
            </Row>

            <Row label="Speed" value={`${speed.toFixed(1)}s`}>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-32 cursor-pointer"
              />
            </Row>

            <Row label="Thickness" value={`${thickness.toFixed(1)}px`}>
              <input
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                className="w-32 cursor-pointer"
              />
            </Row>

            <Row label="Glow Radius" value={`${glow.toFixed(0)}px`}>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={glow}
                onChange={(e) => setGlow(Number(e.target.value))}
                className="w-32 cursor-pointer"
              />
            </Row>

            <Row label="Border Radius" value={`${radius.toFixed(0)}px`}>
              <input
                type="range"
                min="10"
                max="32"
                step="1"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-32 cursor-pointer"
              />
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
