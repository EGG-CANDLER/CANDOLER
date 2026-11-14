import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function isInvalidRefreshTokenError(err) {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  const code = (err.code || err.status || '').toString().toLowerCase()
  return (
    msg.includes('invalid refresh token') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('invalid_grant') ||
    code === '400' ||
    code === 'invalid_grant'
  )
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            await supabase.auth.signOut({ scope: 'local' })
            if (active) {
              setSession(null)
              setLoading(false)
            }
            return
          }
          console.error('Failed to get session:', error)
        }
        if (active) {
          setSession(data?.session ?? null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error during getSession:', err)
        try {
          if (isInvalidRefreshTokenError(err)) {
            await supabase.auth.signOut({ scope: 'local' })
          }
        } catch {}
        if (active) {
          setSession(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        if (active) {
          setSession(null)
          setLoading(false)
        }
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        if (!nextSession) {
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch {}
          if (active) {
            setSession(null)
            setLoading(false)
          }
          return
        }
      }

      if (active) {
        setSession(nextSession ?? null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
