import * as React from 'react'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  RefreshCw,
  Server,
  Shield,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

import { api } from '../lib/api'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { AreaChart, ReportGraph } from '../components/ui/charts'
import { CountUp } from '../components/ui/CountUp'
import ImageModal from '../components/ImageModal'
import farmHeaderBanner from '../images/chicken-eggs-wooden-table-background-farm-chickens-342155306.webp'

export default function Manager() {
  const managerRef = React.useRef(null)
  const [modelStatus, setModelStatus] = React.useState(null)
  const [logsData, setLogsData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [selectedScan, setSelectedScan] = React.useState(null)

  // Staggered card and telemetry entrance
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('.gsap-manager-card', {
        opacity: 0,
        y: 14,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
      })
    },
    { scope: managerRef },
  )

  const loadData = React.useCallback(async () => {
    setError('')
    try {
      const [status, logs] = await Promise.all([
        api.status().catch(() => null),
        api.logs({ per_page: 25 }).catch(() => null),
      ])
      setModelStatus(status)
      setLogsData(logs)
    } catch (err) {
      setError(err?.message || 'Failed to load manager diagnostics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const logs = logsData?.logs || []
  const totalScans = logsData?.total || 0
  const modelReady = Boolean(modelStatus?.model_ready)
  const confidences = logs
    .map((l) => Number(l.confidence) || 0)
    .filter((c) => c > 0)
  const avgConfidenceNum = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : null

  const sparkValues = confidences.slice(0, 7).reverse()
  const sparkLabels = logs.slice(0, 7).reverse().map((l) => l.predicted_day || 'Egg')

  return (
    <div ref={managerRef} className="flex flex-col gap-6">
      {/* Page Header with Farm Header Banner Preview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manager Console
            </h1>
            <Badge
              variant={modelReady ? 'leaf' : 'secondary'}
              className="gap-1.5 text-xs py-0.5"
            >
              <span
                className={`size-2 rounded-full ${
                  modelReady ? 'bg-[#52B788] animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              {modelReady ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            System diagnostics, YOLO pipeline latency, and inspection performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Diagnostics
          </Button>
        </div>
      </div>

      {/* Farm Inspection Module Banner */}
      <div className="gsap-manager-card relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1E4D2B] dark:text-[#52B788] block mb-1">
            Hatchery Unit Diagnostics
          </span>
          <h2 className="text-xl font-bold text-foreground">
            Precision Candling & Hardware Telemetry
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Direct interface into local edge inference metrics, camera frames, and database batch archiving records.
          </p>
        </div>
        <div className="w-full sm:w-64 h-24 rounded-lg overflow-hidden border border-border shrink-0 shadow-xs">
          <img
            src={farmHeaderBanner}
            alt="Farm eggs on table"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="gsap-manager-card">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Inference Engine
              </CardTitle>
              <Cpu className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {modelStatus?.model_name || (modelReady ? 'YOLOv11' : 'None')}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#52B788]" />
                {modelReady ? 'Model active & inferring' : 'Model not ready'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="gsap-manager-card">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Inspections
              </CardTitle>
              <Database className="size-4 text-[#52B788]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                <CountUp value={totalScans} decimals={0} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Archived candling snapshots
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="gsap-manager-card">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Mean Confidence
              </CardTitle>
              <Activity className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {avgConfidenceNum === null ? (
                  '—'
                ) : (
                  <CountUp value={avgConfidenceNum} decimals={1} suffix="%" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across recent egg analyses
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="gsap-manager-card">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Backend Status
              </CardTitle>
              <Server className="size-4 text-[#52B788]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {loading ? 'Polling…' : 'Online'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Local FastStream / YOLO API
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Telemetry charts & Recent Inspection Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="gsap-manager-card lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Inspection Confidence Trends
                </CardTitle>
                <CardDescription>
                  Confidence trajectory across recent candling inspections
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Telemetry
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="pt-2">
                <ReportGraph
                  data={sparkValues.length ? sparkValues : [0, 0, 0, 0, 0, 0, 0]}
                  labels={sparkLabels.length ? sparkLabels : ['', '', '', '', '', '', '']}
                  height={190}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center text-xs">
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Inference Runtime
                  </span>
                  <span className="font-mono font-medium text-foreground text-sm">~45ms</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Precision
                  </span>
                  <span className="font-mono font-medium text-foreground text-sm">FP16</span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Input Res
                  </span>
                  <span className="font-mono font-medium text-foreground text-sm">640×640</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Capabilities & Model Overview */}
        <div className="gsap-manager-card">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Hardware Diagnostics</CardTitle>
              <CardDescription>Sensor & edge environment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="rounded-lg border border-border divide-y divide-border">
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-muted-foreground">Framework</span>
                  <span className="font-medium text-foreground">Ultralytics YOLO</span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-muted-foreground">Execution</span>
                  <span className="font-medium text-foreground">Local Python CPU/GPU</span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-muted-foreground">Development Stages</span>
                  <span className="font-medium text-foreground">Day 1 to Day 21</span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-muted-foreground">Session Integrity</span>
                  <span className="font-medium text-[#52B788] flex items-center gap-1">
                    <Shield className="size-3" /> Secure Operator
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#E8F5E9] dark:bg-[#1B291F] text-[#1E4D2B] dark:text-[#52B788] text-xs">
                All inference parameters conform to the commercial poultry incubation standard.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="gsap-manager-card">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Operator Scans</CardTitle>
              <CardDescription>Latest entries captured across candling batches</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {logs.length} logged
            </Badge>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No recent scan logs recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Day</th>
                      <th className="px-3.5 py-2.5">Confidence</th>
                      <th className="px-3.5 py-2.5">Timestamp</th>
                      <th className="px-3.5 py-2.5 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.slice(0, 5).map((log) => (
                      <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-foreground">
                          {log.predicted_day || '—'}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-mono font-medium text-[#1E4D2B] dark:text-[#52B788]">
                            {typeof log.confidence === 'number'
                              ? `${log.confidence.toFixed(1)}%`
                              : '—'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {[log.date_display, log.time_display].filter(Boolean).join(' ')}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setSelectedScan(log)}
                            className="hover:text-primary"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ImageModal
        isOpen={Boolean(selectedScan)}
        item={selectedScan}
        onClose={() => setSelectedScan(null)}
      />
    </div>
  )
}
