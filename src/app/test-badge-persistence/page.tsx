'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useDailyQuestBadges } from '@/hooks/useDailyQuestBadges'

export default function TestBadgePersistence() {
  const { badges, userBadges, awardBadgeForQuest, refresh } = useDailyQuestBadges()
  const [userId, setUserId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])
  const [dbBadges, setDbBadges] = useState<any[]>([])
  const [localBadges, setLocalBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const addLog = (message: string) => {
    console.log(message)
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Test 1: Verify current badge state
  const testCurrentState = async () => {
    addLog('=== TEST 1: Current Badge State ===')
    
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    // Check localStorage
    const userKey = `user_badges_${userId}`
    const localStorageData = localStorage.getItem(userKey)
    const localBadgeData = localStorageData ? JSON.parse(localStorageData) : []
    setLocalBadges(localBadgeData)
    addLog(`📦 localStorage: ${localBadgeData.length} badges`)
    localBadgeData.forEach((badge: any, index: number) => {
      addLog(`  ${index + 1}. Badge ID: ${badge.badge_id}, Earned: ${badge.unlocked_at}`)
    })

    // Check database
    const { data: dbData, error } = await supabase
      .from('user_badges')
      .select('id, badge_id, unlocked_at')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) {
      addLog(`❌ Database error: ${error.message}`)
      return
    }

    setDbBadges(dbData || [])
    addLog(`🗄️ Database: ${dbData?.length || 0} badges`)
    dbData?.forEach((badge: any, index: number) => {
      addLog(`  ${index + 1}. Badge ID: ${badge.badge_id}, Earned: ${badge.unlocked_at}`)
    })

    // Compare
    if (localBadgeData.length !== (dbData?.length || 0)) {
      addLog(`⚠️ MISMATCH: localStorage has ${localBadgeData.length} badges, database has ${dbData?.length || 0}`)
    } else {
      addLog(`✅ Count matches: ${localBadgeData.length} badges in both`)
    }

    // Check React state
    addLog(`⚛️ React state: ${userBadges.length} badges`)
  }

  // Test 2: Award a test badge
  const testAwardBadge = async () => {
    addLog('=== TEST 2: Award Test Badge ===')
    
    // Try to award a badge for 'play_3_games' quest
    const questId = 'play_3_games'
    addLog(`🎖️ Attempting to award badge for quest: ${questId}`)
    
    const beforeCount = userBadges.length
    addLog(`Before: ${beforeCount} badges`)
    
    const result = await awardBadgeForQuest(questId)
    
    if (result) {
      addLog(`✅ Badge awarded successfully`)
    } else {
      addLog(`ℹ️ Badge not awarded (probably already earned)`)
    }
    
    // Wait a bit for sync
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Refresh and check
    await refresh()
    addLog(`After: ${userBadges.length} badges`)
    
    // Re-run state check
    await testCurrentState()
  }

  // Test 3: Verify database persistence after page reload simulation
  const testPersistence = async () => {
    addLog('=== TEST 3: Database Persistence Test ===')
    
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    addLog('📸 Taking snapshot of current badges...')
    const beforeSnapshot = userBadges.map(b => b.badge_id)
    addLog(`Snapshot: ${beforeSnapshot.length} badges`)

    addLog('🗑️ Clearing localStorage cache...')
    const userKey = `user_badges_${userId}`
    localStorage.removeItem(userKey)
    localStorage.removeItem('daily_quest_badges')
    
    addLog('🔄 Refreshing from database...')
    await refresh()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    addLog(`After reload: ${userBadges.length} badges`)
    
    if (userBadges.length === beforeSnapshot.length) {
      addLog('✅ All badges restored from database successfully')
    } else {
      addLog(`❌ PERSISTENCE FAILURE: Had ${beforeSnapshot.length}, now have ${userBadges.length}`)
    }
    
    await testCurrentState()
  }

  // Test 4: Check for cross-day persistence
  const testCrossDayPersistence = async () => {
    addLog('=== TEST 4: Cross-Day Persistence Check ===')
    
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    // Check if there are any badge backups
    const backupKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(`badge_backup_${userId}_`)
    )
    
    addLog(`🛡️ Found ${backupKeys.length} backup(s)`)
    backupKeys.forEach(key => {
      const backupData = JSON.parse(localStorage.getItem(key) || '{}')
      addLog(`  ${key}: ${backupData.userBadges?.length || 0} badges, timestamp: ${backupData.timestamp}`)
    })

    // Check database for historical data
    const { data: allBadges, error } = await supabase
      .from('user_badges')
      .select('id, badge_id, unlocked_at')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) {
      addLog(`❌ Database error: ${error.message}`)
      return
    }

    addLog(`📊 Total badges in database: ${allBadges?.length || 0}`)
    
    // Group by date
    const byDate: { [key: string]: number } = {}
    allBadges?.forEach(badge => {
      const date = new Date(badge.unlocked_at).toLocaleDateString()
      byDate[date] = (byDate[date] || 0) + 1
    })
    
    Object.entries(byDate).forEach(([date, count]) => {
      addLog(`  ${date}: ${count} badge(s)`)
    })
  }

  // Test 5: Force database sync
  const forceDatabaseSync = async () => {
    addLog('=== TEST 5: Force Database Sync ===')
    
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    setLoading(true)
    
    try {
      // Get all badges from localStorage
      const userKey = `user_badges_${userId}`
      const localStorageData = localStorage.getItem(userKey)
      const localBadges = localStorageData ? JSON.parse(localStorageData) : []
      
      addLog(`📦 Found ${localBadges.length} badges in localStorage`)
      
      // Get all badges from database
      const { data: dbBadges, error: fetchError } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)
      
      if (fetchError) {
        addLog(`❌ Error fetching from database: ${fetchError.message}`)
        return
      }
      
      const dbBadgeIds = new Set(dbBadges?.map(b => b.badge_id) || [])
      addLog(`🗄️ Found ${dbBadgeIds.size} badges in database`)
      
      // Find badges that are in localStorage but not in database
      const missingInDb = localBadges.filter((b: any) => !dbBadgeIds.has(b.badge_id))
      
      if (missingInDb.length === 0) {
        addLog('✅ All localStorage badges are in database')
      } else {
        addLog(`⚠️ Found ${missingInDb.length} badges in localStorage that are missing from database`)
        addLog('🔧 Attempting to sync missing badges...')
        
        for (const badge of missingInDb) {
          try {
            const { error: insertError } = await supabase
              .from('user_badges')
              .insert({
                user_id: userId,
                badge_id: badge.badge_id,
                unlocked_at: badge.unlocked_at || new Date().toISOString()
              })
            
            if (insertError) {
              addLog(`❌ Failed to sync badge ${badge.badge_id}: ${insertError.message}`)
            } else {
              addLog(`✅ Synced badge ${badge.badge_id}`)
            }
          } catch (err) {
            addLog(`❌ Error syncing badge: ${err}`)
          }
        }
      }
      
      // Refresh to verify
      await refresh()
      await testCurrentState()
      
    } finally {
      setLoading(false)
    }
  }

  // Run all tests
  const runAllTests = async () => {
    setTestResults([])
    addLog('🚀 Running all badge persistence tests...')
    await testCurrentState()
    await new Promise(resolve => setTimeout(resolve, 500))
    await testCrossDayPersistence()
    await new Promise(resolve => setTimeout(resolve, 500))
    addLog('✅ All tests complete')
  }

  // Clear a test badge
  const clearTestBadge = async () => {
    if (!userId) return
    
    addLog('=== Clearing Test Badge ===')
    
    // Find the play_3_games badge
    const { data: badgeData } = await supabase
      .from('badges')
      .select('id')
      .eq('quest_id', 'play_3_games')
      .single()
    
    if (!badgeData) {
      addLog('❌ Test badge not found in badges table')
      return
    }
    
    // Delete from database
    const { error } = await supabase
      .from('user_badges')
      .delete()
      .eq('user_id', userId)
      .eq('badge_id', badgeData.id)
    
    if (error) {
      addLog(`❌ Error deleting from database: ${error.message}`)
    } else {
      addLog('✅ Deleted from database')
    }
    
    // Update localStorage
    const userKey = `user_badges_${userId}`
    const localStorageData = localStorage.getItem(userKey)
    if (localStorageData) {
      const localBadges = JSON.parse(localStorageData)
      const filtered = localBadges.filter((b: any) => b.badge_id !== badgeData.id)
      localStorage.setItem(userKey, JSON.stringify(filtered))
      addLog('✅ Removed from localStorage')
    }
    
    await refresh()
    await testCurrentState()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">
          🧪 Badge Persistence Test Suite
        </h1>
        <p className="text-gray-600 mb-8">
          Test and verify that daily quest badges are saved permanently
        </p>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Current User</h2>
          <p className="font-mono text-sm text-gray-600">
            {userId || 'Not logged in'}
          </p>
          <p className="mt-2">
            React State: <strong>{userBadges.length} badges</strong>
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={runAllTests}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              🚀 Run All Tests
            </button>
            <button
              onClick={testCurrentState}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              📊 Check State
            </button>
            <button
              onClick={testAwardBadge}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              🎖️ Award Test Badge
            </button>
            <button
              onClick={testPersistence}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              💾 Test Persistence
            </button>
            <button
              onClick={testCrossDayPersistence}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              📅 Check History
            </button>
            <button
              onClick={forceDatabaseSync}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              🔧 Force Sync
            </button>
            <button
              onClick={clearTestBadge}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              🗑️ Clear Test Badge
            </button>
            <button
              onClick={() => setTestResults([])}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              🧹 Clear Logs
            </button>
          </div>
        </div>

        {/* Badge Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* localStorage Badges */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">📦 localStorage Badges</h2>
            <p className="text-3xl font-bold text-blue-600 mb-4">{localBadges.length}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {localBadges.map((badge, index) => (
                <div key={index} className="text-sm border-b pb-2">
                  <p className="font-mono text-xs text-gray-500">{badge.badge_id}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(badge.unlocked_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Database Badges */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">🗄️ Database Badges</h2>
            <p className="text-3xl font-bold text-green-600 mb-4">{dbBadges.length}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dbBadges.map((badge, index) => (
                <div key={index} className="text-sm border-b pb-2">
                  <p className="font-mono text-xs text-gray-500">{badge.badge_id}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(badge.unlocked_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Results Log */}
        <div className="bg-gray-900 text-green-400 rounded-lg shadow-lg p-6 font-mono text-sm">
          <h2 className="text-xl font-bold mb-4 text-white">Test Results</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet. Click a test button to begin.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">📋 How to Use This Test Suite</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li><strong>Run All Tests</strong> - Comprehensive check of badge system</li>
            <li><strong>Check State</strong> - Compare localStorage vs database vs React state</li>
            <li><strong>Award Test Badge</strong> - Try to earn the "Word Warrior" badge (play_3_games quest)</li>
            <li><strong>Test Persistence</strong> - Clears cache and reloads from database to verify persistence</li>
            <li><strong>Check History</strong> - Shows badges earned across different days</li>
            <li><strong>Force Sync</strong> - Syncs any localStorage badges missing from database</li>
            <li><strong>Clear Test Badge</strong> - Removes the test badge so you can test awarding it again</li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-yellow-800">
              <strong>⚠️ Testing Instructions:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-yellow-800 text-sm mt-2">
              <li>Earn a badge by completing a daily quest</li>
              <li>Check that it appears in both localStorage and database</li>
              <li>Close the browser and reopen the next day</li>
              <li>Run "Check State" to verify the badge is still there</li>
              <li>If badges are missing, use "Force Sync" to restore them</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

