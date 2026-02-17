import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function LandingPage() {
  const { user, profile, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  // Redirect to own profile if already logged in
  useEffect(() => {
    if (!loading && user && profile?.username) {
      navigate(`/${profile.username}`, { replace: true })
    }
  }, [loading, user, profile, navigate])

  console.log('[LandingPage] render — loading:', loading, 'user:', user?.email ?? null, 'profile:', profile?.username ?? null)

  if (loading) {
    console.log('[LandingPage] showing spinner because loading=true')
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <LayoutGrid size={28} className="text-blue-500" />
          <span className="text-2xl font-bold text-zinc-800 tracking-tight">BentoBuilder</span>
        </div>

        <p className="text-zinc-500 text-sm leading-relaxed mb-8">
          Create a beautiful bento grid portfolio. Sign in with Google to get started — your portfolio will be live at <span className="font-medium text-zinc-700">app.com/yourname</span>.
        </p>

        <button
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-zinc-200
            text-sm font-medium text-zinc-700 shadow-sm
            hover:bg-zinc-50 hover:shadow-md transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
