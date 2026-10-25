import * as React from 'react'
import {
  Archive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
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
const PER_PAGE = 10

function confidenceText(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : '—'
}

export default function ScansBrowser({ mode }) {
  const isArchived = mode === 'archives'
  const browserRef = React.useRef(null)

  const [day, setDay] = React.useState('')
  const [date, setDate] = React.useState('')
  const [appliedDay, setAppliedDay] = React.useState('')
  const [appliedDate, setAppliedDate] = React.useState('')
  const [page, setPage] = React.useState(1)

  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [modalItem, setModalItem] = React.useState(null)
  const [busyId, setBusyId] = React.useState(null)

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
      const params = { page, per_page: PER_PAGE }
      if (appliedDay) params.day = appliedDay
      if (appliedDate) params.date = appliedDate

      const result = isArchived
        ? await api.archives(params)
        : await api.logs(params)
      setData(result)
    } catch (err) {
      setData(null)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [page, appliedDay, appliedDate, isArchived])

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

  async function handleToggleArchive(item) {
    if (busyId) return
    setBusyId(item.id)
    try {
      if (isArchived) {
        await api.unarchive(item.id)
      } else {
        await api.archive(item.id)
      }
      load()
    } catch (err) {
      setError(err.message || 'Operation failed')
    } finally {
      setBusyId(null)
    }
  }

  const logs = data?.logs || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const title = isArchived ? 'Incubation Archives' : 'Inspection Detection Logs'
  const description = isArchived
    ? 'Historical records archived from active detection runs'
    : 'All saved candling detection snapshots and incubation classifications'

  return (
    <div ref={browserRef} className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter and stats card */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleFilterSubmit}
            className="flex flex-col sm:flex-row flex-wrap items-end gap-3.5"
          >
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                Incubation Day
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full text-xs h-9 rounded-lg border border-border bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="w-full text-xs h-9 rounded-lg border border-border bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="default" size="sm">
                Apply Filters
              </Button>
              {(appliedDay || appliedDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1 text-xs"
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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              {isArchived ? 'Archived Records' : 'Inspection Snapshots'}
            </CardTitle>
            <CardDescription>
              Showing {logs.length} of {total} total records
            </CardDescription>
          </div>
          <Badge variant="leaf" className="font-mono text-xs">
            Page {page} of {totalPages}
          </Badge>
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
              <p className="font-medium text-foreground">No candling records found</p>
              <p className="max-w-xs text-muted-foreground">
                {appliedDay || appliedDate
                  ? 'Try clearing the active filters above.'
                  : 'Capture or analyze an egg on the scanner to see entries here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                            className="hover:text-primary"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            disabled={busyId === item.id}
                            onClick={() => handleToggleArchive(item)}
                            title={isArchived ? 'Restore to logs' : 'Archive record'}
                            className="hover:text-primary"
                          >
                            <Archive className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border text-xs">
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
          )}
        </CardContent>
      </Card>

      <ImageModal
        isOpen={Boolean(modalItem)}
        item={modalItem}
        onClose={() => setModalItem(null)}
      />
    </div>
  )
}
