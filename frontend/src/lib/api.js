import { supabase } from './supabase'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(
  /\/+$/,
  '',
)

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token ?? null
}

async function request(path, { method = 'GET', body, params } = {}) {
  const token = await getToken()
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

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}

export const api = {
  status: () => request('/api/status'),
  analyze: (image) => request('/api/analyze', { method: 'POST', body: { image } }),
  logs: (params) => request('/api/logs', { params }),
  archives: (params) => request('/api/archives', { params }),
  logDetail: (id) => request(`/api/logs/${id}`),
  archiveLog: (id) => request(`/api/logs/${id}/archive`, { method: 'POST' }),
  restoreLog: (id) => request(`/api/logs/${id}/restore`, { method: 'POST' }),
}
