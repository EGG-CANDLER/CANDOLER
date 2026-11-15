import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  const message =
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Please configure your environment variables and rebuild the frontend.'
  if (typeof document !== 'undefined') {
    const errorBanner = document.createElement('div')
    errorBanner.id = 'supabase-config-error'
    errorBanner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ef4444;color:#ffffff;padding:16px;text-align:center;font-weight:600;font-family:sans-serif;box-shadow:0 4px 6px rgba(0,0,0,0.1);'
    errorBanner.textContent = message
    if (document.body) {
      document.body.prepend(errorBanner)
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.prepend(errorBanner)
      })
    }
  }
  throw new Error(message)
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
