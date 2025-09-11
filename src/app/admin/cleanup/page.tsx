'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UnusedAccount {
  id: string
  email: string
  username: string
  role: string
  created_at: string
  activity_status: string
  class_memberships: number
  word_set_assignments: number
  game_scores_count: number
  progress_records: number
  created_word_sets: number
  created_classes: number
}

export default function AccountCleanupPage() {
  const [unusedAccounts, setUnusedAccounts] = useState<UnusedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchUnusedAccounts()
  }, [])

  const fetchUnusedAccounts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('unused_accounts')
        .select('*')
        .eq('activity_status', 'No activity found')
        .order('created_at', { ascending: true })

      if (error) throw error
      setUnusedAccounts(data || [])
    } catch (error) {
      console.error('Error fetching unused accounts:', error)
      setMessage('Error fetching accounts: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(accountId)
      setMessage('')

      const { data, error } = await supabase.rpc('delete_unused_account', {
        account_id: accountId
      })

      if (error) throw error

      setMessage(data || 'Account deleted successfully')
      
      // Refresh the list
      await fetchUnusedAccounts()
      
      // Remove from selected accounts
      setSelectedAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage('Error deleting account: ' + (error as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const deleteSelectedAccounts = async () => {
    if (selectedAccounts.size === 0) {
      setMessage('No accounts selected')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedAccounts.size} accounts? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting('batch')
      setMessage('')

      for (const accountId of selectedAccounts) {
        const { error } = await supabase.rpc('delete_unused_account', {
          account_id: accountId
        })
        if (error) throw error
      }

      setMessage(`Successfully deleted ${selectedAccounts.size} accounts`)
      
      // Refresh the list
      await fetchUnusedAccounts()
      setSelectedAccounts(new Set())
    } catch (error) {
      console.error('Error deleting accounts:', error)
      setMessage('Error deleting accounts: ' + (error as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedAccounts(new Set(unusedAccounts.map(acc => acc.id)))
  }

  const deselectAll = () => {
    setSelectedAccounts(new Set())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading unused accounts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Account Cleanup</h1>
          <div className="flex gap-4">
            <button
              onClick={fetchUnusedAccounts}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
            {selectedAccounts.size > 0 && (
              <button
                onClick={deleteSelectedAccounts}
                disabled={deleting === 'batch'}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg"
              >
                {deleting === 'batch' ? 'Deleting...' : `Delete Selected (${selectedAccounts.size})`}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-500/20 text-red-200 border border-red-500/30' 
              : 'bg-green-500/20 text-green-200 border border-green-500/30'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Unused Accounts ({unusedAccounts.length})</h2>
          <p className="text-gray-400 mb-4">
            These accounts have no activity (no class memberships, assignments, scores, or created content) 
            and were created more than 7 days ago.
          </p>
          
          {unusedAccounts.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAll}
                className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
              >
                Deselect All
              </button>
            </div>
          )}
        </div>

        {unusedAccounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No unused accounts found!</p>
            <p className="text-gray-500 text-sm mt-2">All accounts have some activity or are too recent to delete.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unusedAccounts.map((account) => (
              <div key={account.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.has(account.id)}
                      onChange={() => toggleAccountSelection(account.id)}
                      className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-medium text-lg">
                        {account.username || 'No username'} ({account.role})
                      </div>
                      <div className="text-gray-400 text-sm">{account.email}</div>
                      <div className="text-gray-500 text-xs">
                        Created: {new Date(account.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-gray-400">
                      <div>Class memberships: {account.class_memberships}</div>
                      <div>Word set assignments: {account.word_set_assignments}</div>
                      <div>Game scores: {account.game_scores_count}</div>
                      <div>Progress records: {account.progress_records}</div>
                      {account.role === 'teacher' && (
                        <>
                          <div>Created word sets: {account.created_word_sets}</div>
                          <div>Created classes: {account.created_classes}</div>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => deleteAccount(account.id)}
                      disabled={deleting === account.id}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
                    >
                      {deleting === account.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-200 mb-2">Important Notes:</h3>
          <ul className="text-yellow-100 text-sm space-y-1">
            <li>• This tool only deletes accounts with no activity (no class memberships, assignments, scores, etc.)</li>
            <li>• Accounts created within the last 7 days are never deleted (to avoid deleting recent test accounts)</li>
            <li>• After deleting profiles, you need to manually delete the corresponding auth.users records in Supabase Dashboard</li>
            <li>• Deletion is permanent and cannot be undone</li>
            <li>• Always review accounts carefully before deletion</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

