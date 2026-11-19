import { supabase } from './supabase'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(
  /\/+$/,
  '',
)

async function getFreshToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? null
  } catch {
    return null
  }
}

function handleSessionExpired() {
  try {
    supabase.auth.signOut({ scope: 'local' })
  } catch {}
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?session_expired=true')
  }
}

async function request(path, { method = 'GET', body, params, timeout = 30000, isRetry = false, skipAuthRedirect = false } = {}) {
  const token = await getFreshToken()
  const url = new URL(API_URL + path)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let response
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      const timeoutError = new Error('The server took too long to respond.')
      timeoutError.code = 'TIMEOUT'
      throw timeoutError
    }
    const netError = new Error('Cannot reach the server.')
    netError.code = 'NETWORK_ERROR'
    netError.cause = err
    throw netError
  } finally {
    clearTimeout(timeoutId)
  }

  // Handle 401: try refreshing session once and retrying
  if (response.status === 401) {
    if (!isRetry) {
      let refreshSuccess = false
      try {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession()
        if (!refreshErr && refreshData?.session?.access_token) {
          refreshSuccess = true
        }
      } catch {
        refreshSuccess = false
      }

      if (refreshSuccess) {
        return request(path, { method, body, params, timeout, isRetry: true, skipAuthRedirect })
      }
    }

    // Refresh failed or retry failed: sign out locally and redirect only if not skipped
    if (!skipAuthRedirect) {
      handleSessionExpired()
    }
    const sessionError = new Error('Your session expired. Please log in again.')
    sessionError.status = 401
    throw sessionError
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export const api = {
  status: (options) => request('/api/status', { skipAuthRedirect: true, ...options }),
  analyze: (image, options) =>
    request('/api/analyze', { method: 'POST', body: { image }, ...options }),
  logs: (params, options) => request('/api/logs', { params, ...options }),
  archives: (params, options) => request('/api/archives', { params, ...options }),
  trash: (params, options) => request('/api/trash', { params, ...options }),
  logDetail: (id, options) => request(`/api/logs/${id}`, options),
  archiveLog: (id, options) =>
    request(`/api/logs/${id}/archive`, { method: 'POST', ...options }),
  restoreLog: (id, options) =>
    request(`/api/logs/${id}/restore`, { method: 'POST', ...options }),
  // Aliases for compatibility
  archive: (id, options) =>
    request(`/api/logs/${id}/archive`, { method: 'POST', ...options }),
  unarchive: (id, options) =>
    request(`/api/logs/${id}/restore`, { method: 'POST', ...options }),
  // Trash flow endpoints
  trashLog: (id, options) =>
    request(`/api/logs/${id}/trash`, { method: 'POST', ...options }),
  restoreTrashLog: (id, options) =>
    request(`/api/logs/${id}/restore-trash`, { method: 'POST', ...options }),
  deleteLogPermanent: (id, options) =>
    request(`/api/logs/${id}`, { method: 'DELETE', ...options }),
}
