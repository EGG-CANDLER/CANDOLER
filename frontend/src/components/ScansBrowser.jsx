import * as React from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Egg,
  Eye,
  Filter,
  Layers,
  Percent,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

import { api } from '../lib/api'
import ImageModal from './ImageModal'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/Card'
import { CountUp } from './ui/CountUp'
import farmPoultryImg from '../images/chicken-eggs-wooden-table-background-farm-chickens-342155306.webp'

const DAYS = Array.from({ length: 21 }, (_, index) => `Day ${index + 1}`)
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const AVAILABLE_KPIS = [
  { id: 'total', label: 'Total Records', description: 'Count of scans matching current filters' },
  { id: 'avgConfidence', label: 'Average Confidence', description: 'Mean AI model prediction confidence' },
  { id: 'highConfidenceRate', label: 'High Confidence Rate', description: 'Scans with confidence ≥ 80%' },
  { id: 'embryoRate', label: 'Embryo Detected Rate', description: 'Scans with identified developmental stage' },
  { id: 'topDay', label: 'Most Frequent Day', description: 'Most common incubation day in the batch' },
  { id: 'lowConfCount', label: 'Low Confidence Alerts', description: 'Scans flagged with low confidence' },
]

const DEFAULT_KPIS = ['total', 'avgConfidence', 'highConfidenceRate', 'topDay']

function confidenceText(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : '—'
}

