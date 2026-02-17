import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

const OWNER_EMAIL = 'manikrc98@gmail.com'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  async function handleAuthUser(sessionUser) {
    if (sessionUser.email !== OWNER_EMAIL) {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setAuthError('Access denied. Only the portfolio owner can sign in.')
      return false
    }
    setUser(sessionUser)
    setAuthError(null)
    await fetchProfile(sessionUser.id)
    return true
  }

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          await handleAuthUser(session.user)
        }
      } catch (err) {
        console.error('Session restoration error:', err)
      } finally {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await handleAuthUser(session.user)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
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
