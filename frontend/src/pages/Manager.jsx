import * as React from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  RefreshCw,
  Server,
  Shield,
  Sliders,
  UserCheck,
} from 'lucide-react'

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
import ImageModal from '../components/ImageModal'

export default function Manager() {
  const [modelStatus, setModelStatus] = React.useState(null)
  const [logsData, setLogsData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [selectedScan, setSelectedScan] = React.useState(null)

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
  const avgConfidence = confidences.length
    ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1)
    : '—'

  const sparkValues = confidences.slice(0, 7).reverse()
  const sparkLabels = logs.slice(0, 7).reverse().map((l) => l.predicted_day || 'Egg')

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manager Console
            </h1>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Shield className="size-3 text-primary" /> Overseer
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            System health, AI model diagnostics, and operator scan telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Model Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Pipeline</CardTitle>
            <Cpu className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  modelReady ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'
                }`}
              />
              <div className="text-2xl font-bold text-foreground">
                {modelReady ? 'Operational' : 'Unavailable'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {modelStatus?.model_path || 'models/egg_candling_best.pt'}
            </p>
          </CardContent>
        </Card>

        {/* Total Scans Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingested Scans</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalScans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronized with Supabase DB
            </p>
          </CardContent>
        </Card>

        {/* Confidence Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mean Confidence</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {avgConfidence === '—' ? '—' : `${avgConfidence}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Threshold min: {(modelStatus?.min_confidence ?? 0.3) * 100}%
            </p>
          </CardContent>
        </Card>

        {/* Database & Cloud Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage & DB</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-2xl font-bold text-foreground">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bucket: egg-images (Postgres RLS)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Trend Area Chart */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Inference Quality Sparkline</CardTitle>
            <CardDescription>
              Recent scan confidence ratings over chronological batches.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AreaChart
              data={sparkValues.length ? sparkValues : [75, 82, 88, 92, 85, 96, 91]}
              labels={sparkLabels.length ? sparkLabels : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']}
              height={140}
            />
            <ReportGraph />
          </CardContent>
        </Card>

        {/* System & Model Config Card */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>System & Model Configuration</CardTitle>
            <CardDescription>Runtime parameters & inference engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
              <span className="text-muted-foreground">Classifier Architecture</span>
              <span className="font-mono font-medium text-foreground">YOLOv11n-cls</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
              <span className="text-muted-foreground">Weights Path</span>
              <span className="font-mono font-medium text-foreground truncate max-w-[160px]">
                egg_candling_best.pt
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
              <span className="text-muted-foreground">Dark Filter Mean Thresh</span>
              <span className="font-mono font-medium text-foreground">18.0</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
              <span className="text-muted-foreground">Image Ingest Constraints</span>
              <span className="font-mono font-medium text-foreground">64 × 64 min</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
              <span className="text-muted-foreground">Current Operator</span>
              <span className="font-medium text-foreground truncate max-w-[160px]">
                {modelStatus?.user?.email || 'Authenticated'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground">Backend Service</span>
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <Server className="size-2.5" /> Flask REST 3.0
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scans Telemetry Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Telemetry Log</CardTitle>
            <CardDescription>
              Inspection history across active sessions ({logs.length} displayed)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading telemetry…
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No recent detection logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Image</th>
                    <th className="py-2.5 px-3">Prediction</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {logs.slice(0, 10).map((scan) => (
                    <tr key={scan.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-xs">{scan.id}</td>
                      <td className="py-2.5 px-3">
                        <img
                          src={scan.image_url}
                          alt={`Scan ${scan.id}`}
                          className="size-9 rounded-md object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedScan(scan)}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {scan.predicted_day || 'Uncertain'}
                        {scan.low_confidence && (
                          <Badge variant="destructive" className="ml-1.5 text-[10px] py-0 px-1.5">
                            Low
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {typeof scan.confidence === 'number'
                          ? `${scan.confidence.toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {scan.stage || scan.development_stage || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {scan.date} {scan.time}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setSelectedScan(scan)}
                          title="View image"
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

      <ImageModal item={selectedScan} onClose={() => setSelectedScan(null)} />
    </div>
  )
}
