import { createContext, startTransition, useContext, useEffect, useState } from 'react'
import { getProfile } from '../lib/api.js'
import { requireSupabase } from '../lib/supabase.js'
import { normalizeError } from '../lib/utils.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = requireSupabase()
    let isMounted = true

    const loadProfile = async (userId) => {
      try {
        const nextProfile = await getProfile(userId)

        if (!isMounted) {
          return
        }

        startTransition(() => {
          setProfile(nextProfile)
          setError('')
        })
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        startTransition(() => {
          setProfile(null)
          setError(normalizeError(loadError))
        })
      } finally {
        if (isMounted) {
          startTransition(() => {
            setIsLoading(false)
          })
        }
      }
    }

    const bootstrap = async () => {
      const {
        data: { session: nextSession },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (sessionError) {
        startTransition(() => {
          setError(normalizeError(sessionError))
          setIsLoading(false)
        })
        return
      }

      startTransition(() => {
        setSession(nextSession ?? null)
      })

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id)
      } else {
        startTransition(() => {
          setProfile(null)
          setIsLoading(false)
        })
      }
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      startTransition(() => {
        setSession(nextSession ?? null)
        setError('')
      })

      if (nextSession?.user) {
        startTransition(() => {
          setIsLoading(true)
        })
        void loadProfile(nextSession.user.id)
      } else {
        startTransition(() => {
          setProfile(null)
          setIsLoading(false)
        })
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    if (!session?.user) {
      return
    }

    startTransition(() => {
      setIsLoading(true)
    })

    try {
      const nextProfile = await getProfile(session.user.id)
      startTransition(() => {
        setProfile(nextProfile)
        setError('')
      })
    } catch (refreshError) {
      startTransition(() => {
        setError(normalizeError(refreshError))
      })
    } finally {
      startTransition(() => {
        setIsLoading(false)
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        error,
        isLoading,
        profile,
        refreshProfile,
        session,
        setProfile,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
