import { useCallback, useEffect, useState } from 'react'

import { api } from '../lib/api'
import ImageModal from './ImageModal'

const DAYS = Array.from({ length: 21 }, (_, index) => `Day ${index + 1}`)
const PER_PAGE = 10

function confidenceText(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : '—'
}

// Shared Logs / Archive browser: filters, table, pagination, image modal,
// loading / error / empty states, and a single row action (archive|restore).
export default function ScansBrowser({ mode }) {
  const isArchived = mode === 'archives'

  const [day, setDay] = useState('')
  const [date, setDate] = useState('')
  const [appliedDay, setAppliedDay] = useState('')
  const [appliedDate, setAppliedDate] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalItem, setModalItem] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, per_page: PER_PAGE }
      if (appliedDay) params.day = appliedDay
      if (appliedDate) params.date = appliedDate

      const result = isArchived ? await api.archives(params) : await api.logs(params)
      setData(result)
    } catch (err) {
      setData(null)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [page, appliedDay, appliedDate, isArchived])

  useEffect(() => {
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

  return (
      <section className="card">
        <div className="card-head">
          <h2>{isArchived ? 'Archive' : 'Detection logs'}</h2>
          <p className="muted">
            {isArchived
              ? 'Review archived detections and restore them to your active history.'
              : 'All saved YOLO analyses stored in Supabase.'}
          </p>
        </div>

        <div className="filters">
          <label>
            Search by Day
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">All days</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label>
            Filter by date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <div className="filter-actions">
            <button className="btn btn-primary" type="button" onClick={applyFilters}>Apply</button>
            <button className="btn btn-secondary" type="button" onClick={resetFilters}>Reset</button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">{error}</div>
        )}

        {loading ? (
          <div className="state">
            <div className="spinner" aria-hidden="true" />
            <p>Loading records…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="state state-empty">
            <p>
              {error
                ? 'Nothing to show.'
                : isArchived
                  ? 'No archived records found.'
                  : 'No detection records yet.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Predicted Day</th>
                  <th>Stage</th>
                  <th>Confidence</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <img
                        className="thumb"
                        src={item.image_url}
                        alt={`Egg ${item.id}`}
                        loading="lazy"
                        onClick={() => setModalItem(item)}
                      />
                    </td>
                    <td>{item.predicted_day || '—'}</td>
                    <td>{item.stage || item.development_stage || '—'}</td>
                    <td>{confidenceText(item.confidence)}</td>
                    <td>{item.date}</td>
                    <td>{item.time}</td>
                    <td className="row-actions">
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => setModalItem(item)}>
                        View
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleAction(item)}
                      >
                        {busyId === item.id ? '…' : isArchived ? 'Restore' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="pager">
            <button
              className="btn btn-secondary"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {pages} ({total} records)
            </span>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        )}

        <ImageModal item={modalItem} onClose={() => setModalItem(null)} />
      </section>
  )
}
