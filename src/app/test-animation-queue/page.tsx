'use client'

import { useState } from 'react'
import { useAnimationQueue } from '@/lib/animationQueue'
import { FEATURE_FLAGS, logFeatureFlags } from '@/lib/featureFlags'
import { coalesceEvents, estimateSyncImpact } from '@/lib/eventCoalescer'

export default function TestAnimationQueue() {
  const { 
    currentAnimation, 
    queue, 
    isShowing, 
    queueLength,
    hasBufferedXP,
    enqueue, 
    dismiss,
    clearAll,
    flushXPBuffer 
  } = useAnimationQueue()

  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    console.log(msg)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  // Log feature flags on mount
  useState(() => {
    logFeatureFlags()
  })

  // Test functions
  const testRapidXP = () => {
    addLog('=== Testing Rapid XP Gains ===')
    addLog('Sending 10 rapid +5 XP events...')
    
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        enqueue('xp', { amount: 5 })
        addLog(`Event ${i + 1}: +5 XP enqueued`)
      }, i * 100) // 100ms apart
    }
    
    addLog('⏱️ Wait 600ms for coalescing...')
    setTimeout(() => {
      addLog('✅ Should show ONE animation with +50 XP!')
    }, 700)
  }

  const testMultipleTypes = () => {
    addLog('=== Testing Multiple Animation Types ===')
    
    enqueue('xp', { amount: 25 })
    addLog('Enqueued: +25 XP')
    
    setTimeout(() => {
      enqueue('badge', { id: 'test_badge', name: 'Test Badge', icon: '🏆' })
      addLog('Enqueued: Badge')
    }, 600)
    
    setTimeout(() => {
      enqueue('streak', { streak: 5 })
      addLog('Enqueued: Streak 5')
    }, 1200)
    
    setTimeout(() => {
      enqueue('level_up', { level: 15, title: 'Wizard Apprentice' })
      addLog('Enqueued: Level Up')
    }, 1800)
    
    addLog('📋 4 animations enqueued, will show in sequence!')
  }

  const testCoalescing = () => {
    addLog('=== Testing Event Coalescing ===')
    
    const mockEvents = [
      { id: '1', type: 'xp_gain' as const, data: { amount: 10 }, timestamp: Date.now() },
      { id: '2', type: 'xp_gain' as const, data: { amount: 15 }, timestamp: Date.now() },
      { id: '3', type: 'xp_gain' as const, data: { amount: 12 }, timestamp: Date.now() },
      { id: '4', type: 'quest_progress' as const, data: { questId: 'play_3', delta: 1 }, timestamp: Date.now() },
      { id: '5', type: 'quest_progress' as const, data: { questId: 'play_3', delta: 1 }, timestamp: Date.now() },
      { id: '6', type: 'badge_unlock' as const, data: { badgeId: 'test' }, timestamp: Date.now() },
    ]

    const coalesced = coalesceEvents(mockEvents)
    const impact = estimateSyncImpact(mockEvents)

    addLog(`Before coalescing: ${mockEvents.length} events`)
    addLog(`After coalescing: ${coalesced.length} events`)
    addLog(`Reduction: ${impact.reduction.percentage}%`)
    addLog(`Queries saved: ${impact.reduction.queriesSaved}`)
    addLog(`Coalesced events:`)
    coalesced.forEach(e => {
      addLog(`  - ${e.type}: ${JSON.stringify(e.data)}`)
    })
  }

  const testBeacon = async () => {
    addLog('=== Testing Beacon API ===')
    
    const testEvents = [
      { type: 'xp_gain', data: { amount: 100 }, timestamp: Date.now() },
      { type: 'badge_unlock', data: { badgeId: 'test_badge' }, timestamp: Date.now() }
    ]

    if (navigator.sendBeacon) {
      addLog('✅ Beacon API available')
      
      const blob = new Blob([JSON.stringify({ events: testEvents })], { type: 'application/json' })
      const success = navigator.sendBeacon('/api/sync-beacon', blob)
      
      if (success) {
        addLog('✅ Beacon queued successfully')
        addLog('Check server logs to verify receipt')
      } else {
        addLog('❌ Beacon failed to queue')
      }
    } else {
      addLog('❌ Beacon API not available in this browser')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">
          🎬 Animation Queue Test Suite
        </h1>
        <p className="text-gray-600 mb-8">
          Test Phase 1 implementation: Animation Queue, Coalescing, Beacon API
        </p>

        {/* Feature Flags Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🎛️ Feature Flags</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(FEATURE_FLAGS).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`text-2xl ${value ? '' : 'opacity-30'}`}>
                  {value ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-700 mb-2">Current Animation</h3>
            <p className="text-3xl font-bold text-purple-600">
              {currentAnimation ? currentAnimation.type : 'None'}
            </p>
            {currentAnimation && (
              <p className="text-xs text-gray-500 mt-2">
                {JSON.stringify(currentAnimation.data)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-700 mb-2">Queue Length</h3>
            <p className="text-3xl font-bold text-blue-600">{queueLength}</p>
            <p className="text-xs text-gray-500 mt-2">
              {isShowing ? 'Showing animation' : 'Idle'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-700 mb-2">XP Buffer</h3>
            <p className="text-3xl font-bold text-orange-600">
              {hasBufferedXP ? '📦' : '∅'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {hasBufferedXP ? 'Buffering XP events' : 'No buffered XP'}
            </p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={testRapidXP}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              ⚡ Rapid XP Test
            </button>
            <button
              onClick={testMultipleTypes}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🎭 Multiple Types
            </button>
            <button
              onClick={testCoalescing}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              📦 Test Coalescing
            </button>
            <button
              onClick={testBeacon}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🚨 Test Beacon
            </button>
            <button
              onClick={() => {
                dismiss()
                addLog('Dismissed current animation')
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              👋 Dismiss Current
            </button>
            <button
              onClick={() => {
                clearAll()
                addLog('Cleared all animations')
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              🗑️ Clear All
            </button>
            <button
              onClick={() => {
                flushXPBuffer()
                addLog('Flushed XP buffer')
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              💨 Flush XP Buffer
            </button>
          </div>
        </div>

        {/* Queue Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 Animation Queue</h2>
          {queue.length === 0 ? (
            <p className="text-gray-500">Queue is empty</p>
          ) : (
            <div className="space-y-2">
              {queue.map((anim, index) => (
                <div key={anim.id} className="border border-gray-200 rounded p-3 flex items-center gap-3">
                  <span className="text-2xl">{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{anim.type}</p>
                    <p className="text-xs text-gray-500">
                      {JSON.stringify(anim.data)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    Priority: {anim.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-gray-900 text-green-400 rounded-lg shadow-lg p-6 font-mono text-sm">
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
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">📋 How to Test</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
            <li><strong>Rapid XP Test:</strong> Sends 10 XP events rapidly → Should coalesce into ONE +50 XP animation</li>
            <li><strong>Multiple Types:</strong> Enqueues XP, Badge, Streak, Level Up → Shows in sequence</li>
            <li><strong>Test Coalescing:</strong> Shows how events are combined (logs only, no animation)</li>
            <li><strong>Test Beacon:</strong> Tests if Beacon API is available and working</li>
            <li><strong>Dismiss Current:</strong> Dismisses current animation and shows next in queue</li>
            <li><strong>Clear All:</strong> Clears entire queue (emergency reset)</li>
            <li><strong>Flush XP Buffer:</strong> Forces buffered XP to show immediately</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800 font-bold mb-2">
              🛡️ Rollback Instructions:
            </p>
            <p className="text-xs text-yellow-800">
              If anything breaks, open <code className="bg-yellow-200 px-1 rounded">src/lib/featureFlags.ts</code> and set:
            </p>
            <pre className="bg-yellow-100 p-2 rounded mt-2 text-xs">
              export const EMERGENCY_ROLLBACK = true
            </pre>
            <p className="text-xs text-yellow-800 mt-2">
              Everything will revert to old behavior instantly!
            </p>
          </div>
        </div>

        {/* Simple Animation Display (for testing) */}
        {isShowing && currentAnimation && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={dismiss}
          >
            <div className="bg-white rounded-3xl p-12 shadow-2xl text-center max-w-md">
              <div className="text-6xl mb-4">
                {currentAnimation.type === 'xp' && '⭐'}
                {currentAnimation.type === 'badge' && '🏆'}
                {currentAnimation.type === 'streak' && '🔥'}
                {currentAnimation.type === 'level_up' && '🎉'}
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {currentAnimation.type === 'xp' && `+${currentAnimation.data.amount} XP`}
                {currentAnimation.type === 'badge' && 'Badge Unlocked!'}
                {currentAnimation.type === 'streak' && `${currentAnimation.data.streak} Day Streak!`}
                {currentAnimation.type === 'level_up' && `Level ${currentAnimation.data.level}!`}
              </h2>
              
              {currentAnimation.type === 'xp' && currentAnimation.data.count > 1 && (
                <p className="text-sm text-gray-500">
                  From {currentAnimation.data.count} actions
                </p>
              )}
              
              <p className="text-sm text-gray-500 mt-4">
                Tap to continue
              </p>
              
              {queueLength > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {queueLength} more in queue
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
























