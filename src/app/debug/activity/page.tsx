'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useActivityTracking } from '@/hooks/useActivityTracking'
import { updateUserActivity, markUserAsLoggedOut } from '@/lib/activity'

export default function ActivityDebugPage() {
  useActivityTracking() // Track activity on this page too
  
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role, last_active, created_at')
          .eq('role', 'student')
          .order('last_active', { ascending: false })

        if (error) {
          console.error('Error fetching profiles:', error)
          return
        }

        setProfiles(data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchProfiles, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffSeconds = Math.floor(diffMs / 1000)
    
    const isPlaying = diffMinutes <= 2
    const exactTime = date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    
    return {
      isPlaying,
      exactTime,
      diffMinutes,
      diffSeconds
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Activity Debug - Student Profiles</h1>
      <p className="text-gray-400 mb-6">
        This page shows all student profiles and their last_active timestamps.
        "Playing" means active within last 2 minutes.
      </p>
      
      <div className="grid gap-4">
        {profiles.map((profile) => {
          const timeInfo = formatTime(profile.last_active)
          return (
            <div 
              key={profile.id} 
              className={`p-4 rounded-lg border ${
                timeInfo.isPlaying 
                  ? 'border-green-500 bg-green-900/20' 
                  : 'border-gray-600 bg-gray-800/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{profile.email}</h3>
                  <p className="text-sm text-gray-400">ID: {profile.id}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-2 ${timeInfo.isPlaying ? 'text-green-400' : 'text-gray-400'}`}>
                    {timeInfo.isPlaying && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
                    <span className="font-medium">
                      {timeInfo.isPlaying ? 'Playing' : `${timeInfo.diffMinutes} min ago`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {timeInfo.exactTime}
                  </p>
                  <p className="text-xs text-gray-600">
                    {timeInfo.diffSeconds} seconds ago
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
        <h3 className="font-medium text-blue-300 mb-2">Debug Info</h3>
        <p className="text-sm text-blue-200 mb-4">
          • "Playing" = active within last 2 minutes<br/>
          • Activity is tracked when you click, scroll, or type on this page<br/>
          • Activity is also tracked when students play games<br/>
          • Last activity is updated every 30 seconds while on page
        </p>
        <div className="flex gap-2">
          <button 
            onClick={updateUserActivity}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
          >
            Update My Activity Now
          </button>
          <button 
            onClick={markUserAsLoggedOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm"
          >
            Mark Me as Logged Out
          </button>
        </div>
      </div>
    </div>
  )
}