export default function ScansBrowser({ mode }) {
  const isArchived = mode === 'archives'
  const isTrash = mode === 'trash'
  const browserRef = React.useRef(null)

  const [day, setDay] = React.useState('')
  const [date, setDate] = React.useState('')
  const [appliedDay, setAppliedDay] = React.useState('')
  const [appliedDate, setAppliedDate] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [modalItem, setModalItem] = React.useState(null)
  const [busyId, setBusyId] = React.useState(null)
  const [itemToDelete, setItemToDelete] = React.useState(null)
  const [deletingPermanent, setDeletingPermanent] = React.useState(false)

  // Customizable KPI widgets (saved in localStorage)
  const [selectedKpis, setSelectedKpis] = React.useState(() => {
    try {
      const saved = localStorage.getItem('candoler_selected_kpis')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_KPIS
  })
  const [showKpiPicker, setShowKpiPicker] = React.useState(false)

  const toggleKpi = (id) => {
    setSelectedKpis((prev) => {
      let updated
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev // Keep at least one
        updated = prev.filter((k) => k !== id)
      } else {
        updated = [...prev, id]
      }
      try {
        localStorage.setItem('candoler_selected_kpis', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  // GSAP entrance for the browser container and stat chips
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('.gsap-stat-chip', {
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.05,
        ease: 'power2.out',
      })
    },
    { scope: browserRef },
  )

  // Staggered row appearance on data change
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (!data?.logs?.length) return
      gsap.from('.gsap-table-row', {
        opacity: 0,
        x: -6,
        duration: 0.3,
        stagger: 0.03,
        ease: 'power1.out',
      })
    },
    { dependencies: [data], scope: browserRef },
  )

  const load = React.useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, per_page: perPage }
      if (appliedDay) params.day = appliedDay
      if (appliedDate) params.date = appliedDate

      let result
      if (isTrash) {
        result = await api.trash(params)
      } else if (isArchived) {
        result = await api.archives(params)
      } else {
        result = await api.logs(params)
      }
      setData(result)
    } catch (err) {
      setData(null)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, appliedDay, appliedDate, isArchived, isTrash])

  React.useEffect(() => {
    load()
  }, [load])

  function handleFilterSubmit(e) {
    e.preventDefault()
    setPage(1)
    setAppliedDay(day)
    setAppliedDate(date)
  }

  function handleReset() {
    setDay('')
    setDate('')
    setPage(1)
    setAppliedDay('')
    setAppliedDate('')
  }

  // Logs -> Archive
  async function handleArchive(item) {
    if (busyId) return
    setBusyId(item.id)
    setError('')
    try {
      await api.archiveLog(item.id)
      await load()
    } catch (err) {
      setError(err.message || 'Archive failed')
    } finally {
      setBusyId(null)
    }
  }

  // Archive -> Logs
  async function handleRestoreFromArchive(item) {
    if (busyId) return
    setBusyId(item.id)
    setError('')
    try {
      await api.restoreLog(item.id)
      await load()
    } catch (err) {
      setError(err.message || 'Restore failed')
    } finally {
      setBusyId(null)
    }
  }

  // Archive -> Trash
  async function handleMoveToTrash(item) {
    if (busyId) return
    setBusyId(item.id)
    setError('')
    try {
      await api.trashLog(item.id)
      await load()
    } catch (err) {
      setError(err.message || 'Moving to trash failed')
    } finally {
      setBusyId(null)
    }
  }

  // Trash -> Archive
  async function handleRestoreFromTrash(item) {
    if (busyId) return
    setBusyId(item.id)
    setError('')
    try {
      await api.restoreTrashLog(item.id)
      await load()
    } catch (err) {
      setError(err.message || 'Restore from trash failed')
    } finally {
      setBusyId(null)
    }
  }

  // Trash -> Delete permanently
  async function handleConfirmPermanentDelete() {
    if (!itemToDelete || deletingPermanent) return
    setDeletingPermanent(true)
    setError('')
    try {
      await api.deleteLogPermanent(itemToDelete.id)
      setItemToDelete(null)
      await load()
    } catch (err) {
      setError(err.message || 'Permanent deletion failed')
    } finally {
      setDeletingPermanent(false)
    }
  }

  const logs = data?.logs || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // Dynamically computed metrics from current results
  const metrics = React.useMemo(() => {
    const confidences = logs
      .map((l) => Number(l.confidence) || 0)
      .filter((c) => c > 0)
    const avgConf = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : null

    const highConfCount = confidences.filter((c) => c >= 80).length
    const highConfRate = confidences.length
      ? (highConfCount / confidences.length) * 100
      : null

    const embryoIdentified = logs.filter(
      (l) => l.stage && l.stage !== '—' && !l.low_confidence
    ).length
    const embryoRate = logs.length ? (embryoIdentified / logs.length) * 100 : null

    const dayCounts = {}
    logs.forEach((l) => {
      const d = l.predicted_day
      if (d && d !== '—') {
        dayCounts[d] = (dayCounts[d] || 0) + 1
      }
    })
    let topDay = '—'
    let topCount = 0
    Object.entries(dayCounts).forEach(([d, count]) => {
      if (count > topCount) {
        topCount = count
        topDay = d
      }
    })

    const lowConfCount = logs.filter((l) => l.low_confidence || (Number(l.confidence) > 0 && Number(l.confidence) < 60)).length

    return {
      total,
      avgConf,
      highConfRate,
      embryoRate,
      topDay,
      topCount,
      lowConfCount,
    }
  }, [logs, total])

  const handlePerPageChange = (e) => {
    setPerPage(Number(e.target.value))
    setPage(1)
  }

  const title = isTrash
    ? 'Trash'
    : isArchived
      ? 'Incubation Archives'
      : 'Inspection Detection Logs'

  const description = isTrash
    ? 'Discarded candling scans. Items can be restored back to Archive or deleted forever.'
    : isArchived
      ? 'Historical records archived from active detection runs'
      : 'All saved candling detection snapshots and incubation classifications'

  return (
    <div ref={browserRef} className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isTrash && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKpiPicker(!showKpiPicker)}
              className="gap-1.5 min-h-[44px] sm:min-h-0 text-xs"
            >
              <Sparkles className="size-3.5 text-primary" />
              Customize KPIs
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5 min-h-[44px] sm:min-h-0"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Picker Sheet / Panel (when user clicks Customize KPIs) */}
      {showKpiPicker && !isTrash && (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Select Visible KPIs
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose which metrics you want to monitor at a glance.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKpiPicker(false)}
                className="text-xs h-7 px-2"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AVAILABLE_KPIS.map((kpi) => {
                const isSelected = selectedKpis.includes(kpi.id)
                return (
                  <button
                    key={kpi.id}
                    type="button"
                    onClick={() => toggleKpi(kpi.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-background shadow-xs'
                        : 'border-border/60 bg-background/50 hover:border-border opacity-70'
                    }`}
                  >
                    <div
                      className={`size-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="size-3" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{kpi.label}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {kpi.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Metric Cards */}
      {!isTrash && selectedKpis.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            selectedKpis.length === 1
              ? 'lg:grid-cols-1'
              : selectedKpis.length === 2
                ? 'lg:grid-cols-2'
                : selectedKpis.length === 3
                  ? 'lg:grid-cols-3'
                  : 'lg:grid-cols-4'
          }`}
        >
          {selectedKpis.map((kpiId) => {
            if (kpiId === 'total') {
              return (
                <div key={kpiId} className="gsap-stat-chip">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Total Records
                      </CardTitle>
                      <Layers className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        <CountUp value={metrics.total} decimals={0} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Matching current filters
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            if (kpiId === 'avgConfidence') {
              return (
                <div key={kpiId} className="gsap-stat-chip">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Mean Confidence
                      </CardTitle>
                      <Activity className="size-4 text-[#52B788]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {metrics.avgConf === null ? (
                          '—'
                        ) : (
                          <CountUp value={metrics.avgConf} decimals={1} suffix="%" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across batch inferences
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            if (kpiId === 'highConfidenceRate') {
              return (
                <div key={kpiId} className="gsap-stat-chip">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        High Confidence Rate
                      </CardTitle>
                      <Percent className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {metrics.highConfRate === null ? (
                          '—'
                        ) : (
                          <CountUp value={metrics.highConfRate} decimals={1} suffix="%" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence ≥ 80%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            if (kpiId === 'embryoRate') {
              return (
                <div key={kpiId} className="gsap-stat-chip">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Embryo Detection Rate
                      </CardTitle>
                      <Egg className="size-4 text-[#52B788]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {metrics.embryoRate === null ? (
                          '—'
                        ) : (
                          <CountUp value={metrics.embryoRate} decimals={1} suffix="%" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Identified stage viable
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            if (kpiId === 'topDay') {
              return (
                <div key={kpiId} className="gsap-stat-chip">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Frequent Incubation Age
                      </CardTitle>
                      <Calendar className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {metrics.topDay}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics.topCount > 0
                          ? `${metrics.topCount} records in batch`
                          : 'No data yet'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            if (kpiId === 'lowConfCount') {
              return (
                <div key={kpiId} className="gsap-stat-chip">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Low Confidence Alerts
                      </CardTitle>
                      <AlertTriangle className="size-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        <CountUp value={metrics.lowConfCount} decimals={0} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Scans needing recapturing
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            return null
          })}
        </div>
      )}

      {/* Filter card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleFilterSubmit}
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3.5"
          >
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                Incubation Day
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full text-base sm:text-xs h-10 sm:h-9 rounded-lg border border-border bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Days</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-base sm:text-xs h-10 sm:h-9 rounded-lg border border-border bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <Button type="submit" variant="default" size="sm" className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0">
                Apply Filters
              </Button>
              {(appliedDay || appliedDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1 text-xs min-h-[44px] sm:min-h-0"
                >
                  <RotateCcw className="size-3" /> Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table list */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              {isTrash ? 'Trash Records' : isArchived ? 'Archived Records' : 'Inspection Snapshots'}
            </CardTitle>
            <CardDescription>
              Showing {logs.length} of {total} total records
            </CardDescription>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <label htmlFor="per-page-select" className="whitespace-nowrap">Show:</label>
              <select
                id="per-page-select"
                value={perPage}
                onChange={handlePerPageChange}
                aria-label="Records per page"
                className="h-8 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
            <Badge variant="leaf" className="font-mono text-xs">
              Page {page} of {totalPages}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && !logs.length ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              Loading records…
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="size-16 rounded-lg overflow-hidden border border-border opacity-70">
                <img
                  src={farmPoultryImg}
                  alt="Empty farm logs"
                  className="size-full object-cover"
                />
              </div>
              <p className="font-medium text-foreground">
                {isTrash
                  ? 'Trash is empty'
                  : isArchived
                    ? 'No archived records'
                    : 'No candling records found'}
              </p>
              <p className="max-w-xs text-muted-foreground">
                {appliedDay || appliedDate
                  ? 'Try clearing the active filters above.'
                  : isTrash
                    ? 'Records moved to Trash will appear here.'
                    : isArchived
                      ? 'Archived detections will appear here.'
                      : 'Capture or analyze an egg on the scanner to see entries here.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Desktop & Tablet Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-y border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((item) => (
                      <tr
                        key={item.id}
                        className="gsap-table-row hover:bg-accent/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {item.predicted_day || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.stage || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-[#1E4D2B] dark:text-[#52B788]">
                            {confidenceText(item.confidence)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.date_display || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {item.time_display || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setModalItem(item)}
                              title="View image and analysis"
                              className="hover:text-primary min-h-[36px] min-w-[36px]"
                            >
                              <Eye className="size-3.5" />
                            </Button>

                            {/* LOGS TAB: Archive */}
                            {!isArchived && !isTrash && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                disabled={busyId === item.id}
                                onClick={() => handleArchive(item)}
                                title="Archive record"
                                className="hover:text-primary min-h-[36px] min-w-[36px]"
                              >
                                <Archive className="size-3.5" />
                              </Button>
                            )}

                            {/* ARCHIVE TAB: Restore to Logs OR Move to Trash */}
                            {isArchived && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={busyId === item.id}
                                  onClick={() => handleRestoreFromArchive(item)}
                                  title="Restore to logs"
                                  className="hover:text-primary min-h-[36px] min-w-[36px]"
                                >
                                  <RotateCcw className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={busyId === item.id}
                                  onClick={() => handleMoveToTrash(item)}
                                  title="Move to Trash"
                                  className="hover:text-destructive text-muted-foreground min-h-[36px] min-w-[36px]"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </>
                            )}

                            {/* TRASH TAB: Restore to Archive OR Delete forever */}
                            {isTrash && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={busyId === item.id}
                                  onClick={() => handleRestoreFromTrash(item)}
                                  title="Restore to Archive"
                                  className="hover:text-primary min-h-[36px] min-w-[36px]"
                                >
                                  <RotateCw className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={busyId === item.id}
                                  onClick={() => setItemToDelete(item)}
                                  title="Delete forever"
                                  className="hover:text-destructive text-destructive min-h-[36px] min-w-[36px]"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View (<640px) */}
              <div className="sm:hidden divide-y divide-border">
                {logs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 space-y-2 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">
                        {item.predicted_day || '—'}
                      </span>
                      <span className="font-mono font-semibold text-xs text-[#1E4D2B] dark:text-[#52B788] bg-muted/60 px-2 py-0.5 rounded">
                        {confidenceText(item.confidence)}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span className="truncate max-w-[60%]">{item.stage || '—'}</span>
                      <span className="text-[11px] font-mono">
                        {[item.date_display, item.time_display].filter(Boolean).join(' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setModalItem(item)}
                        className="gap-1 min-h-[36px] text-xs px-2.5"
                      >
                        <Eye className="size-3.5" /> View
                      </Button>

                      {/* LOGS TAB Mobile */}
                      {!isArchived && !isTrash && (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={busyId === item.id}
                          onClick={() => handleArchive(item)}
                          className="gap-1 min-h-[36px] text-xs px-2.5"
                        >
                          <Archive className="size-3.5" /> Archive
                        </Button>
                      )}

                      {/* ARCHIVE TAB Mobile */}
                      {isArchived && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={busyId === item.id}
                            onClick={() => handleRestoreFromArchive(item)}
                            className="gap-1 min-h-[36px] text-xs px-2.5"
                          >
                            <RotateCcw className="size-3.5" /> Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={busyId === item.id}
                            onClick={() => handleMoveToTrash(item)}
                            className="gap-1 min-h-[36px] text-xs px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" /> Trash
                          </Button>
                        </>
                      )}

                      {/* TRASH TAB Mobile */}
                      {isTrash && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={busyId === item.id}
                            onClick={() => handleRestoreFromTrash(item)}
                            className="gap-1 min-h-[36px] text-xs px-2.5"
                          >
                            <RotateCw className="size-3.5" /> Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            disabled={busyId === item.id}
                            onClick={() => setItemToDelete(item)}
                            className="gap-1 min-h-[36px] text-xs px-2.5"
                          >
                            <Trash2 className="size-3.5" /> Delete Forever
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border text-xs gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground order-2 sm:order-1">
                <span>Show:</span>
                <select
                  value={perPage}
                  onChange={handlePerPageChange}
                  aria-label="Records per page (bottom)"
                  className="h-7 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <span className="text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{page}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="gap-1 text-xs"
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Permanent Deletion */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">Permanently Delete Scan?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                This will permanently remove the detection snapshot (
                <span className="font-semibold text-foreground">
                  {itemToDelete.predicted_day || 'Egg scan'} — {itemToDelete.date_display || itemToDelete.date}
                </span>
                ) from your database and delete its stored image from Supabase Storage.
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={deletingPermanent}
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingPermanent}
                onClick={handleConfirmPermanentDelete}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {deletingPermanent ? 'Deleting…' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ImageModal
        isOpen={Boolean(modalItem)}
        item={modalItem}
        onClose={() => setModalItem(null)}
      />
    </div>
  )
}
