import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

const OWNER_EMAIL = 'manikrc98@gmail.com'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  console.log('[AuthProvider] render — loading:', loading, 'user:', user?.email ?? null, 'profile:', profile?.username ?? null)

  // Fetch profile in a separate effect, triggered when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    let cancelled = false

    async function loadProfile() {
      console.log('[fetchProfile] fetching profile for userId:', user.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      console.log('[fetchProfile] result — data:', data, 'error:', error)
      if (!cancelled) {
        setProfile(data)
      }
    }

    loadProfile()

    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    console.log('[AuthProvider] useEffect mount — subscribing to onAuthStateChange')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[onAuthStateChange] event:', event, 'session:', session ? 'exists' : 'null')
        console.log('[onAuthStateChange] session user:', session?.user?.email ?? 'none')

        if (session?.user) {
          if (session.user.email !== OWNER_EMAIL) {
            console.log('[onAuthStateChange] access denied — signing out')
            supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            setAuthError('Access denied. Only the portfolio owner can sign in.')
          } else {
            console.log('[onAuthStateChange] setting user')
            setUser(session.user)
            setAuthError(null)
          }
        } else {
          console.log('[onAuthStateChange] no session — clearing user/profile')
          setUser(null)
          setProfile(null)
        }

        console.log('[onAuthStateChange] setting loading=false')
        setLoading(false)
      }
    )

    console.log('[AuthProvider] subscription created')

    return () => {
      console.log('[AuthProvider] cleanup — unsubscribing')
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
    if (error) console.error('Sign-in error:', error)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign-out error:', error)
    setUser(null)
    setProfile(null)
  }

  function clearAuthError() {
    setAuthError(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, authError, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
