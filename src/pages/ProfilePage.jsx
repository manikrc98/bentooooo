import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import App from '../App.jsx'

export default function ProfilePage() {
  const { username } = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [profileData, setProfileData] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setProfileData(data.config)
        setProfileUserId(data.id)
      }
      setLoading(false)
    }

    loadProfile()
  }, [username])

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-zinc-400">
        <span className="text-5xl mb-4">404</span>
        <p className="text-sm">No portfolio found for <span className="font-medium text-zinc-600">/{username}</span></p>
      </div>
    )
  }

  const isOwner = !!(user && profileUserId && user.id === profileUserId)

  return (
    <App
      profileData={profileData}
      isOwner={isOwner}
      username={username}
      profileUserId={profileUserId}
    />
  )
}
