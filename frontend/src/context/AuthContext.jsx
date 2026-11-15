import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

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
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the user's profile row from public.profiles (RLS-scoped)
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .eq('id', userId)
        .single()
      if (error) {
        // Profile row may not exist yet (trigger hasn't fired); not fatal
        console.warn('Profile fetch warning:', error.message)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            await supabase.auth.signOut({ scope: 'local' })
            if (active) { setSession(null); setProfile(null); setLoading(false) }
            return
          }
          console.error('Failed to get session:', error)
        }
        const sess = data?.session ?? null
        if (active) {
          setSession(sess)
          if (sess?.user) await fetchProfile(sess.user.id)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error during getSession:', err)
        try {
          if (isInvalidRefreshTokenError(err)) {
            await supabase.auth.signOut({ scope: 'local' })
          }
        } catch {}
        if (active) { setSession(null); setProfile(null); setLoading(false) }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        if (active) { setSession(null); setProfile(null); setLoading(false) }
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        if (!nextSession) {
          try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
          if (active) { setSession(null); setProfile(null); setLoading(false) }
          return
        }
      }

      if (active) {
        setSession(nextSession ?? null)
        if (nextSession?.user) await fetchProfile(nextSession.user.id)
        else setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }),
      signUp: (email, password) =>
        supabase.auth.signUp({ email, password }),
      signInAnonymously: () =>
        supabase.auth.signInAnonymously(),
      signInWithOAuth: (provider = 'google') =>
        supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          },
        }),
      signOut: () => supabase.auth.signOut(),
      refreshProfile: () => fetchProfile(session?.user?.id),
    }),
    [session, profile, loading, fetchProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
