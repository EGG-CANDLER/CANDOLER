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

const DAYS = Array.from({ length: 21 }, (_, index) => `Day ${index + 1}`)
const PER_PAGE = 10

function confidenceText(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : '—'
}

export default function ScansBrowser({ mode }) {
  const isArchived = mode === 'archives'

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

  function applyFilters() {
    setPage(1)
    setAppliedDay(day)
    setAppliedDate(date)
  }

  function resetFilters() {
    setDay('')
    setDate('')
    setPage(1)
    setAppliedDay('')
    setAppliedDate('')
  }

  async function handleAction(item) {
    const question = isArchived
      ? `Restore detection ID ${item.id} to Logs / History?`
      : `Archive detection ID ${item.id}?\n\nPredicted Day: ${
          item.predicted_day || 'Uncertain'
        }\nDate: ${item.date}\nTime: ${item.time}\n\nThe record and saved image will NOT be deleted.`
    if (!window.confirm(question)) return

    setBusyId(item.id)
    try {
      if (isArchived) {
        await api.restoreLog(item.id)
      } else {
        await api.archiveLog(item.id)
      }
      await load()
    } catch (err) {
      setError(err.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1
  const currentPage = data?.page ?? page

  // Derived summary values
  const confidences = logs
    .map((item) => item.confidence)
    .filter((v) => typeof v === 'number')
  const avgConf = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : null
  const topDay = (() => {
    const counts = {}
    logs.forEach((item) => {
      if (item.predicted_day) {
        counts[item.predicted_day] = (counts[item.predicted_day] || 0) + 1
      }
    })
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return entries.length ? entries[0][0] : '—'
  })()

  return (
    <Card className="flex flex-col gap-6">
      {/* Header and counter badge */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-0">
        <div>
          <CardTitle className="text-xl font-bold">
            {isArchived ? 'Archived Detections' : 'Detection Logs'}
          </CardTitle>
          <CardDescription className="mt-1">
            {isArchived
              ? 'Review archived egg scans and restore them to active history.'
              : 'All historical YOLO analyses synchronized with Supabase.'}
          </CardDescription>
        </div>
        <Badge variant="outline" className="self-start sm:self-center font-mono">
          {total} total records
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              Total Records
            </span>
            <span className="text-xl font-bold text-foreground block mt-0.5">
              {total}
            </span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              Avg Confidence
            </span>
            <span className="text-xl font-bold text-foreground block mt-0.5">
              {avgConf === null ? '—' : `${avgConf.toFixed(1)}%`}
            </span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              Dominant Day
            </span>
            <span className="text-xl font-bold text-foreground block mt-0.5">
              {topDay}
            </span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              Page Range
            </span>
            <span className="text-xl font-bold text-foreground block mt-0.5">
              {currentPage} / {pages}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="size-4 text-muted-foreground hidden sm:block" />
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="text-xs h-9 rounded-md border border-border bg-background px-3 py-1 text-foreground focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 flex-1 max-w-xs"
            >
              <option value="">Filter by Day (All)</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs h-9 rounded-md border border-border bg-background px-3 py-1 text-foreground focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Records Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mb-2 opacity-60" />
            <p className="text-sm">Fetching scans…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <Archive className="size-8 mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground">
              {error
                ? 'Could not fetch records.'
                : isArchived
                  ? 'No archived records found.'
                  : 'No detection records found.'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adjust filters or scan eggs via the live camera.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Image</th>
                  <th className="py-3 px-4">Predicted Day</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">{item.id}</td>
                    <td className="py-3 px-4">
                      <img
                        className="size-11 rounded-md object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        src={item.image_url}
                        alt={`Egg ${item.id}`}
                        loading="lazy"
                        onClick={() => setModalItem(item)}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {item.predicted_day || '—'}
                      {item.low_confidence && (
                        <Badge variant="destructive" className="ml-2 text-[10px] py-0 px-1.5">
                          Low Conf
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {item.stage || item.development_stage || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {confidenceText(item.confidence)}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{item.date}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{item.time}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setModalItem(item)}
                          className="gap-1"
                        >
                          <Eye className="size-3" /> View
                        </Button>
                        <Button
                          variant={isArchived ? 'default' : 'secondary'}
                          size="xs"
                          disabled={busyId === item.id}
                          onClick={() => handleAction(item)}
                          className="gap-1"
                        >
                          {busyId === item.id ? (
                            '…'
                          ) : isArchived ? (
                            <>
                              <RotateCcw className="size-3" /> Restore
                            </>
                          ) : (
                            <>
                              <Archive className="size-3" /> Archive
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && logs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-muted-foreground">
              Showing page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
              <span className="font-semibold text-foreground">{pages}</span> ({total} records)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                className="gap-1"
              >
                <ChevronLeft className="size-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Modal for viewing image details */}
        <ImageModal item={modalItem} onClose={() => setModalItem(null)} />
      </CardContent>
    </Card>
  )
}
