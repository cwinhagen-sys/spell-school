'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AccountStats {
  total_accounts: number
  accounts_older_than_7_days: number
  accounts_with_no_activity: number
  student_accounts_no_class: number
  teacher_accounts_no_content: number
}

export default function AccountStatsPage() {
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Get account statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_account_statistics')
      
      if (statsError) {
        // If RPC doesn't exist, calculate manually
        await fetchStatsManually()
      } else {
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setMessage('Error fetching statistics: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatsManually = async () => {
    try {
      // Get total accounts
      const { count: totalAccounts } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get accounts older than 7 days
      const { count: oldAccounts } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Get accounts with no activity (simplified check)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, role, created_at')

      if (!allProfiles) return

      let accountsWithNoActivity = 0
      let studentAccountsNoClass = 0
      let teacherAccountsNoContent = 0

      for (const profile of allProfiles) {
        const isOld = new Date(profile.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (!isOld) continue

        // Check for activity
        const [classMemberships, wordSetAssignments, gameScores, progressRecords, createdWordSets, createdClasses] = await Promise.all([
          supabase.from('class_students').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
          supabase.from('assigned_word_sets').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
          supabase.from('game_scores').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
          supabase.from('student_progress').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
          supabase.from('word_sets').select('id', { count: 'exact', head: true }).eq('teacher_id', profile.id),
          supabase.from('classes').select('id', { count: 'exact', head: true }).eq('teacher_id', profile.id)
        ])

        const hasActivity = 
          (classMemberships.count || 0) > 0 ||
          (wordSetAssignments.count || 0) > 0 ||
          (gameScores.count || 0) > 0 ||
          (progressRecords.count || 0) > 0 ||
          (createdWordSets.count || 0) > 0 ||
          (createdClasses.count || 0) > 0

        if (!hasActivity) {
          accountsWithNoActivity++
        }

        if (profile.role === 'student' && (classMemberships.count || 0) === 0) {
          studentAccountsNoClass++
        }

        if (profile.role === 'teacher' && (createdWordSets.count || 0) === 0 && (createdClasses.count || 0) === 0) {
          teacherAccountsNoContent++
        }
      }

      setStats({
        total_accounts: totalAccounts || 0,
        accounts_older_than_7_days: oldAccounts || 0,
        accounts_with_no_activity: accountsWithNoActivity,
        student_accounts_no_class: studentAccountsNoClass,
        teacher_accounts_no_content: teacherAccountsNoContent
      })
    } catch (error) {
      console.error('Error calculating stats manually:', error)
      setMessage('Error calculating statistics: ' + (error as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading account statistics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Statistics</h1>

        {message && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-200 border border-red-500/30">
            {message}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">Total Accounts</h3>
              <p className="text-3xl font-bold text-indigo-400">{stats.total_accounts}</p>
              <p className="text-sm text-gray-400 mt-1">All registered users</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">Old Accounts</h3>
              <p className="text-3xl font-bold text-yellow-400">{stats.accounts_older_than_7_days}</p>
              <p className="text-sm text-gray-400 mt-1">Created more than 7 days ago</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">Unused Accounts</h3>
              <p className="text-3xl font-bold text-red-400">{stats.accounts_with_no_activity}</p>
              <p className="text-sm text-gray-400 mt-1">No activity detected</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">Students Not in Class</h3>
              <p className="text-3xl font-bold text-orange-400">{stats.student_accounts_no_class}</p>
              <p className="text-sm text-gray-400 mt-1">Students without class membership</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">Teachers No Content</h3>
              <p className="text-3xl font-bold text-purple-400">{stats.teacher_accounts_no_content}</p>
              <p className="text-sm text-gray-400 mt-1">Teachers with no created content</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">Cleanup Potential</h3>
              <p className="text-3xl font-bold text-green-400">
                {Math.round((stats.accounts_with_no_activity / Math.max(stats.total_accounts, 1)) * 100)}%
              </p>
              <p className="text-sm text-gray-400 mt-1">Percentage of unused accounts</p>
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">How to Clean Up Accounts:</h3>
          <ol className="text-blue-100 text-sm space-y-2">
            <li>1. Run the SQL script <code className="bg-black/20 px-2 py-1 rounded">cleanup-unused-accounts.sql</code> in Supabase SQL Editor</li>
            <li>2. Review the list of unused accounts carefully</li>
            <li>3. Use the admin cleanup page to delete accounts individually or in batches</li>
            <li>4. Manually delete corresponding auth.users records in Supabase Dashboard</li>
            <li>5. Verify the cleanup was successful</li>
          </ol>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={fetchStats}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
          >
            Refresh Statistics
          </button>
          <a
            href="/admin/cleanup"
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Go to Cleanup Tool
          </a>
        </div>
      </div>
    </div>
  )
}

