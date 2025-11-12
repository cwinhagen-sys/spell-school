'use client'

import { useState } from 'react'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'
import { supabase } from '@/lib/supabase'
import LogoutHandler from '@/components/LogoutHandler'

export default function DebugBadgesPage() {
  const { badges, userBadges, stats, backupBadges, restoreBadges, loading } = useDailyQuestBadges()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [message, setMessage] = useState('')

  const checkLocalStorage = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'no-user'
    
    const info = {
      user: user,
      localStorage: {
        dailyQuestBadges: localStorage.getItem('daily_quest_badges'),
        userBadges: localStorage.getItem(`user_badges_${userId}`),
        allKeys: Object.keys(localStorage).filter(key => key.includes('badge') || key.includes('user_badges_')),
        backups: Object.keys(localStorage).filter(key => key.includes('badge_backup_'))
      },
      currentState: {
        badgesCount: badges.length,
        userBadgesCount: userBadges.length,
        stats: stats,
        loading: loading
      }
    }
    setDebugInfo(info)
  }

  const checkDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('No user logged in')
        return
      }

      const { data: dbBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)

      if (badgesError) {
        setMessage(`Database error: ${badgesError.message}`)
        return
      }

      setMessage(`Found ${dbBadges?.length || 0} badges in database for user ${user.id}`)
      setDebugInfo((prev: any) => ({
        ...prev,
        database: {
          badges: dbBadges,
          user: user
        }
      }))
    } catch (error) {
      setMessage(`Error: ${error}`)
    }
  }

  const clearAllLocalStorage = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('badge') || key.includes('user_badges_')) {
        localStorage.removeItem(key)
      }
    })
    setMessage('Cleared all badge-related localStorage data')
    setTimeout(checkLocalStorage, 100)
  }

  const restoreFromBackup = async () => {
    const success = await restoreBadges()
    setMessage(success ? 'Badges restored from backup' : 'No backup found or restore failed')
    setTimeout(checkLocalStorage, 100)
  }

  const createBackup = async () => {
    await backupBadges()
    setMessage('Backup created')
    setTimeout(checkLocalStorage, 100)
  }

  const restoreFromDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('No user logged in')
        return
      }

      const { data: dbBadges, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        setMessage(`Database error: ${error.message}`)
        return
      }

      if (dbBadges && dbBadges.length > 0) {
        // Convert database format to localStorage format
        const convertedBadges = dbBadges.map(dbBadge => ({
          id: dbBadge.id,
          user_id: dbBadge.user_id,
          badge_id: dbBadge.badge_id,
          unlocked_at: dbBadge.earned_at || dbBadge.unlocked_at
        }))
        
        // Restore user badges to localStorage
        localStorage.setItem(`user_badges_${user.id}`, JSON.stringify(convertedBadges))
        setMessage(`Restored ${dbBadges.length} badges from database`)
        
        // Reload page to refresh state
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setMessage('No badges found in database')
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <LogoutHandler />
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Badge Debug & Recovery</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={checkLocalStorage}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Check localStorage
            </button>
            <button
              onClick={checkDatabase}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Check Database
            </button>
            <button
              onClick={createBackup}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Create Backup
            </button>
            <button
              onClick={restoreFromBackup}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Restore Backup
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={restoreFromDatabase}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Restore from Database
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={clearAllLocalStorage}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All localStorage (DANGER)
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {debugInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{badges.length}</div>
              <div className="text-sm text-gray-600">Total Badges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userBadges.length}</div>
              <div className="text-sm text-gray-600">User Badges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.earned}</div>
              <div className="text-sm text-gray-600">Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.percentage}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">User Badges</h2>
          {userBadges.length === 0 ? (
            <p className="text-gray-500">No badges earned</p>
          ) : (
            <div className="space-y-2">
              {userBadges.map((userBadge, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{userBadge.badge_id}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(userBadge.unlocked_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
