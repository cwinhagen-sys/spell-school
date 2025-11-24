'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugXPSyncPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setData({ error: 'Not logged in' })
          setLoading(false)
          return
        }

        // Check localStorage
        const localKey = `studentTotalXP_${user.id}`
        const localXP = localStorage.getItem(localKey)

        // Check database (globalt record)
        const { data: globalRec } = await supabase
          .from('student_progress')
          .select('*')
          .eq('student_id', user.id)
          .is('word_set_id', null)
          .is('homework_id', null)
          .maybeSingle()

        // Check ALL student_progress records
        const { data: allRecs } = await supabase
          .from('student_progress')
          .select('*')
          .eq('student_id', user.id)
          .order('last_played_at', { ascending: false })

        // Check game sessions (vad teacher ser)
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('game_type, score, started_at, finished_at, word_set_id')
          .eq('student_id', user.id)
          .order('started_at', { ascending: false })
          .limit(10)

        // Check quest progress
        const today = new Date().toISOString().split('T')[0]
        const { data: questProgress } = await supabase
          .from('daily_quest_progress')
          .select('*')
          .eq('user_id', user.id)
          .gte('quest_date', today)

        setData({
          userId: user.id,
          userEmail: user.email,
          localStorage: {
            key: localKey,
            value: localXP,
            valueInt: parseInt(localXP || '0')
          },
          globalRecord: globalRec,
          allRecords: allRecs,
          recentSessions: sessions,
          questProgress: questProgress,
          match: parseInt(localXP || '0') === (globalRec?.total_points || 0),
          mismatch: parseInt(localXP || '0') !== (globalRec?.total_points || 0),
          diff: parseInt(localXP || '0') - (globalRec?.total_points || 0)
        })
        setLoading(false)
      } catch (error) {
        console.error('Error fetching debug data:', error)
        setData({ error: String(error) })
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">🔍 XP Sync Debug</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (data?.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">🔍 XP Sync Debug</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Error: {data.error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-8">🔍 XP Sync Debug</h1>

        {/* Summary */}
        <div className={`rounded-lg p-6 border-2 ${data.match ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <h2 className="text-2xl font-bold mb-4">
            {data.match ? '✅ XP Match!' : '❌ XP Mismatch!'}
          </h2>
          <div className="grid grid-cols-3 gap-4 text-lg">
            <div>
              <p className="font-semibold">localStorage XP:</p>
              <p className="text-2xl">{data.localStorage.valueInt}</p>
            </div>
            <div>
              <p className="font-semibold">Database XP:</p>
              <p className="text-2xl">{data.globalRecord?.total_points || 0}</p>
            </div>
            <div>
              <p className="font-semibold">Difference:</p>
              <p className={`text-2xl ${data.diff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.diff > 0 ? '+' : ''}{data.diff}
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">👤 User Info</h2>
          <div className="space-y-2 font-mono text-sm">
            <p><strong>User ID:</strong> {data.userId}</p>
            <p><strong>Email:</strong> {data.userEmail}</p>
            <p><strong>localStorage Key:</strong> {data.localStorage.key}</p>
          </div>
        </div>

        {/* Global Record */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🗄️ Database Global Record</h2>
          {data.globalRecord ? (
            <div className="space-y-2">
              <p><strong>Total Points:</strong> {data.globalRecord.total_points}</p>
              <p><strong>Games Played:</strong> {data.globalRecord.games_played}</p>
              <p><strong>Last Game Type:</strong> {data.globalRecord.last_game_type}</p>
              <p><strong>Last Played:</strong> {new Date(data.globalRecord.last_played_at).toLocaleString()}</p>
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Full Record (JSON)</summary>
                <pre className="mt-2 bg-gray-50 p-4 rounded overflow-auto text-xs">
                  {JSON.stringify(data.globalRecord, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p className="text-red-600">❌ No global record found!</p>
          )}
        </div>

        {/* All Records */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📊 All student_progress Records ({data.allRecords?.length || 0})</h2>
          {data.allRecords && data.allRecords.length > 0 ? (
            <div className="space-y-4">
              {data.allRecords.map((rec: any, idx: number) => (
                <div key={idx} className="border rounded p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>XP:</strong> {rec.total_points}</p>
                    <p><strong>Games:</strong> {rec.games_played}</p>
                    <p><strong>Word Set:</strong> {rec.word_set_id || '❌ NULL (Global)'}</p>
                    <p><strong>Homework:</strong> {rec.homework_id || '❌ NULL'}</p>
                    <p><strong>Last Game:</strong> {rec.last_game_type}</p>
                    <p><strong>Last Played:</strong> {new Date(rec.last_played_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No records found</p>
          )}
        </div>

        {/* Recent Game Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🎮 Recent Game Sessions (Last 10)</h2>
          {data.recentSessions && data.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {data.recentSessions.map((session: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold">{session.game_type}</span>
                  <span>Score: {session.score}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(session.started_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No game sessions found</p>
          )}
        </div>

        {/* Quest Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🎯 Daily Quest Progress (Today)</h2>
          {data.questProgress && data.questProgress.length > 0 ? (
            <div className="space-y-2">
              {data.questProgress.map((quest: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold">{quest.quest_id}</span>
                  <span>Progress: {quest.progress}</span>
                  <span className={quest.completed_at ? 'text-green-600' : 'text-gray-500'}>
                    {quest.completed_at ? '✅ Completed' : '⏳ In Progress'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No quest progress today</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🔧 Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={() => {
                const text = JSON.stringify(data, null, 2)
                navigator.clipboard.writeText(text)
                alert('Debug data copied to clipboard!')
              }}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              📋 Copy All Data to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}





















