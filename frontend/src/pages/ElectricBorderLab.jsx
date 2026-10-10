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
  const [color, setColor] = React.useState('#3b82f6')
  const [speed, setSpeed] = React.useState(1.4)
  const [chaos, setChaos] = React.useState(0.14)
  const [radius, setRadius] = React.useState(16)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Electric Border FX Lab
            </h1>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Sparkles className="size-3 text-primary animate-pulse" /> React Bits
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            React Bits canvas noise displacement energy border in isolation.
          </p>
        </div>
        <Button as={Link} to="/" variant="outline" size="sm" className="gap-1.5 self-start hover:-translate-y-0.5 active:scale-95 transition-all">
          <ArrowLeft className="size-3.5" /> Back to Scanner
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Preview Card */}
        <div className="flex flex-col justify-center p-4">
          <ElectricBorder
            color={color}
            speed={speed}
            chaos={chaos}
            borderRadius={radius}
            className="w-full"
          >
            <Card className="p-8 text-center bg-card shadow-sm">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                React Bits Electric Border &middot; Live Demo
              </span>
              <div className="text-4xl font-extrabold text-foreground tracking-tight my-3">
                +99.4%
              </div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Real-time canvas fractal noise arc simulation with reactive glow.
              </p>
            </Card>
          </ElectricBorder>
        </div>

        {/* Tunables Control Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tunables & Parameters</CardTitle>
            <CardDescription>
              Adjust noise frequency, speed, and arc displacement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <Row label="Border Color" value={color}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-7 rounded border border-border bg-transparent cursor-pointer"
              />
            </Row>

            <Row label="Speed" value={`${speed.toFixed(1)}x`}>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-32 cursor-pointer"
              />
            </Row>

            <Row label="Chaos (Displacement)" value={chaos.toFixed(2)}>
              <input
                type="range"
                min="0.02"
                max="0.35"
                step="0.01"
                value={chaos}
                onChange={(e) => setChaos(Number(e.target.value))}
                className="w-32 cursor-pointer"
              />
            </Row>

            <Row label="Border Radius" value={`${radius.toFixed(0)}px`}>
              <input
                type="range"
                min="4"
                max="28"
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
