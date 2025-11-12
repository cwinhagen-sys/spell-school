'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStreakSystem } from '@/hooks/useStreakSystem'
import StreakMilestoneAnimation from '@/components/StreakMilestoneAnimation'

export default function TestStreak() {
  const [userId, setUserId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [dbStreak, setDbStreak] = useState<any>(null)
  
  const {
    currentStreak,
    longestStreak,
    showStreakAnimation,
    animationStreak,
    checkAndUpdateStreak,
    updateStreakAfterGame,
    loadStreak,
    dismissAnimation
  } = useStreakSystem()
  
  // Debug: Log when animation state changes
  useEffect(() => {
    console.log('🎬 Animation state changed:', { showStreakAnimation, animationStreak })
    if (showStreakAnimation) {
      addLog(`🎬 ANIMATION TRIGGERED! Streak: ${animationStreak}`)
    }
  }, [showStreakAnimation, animationStreak])

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const addLog = (msg: string) => {
    console.log(msg)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const checkDatabase = async () => {
    addLog('=== Checking Database ===')
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    const { data, error } = await supabase
      .from('student_streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      addLog(`❌ Database error: ${error.message}`)
      addLog(`Error code: ${error.code}`)
      return
    }

    setDbStreak(data)
    addLog(`✅ Database streak: ${data.current_streak}`)
    addLog(`   Longest: ${data.longest_streak}`)
    addLog(`   Last play: ${data.last_play_date}`)
  }

  const testRPCGetStreak = async () => {
    addLog('=== Testing get_current_streak RPC ===')
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    const { data, error } = await supabase.rpc('get_current_streak', {
      p_user_id: userId
    })

    if (error) {
      addLog(`❌ RPC error: ${error.message}`)
      addLog(`Error details: ${JSON.stringify(error)}`)
      return
    }

    addLog(`✅ RPC returned: ${JSON.stringify(data)}`)
  }

  const testRPCUpdateStreak = async () => {
    addLog('=== Testing update_streak_after_game RPC ===')
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    const { data, error } = await supabase.rpc('update_streak_after_game', {
      p_user_id: userId
    })

    if (error) {
      addLog(`❌ RPC error: ${error.message}`)
      addLog(`Error details: ${JSON.stringify(error)}`)
      return
    }

    addLog(`✅ RPC returned: ${JSON.stringify(data)}`)
    addLog(`   show_animation: ${data.show_animation}`)
    addLog(`   streak_increased: ${data.streak_increased}`)
    
    if (data.show_animation) {
      addLog('🎬 Animation should trigger!')
    }
  }

  const manualTriggerAnimation = () => {
    addLog('=== Manually Triggering Animation ===')
    addLog('Calling updateStreakAfterGame() from hook...')
    updateStreakAfterGame().then(result => {
      addLog(`Result: ${JSON.stringify(result)}`)
    })
  }

  const resetStreakToYesterday = async () => {
    addLog('=== Resetting Streak to Yesterday ===')
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Update to look like we played yesterday
    const { error: updateError } = await supabase
      .from('student_streaks')
      .upsert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_play_date: yesterdayStr
      })

    if (updateError) {
      addLog(`❌ Error: ${updateError.message}`)
    } else {
      addLog(`✅ Streak set to yesterday (${yesterdayStr})`)
      addLog('Next trigger will increment to 2!')
      await loadStreak()
    }
  }

  const deleteStreak = async () => {
    addLog('=== Deleting Streak Completely ===')
    if (!userId) {
      addLog('❌ No user logged in')
      return
    }

    const { error } = await supabase
      .from('student_streaks')
      .delete()
      .eq('user_id', userId)

    if (error) {
      addLog(`❌ Error: ${error.message}`)
    } else {
      addLog('✅ Streak deleted from database')
      
      // Verify deletion
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: checkData } = await supabase
        .from('student_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (checkData) {
        addLog(`⚠️ WARNING: Record still exists after delete!`)
        addLog(`   Data: ${JSON.stringify(checkData)}`)
      } else {
        addLog('✅ Verified: No streak record exists')
        addLog('Next trigger will create streak 1 with animation!')
      }
      
      await loadStreak()
    }
  }

  const forceAnimation = () => {
    addLog('=== Force Showing Animation ===')
    // Manually trigger animation for testing
    const testStreak = currentStreak || 1
    addLog(`Forcing animation with streak: ${testStreak}`)
    
    // This is a hack to test the animation component directly
    const event = new CustomEvent('test-streak-animation', { 
      detail: { streak: testStreak } 
    })
    window.dispatchEvent(event)
    
    // Better: just call the hook's internal function
    // We'll add a test button that directly shows it
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">
          🔥 Streak System Test
        </h1>
        <p className="text-gray-600 mb-8">
          Debug and test the streak system
        </p>

        {/* Current State */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-700 mb-2">React State</h3>
            <p className="text-3xl font-bold text-orange-600">{currentStreak}</p>
            <p className="text-sm text-gray-500">Current Streak</p>
            {longestStreak > 0 && (
              <p className="text-xs text-gray-500 mt-2">Best: {longestStreak}</p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-700 mb-2">Database</h3>
            <p className="text-3xl font-bold text-green-600">{dbStreak?.current_streak || 0}</p>
            <p className="text-sm text-gray-500">Current Streak</p>
            {dbStreak && (
              <p className="text-xs text-gray-500 mt-2">Last: {dbStreak.last_play_date || 'Never'}</p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-700 mb-2">Animation</h3>
            <p className="text-3xl font-bold text-purple-600">
              {showStreakAnimation ? '✅' : '❌'}
            </p>
            <p className="text-sm text-gray-500">
              {showStreakAnimation ? `Showing: ${animationStreak}` : 'Not showing'}
            </p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={checkDatabase}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              📊 Check Database
            </button>
            <button
              onClick={testRPCGetStreak}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🔍 Test Get RPC
            </button>
            <button
              onClick={testRPCUpdateStreak}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              ⚡ Test Update RPC
            </button>
            <button
              onClick={manualTriggerAnimation}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🎬 Trigger Animation
            </button>
            <button
              onClick={() => checkAndUpdateStreak()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🎮 Simulate Game
            </button>
            <button
              onClick={resetStreakToYesterday}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              ⏮️ Set to Yesterday
            </button>
            <button
              onClick={deleteStreak}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🗑️ Delete Completely
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-800 font-medium mb-3">
              <strong>⚠️ To Test Animation:</strong>
            </p>
            <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
              <li><strong>Option A (Delete):</strong> Delete Completely → Trigger Animation → Shows streak 1</li>
              <li><strong>Option B (Continue):</strong> Set to Yesterday → Trigger Animation → Shows streak 2</li>
            </ol>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">User Info</h2>
          <p className="font-mono text-xs text-gray-600 break-all">
            {userId || 'Not logged in'}
          </p>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 text-green-400 rounded-lg shadow p-6 font-mono text-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Console Logs</h2>
            <button
              onClick={() => setLogs([])}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click a test button.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">📋 How to Test</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
            <li><strong>Check Database</strong> - See current streak in database</li>
            <li><strong>Test Get RPC</strong> - Test if RPC function works</li>
            <li><strong>Test Update RPC</strong> - Test if update RPC works and shows animation flag</li>
            <li><strong>Trigger Animation</strong> - Manually trigger streak animation (only works if not played today yet)</li>
            <li><strong>Simulate Game</strong> - Simulates finishing a game (calls checkAndUpdateStreak)</li>
            <li><strong>Set to Yesterday</strong> - Pretend last play was yesterday (test streak continuation)</li>
            <li><strong>Delete Completely</strong> - Remove streak record (test first time)</li>
          </ol>
        </div>

        {/* Show the actual animation */}
        <StreakMilestoneAnimation
          streak={animationStreak}
          show={showStreakAnimation}
          onDismiss={() => {
            addLog('Animation dismissed')
            dismissAnimation()
          }}
        />
      </div>
    </div>
  )
}

